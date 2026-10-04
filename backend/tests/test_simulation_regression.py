"""Real locked-model scenario and lifecycle regressions (no substituted risk scores)."""
from concurrent.futures import ThreadPoolExecutor
from itertools import product
from pathlib import Path
import re
from threading import Event
from typing import get_args

import pytest
from sqlalchemy import func, select

from app.db.models import DailyReading, Investigation, MeterReading, Prediction, SimulationStream
from app.schemas.simulation import Scenario

MODES = get_args(Scenario)


def start(client, mode, speed="very_fast", source="C01"):
    response = client.post("/api/v1/simulation/start", json={
        "targets": [{"consumer_id": source, "scenario": mode}], "speed": speed})
    assert response.status_code == 200, response.text
    return next(s for s in response.json()["streams"] if s["source_consumer_id"] == source)


def info(client, cid):
    response = client.get(f"/api/v1/investigations/{cid}")
    assert response.status_code == 200
    row = response.json()
    assert 0 <= row["review_probability"] <= 1
    assert row["review_probability"] == row["prediction"]["score"]["results"][0]["predicted_probability"]
    return row


def assert_condition(row, mode):
    reading = row["latest_reading"]
    assert row["scenario"] == reading["scenario"] == mode
    assert reading["run_id"] == row["run_id"]
    assert reading["source_consumer_id"] == "C01"
    if mode == "communication_failure":
        assert row["latest_daily_kwh"] is None
        assert all(reading[k] is None for k in ("power_kw", "energy_kwh", "voltage_v", "current_a"))
        assert row["probable_cause"] == "Meter Data Transmission Failure"
    elif mode == "meter_fault":
        assert reading["meter_status"] == "fault" and reading["voltage_v"] == 420
        assert row["probable_cause"] == "Meter malfunction suspected"
    else:
        assert reading["communication_status"] == "online" and reading["meter_status"] == "normal"
        assert 225 <= reading["voltage_v"] <= 235
        assert reading["current_a"] == pytest.approx(reading["power_kw"] * 1000 / (reading["voltage_v"] * .95), abs=.002)
        if mode in ("sudden_drop", "tampering"):
            assert -80 < row["deviation_pct"] < -75
        elif mode == "legitimate_abnormal":
            assert 135 < row["deviation_pct"] < 165
            assert row["probable_cause"] == "Reported temporary load change"
        else:
            assert abs(row["deviation_pct"]) < 7
            assert not row["requires_review"]


def test_ui_exposes_exact_backend_modes():
    config = (Path(__file__).parents[2] / "src/workspace/config.ts").read_text()
    assert set(re.findall(r'value: "([a-z_]+)"', config)) == set(MODES)


@pytest.mark.parametrize("before,after", product(MODES, repeat=2))
def test_every_mode_transition_and_reset(client, app, before, after):
    sim = app.state.simulation
    sim.close()
    original = client.get("/api/v1/operations").json()
    first = start(client, before)
    cid = first["consumer_id"]
    assert info(client, cid)["prediction"]  # also present before the first tick
    sim.tick(force=True)
    assert_condition(info(client, cid), before)
    second = start(client, after)
    if before != after:
        assert first["run_id"] != second["run_id"]
        assert second["completed_days"] == second["generated_readings"] == 0
        assert client.get(f"/api/v1/consumers/{cid}/telemetry").json()["readings"] == []
        assert client.get(f"/api/v1/consumers/{cid}/history").json()["total"] == 365
    else:
        assert first["run_id"] == second["run_id"]
        assert second["completed_days"] == 1
    sim.tick(force=True)
    row = info(client, cid)
    assert_condition(row, after)
    assert row["prediction"]["period_end"] == row["latest_daily_date"]
    assert all(a["evidence"]["scenario"] == after for a in client.get("/api/v1/operations").json()["anomalies"])
    for action in ("pause", "stop"):
        assert client.post(f"/api/v1/simulation/{action}", json={}).status_code == 200
        stopped = sim.status()
        sim.tick(force=True)
        assert sim.status() == stopped and not sim.due
        assert start(client, after)["run_id"] == second["run_id"]
    for _ in range(2):
        assert client.post("/api/v1/simulation/reset", json={"consumer_ids": [cid]}).status_code == 200
        sim.tick(force=True)
        assert not sim.status()["streams"] and not sim.due
        assert client.get("/api/v1/operations").json() == original
    with app.state.database.sessions() as session:
        for model in (DailyReading, MeterReading, Prediction, Investigation, SimulationStream):
            assert session.scalar(select(func.count()).select_from(model)) == 0
    third = start(client, after)
    assert third["run_id"] != second["run_id"]
    assert info(client, third["consumer_id"])["prediction"]


def test_repeated_cycles_determinism_daily_scores_and_supply(client, app):
    sim = app.state.simulation
    sim.close()
    expected = {}
    for _ in range(3):
        for mode in MODES:
            stream = start(client, mode)
            cid = stream["consumer_id"]
            sim.tick(force=True)
            row = info(client, cid)
            assert_condition(row, mode)
            snapshot = client.get("/api/v1/operations").json()
            consumer = snapshot["consumers"][0]
            assert consumer["investigation"]["review_probability"] == row["review_probability"]
            assert consumer["meter"] == "M-01" and consumer["transformer"] == "T1"
            assert snapshot["transformers"][1]["percent"] == pytest.approx(100 * .045 / 1.045)
            if mode in ("normal", "legitimate_abnormal", "sudden_drop"):
                assert snapshot["transformers"][0]["percent"] == pytest.approx(100 * .045 / 1.045)
            if mode == "communication_failure":
                assert snapshot["transformers"][0]["consumer"] is None
            result = (row["latest_daily_kwh"], row["review_probability"], row["latest_reading"]["power_kw"])
            assert result == expected.setdefault(mode, result)
            client.post("/api/v1/simulation/reset", json={}).raise_for_status()
    assert len({result[1] for result in expected.values()}) > 1


def test_hourly_waveform_independent_of_speed_and_partial_day(client, app):
    sim = app.state.simulation
    sim.close()
    stream = start(client, "normal")
    cid = stream["consumer_id"]
    with app.state.database.sessions() as session:
        config = dict(session.get(SimulationStream, cid).config)
        whole = dict(config)
        sim._generate(session, cid, whole, 60)
        whole_energy = whole["day_total"]
        partial = dict(config)
        for _ in range(60):
            sim._generate(session, cid, partial, 1)
        assert partial["day_total"] == pytest.approx(whole_energy, abs=.00004)
        assert partial["supply_day_total"] == pytest.approx(whole["supply_day_total"])
        assert partial["cursor"] == whole["cursor"]
        session.rollback()


def test_unfiled_findings_update_but_case_evidence_survives(client, app):
    sim = app.state.simulation
    sim.close()
    stream = start(client, "tampering")
    sim.tick(force=True)
    first = client.get("/api/v1/operations").json()["anomalies"][0]
    assert first["evidence"]["probable_cause"] == "Consumption change under observation"
    sim.tick(force=True)
    sim.tick(force=True)
    evolved = client.get("/api/v1/operations").json()["anomalies"][0]
    assert evolved["id"] == first["id"]
    assert "tampering is one hypothesis" in evolved["evidence"]["probable_cause"]
    case = client.post("/api/v1/operations/cases", json={"anomaly_id": first["id"]}).json()
    start(client, "normal")
    sim.tick(force=True)
    client.post("/api/v1/simulation/reset", json={}).raise_for_status()
    after = client.get("/api/v1/operations").json()
    assert after["anomalies"][0]["evidence"] == evolved["evidence"]
    assert after["cases"][0]["id"] == case["id"]
    assert all(c["backend_id"] is None for c in after["consumers"])
    assert not sim.due and not sim.status()["streams"]


def test_reset_waits_for_manual_scoring_without_recreating_stream(client, app, monkeypatch):
    app.state.simulation.close()
    cid = start(client, "normal")["consumer_id"]
    entered, release = Event(), Event()
    score = app.state.ai_ml.score_histories
    def delayed(*args, **kwargs):
        entered.set()
        assert release.wait(15)
        return score(*args, **kwargs)
    monkeypatch.setattr(app.state.ai_ml, "score_histories", delayed)
    with ThreadPoolExecutor(max_workers=2) as pool:
        scoring = pool.submit(client.post, "/api/v1/score-history", json={"consumers": [{"CONS_NO": cid, "stored": True}]})
        assert entered.wait(10)
        reset = pool.submit(client.post, "/api/v1/simulation/reset", json={})
        release.set()
        assert scoring.result(timeout=20).status_code == 200
        assert reset.result(timeout=20).status_code == 200
    assert client.get(f"/api/v1/consumers/{cid}").status_code == 404
    assert client.post("/api/v1/score-history", json={"consumers": [{"CONS_NO": cid, "stored": True}]}).status_code == 404


def test_one_failed_generator_does_not_stop_other_streams(client, app, monkeypatch):
    sim = app.state.simulation
    sim.close()
    failed = start(client, "meter_fault")
    healthy = start(client, "normal", source="C02")
    generate = sim._generate
    def fail_one(session, cid, config, minutes):
        if cid == failed["consumer_id"]:
            raise RuntimeError("Injected generation failure")
        return generate(session, cid, config, minutes)
    monkeypatch.setattr(sim, "_generate", fail_one)
    sim.tick(force=True)
    states = {s["consumer_id"]: s for s in sim.status()["streams"]}
    assert states[failed["consumer_id"]]["state"] == "paused"
    assert states[failed["consumer_id"]]["last_error"]
    assert states[healthy["consumer_id"]]["completed_days"] == 1
    assert info(client, healthy["consumer_id"])["prediction"]


def test_initial_model_failure_is_retryable_without_waiting_a_day(client, app, monkeypatch):
    from app.core.errors import ServiceError
    sim = app.state.simulation
    sim.close()
    def fail(*args, **kwargs):
        raise ServiceError(503, "MODEL_UNAVAILABLE", "Model temporarily unavailable")
    with monkeypatch.context() as patch:
        patch.setattr(app.state.ai_ml, "score_histories", fail)
        stream = start(client, "normal", speed="realistic")
    assert stream["last_error"] and stream["completed_days"] == 0
    recovered = start(client, "normal", speed="realistic")
    assert recovered["run_id"] == stream["run_id"]
    assert recovered["last_error"] is None
    assert info(client, recovered["consumer_id"])["prediction"]


@pytest.mark.parametrize("mode", MODES)
def test_pause_resume_advances_same_run_and_preserves_partial_day(client, app, mode):
    sim = app.state.simulation
    sim.close()
    first = start(client, mode, speed="fast")
    cid = first["consumer_id"]
    sim.tick(force=True)
    client.post("/api/v1/simulation/pause", json={}).raise_for_status()
    paused = sim.status()["streams"][0]
    assert paused["generated_readings"] == 6 and paused["completed_days"] == 0
    resumed = start(client, mode, speed="fast")
    assert resumed["run_id"] == first["run_id"]
    assert resumed["cursor"] == paused["cursor"]
    for _ in range(3):
        sim.tick(force=True)
    final = sim.status()["streams"][0]
    assert final["completed_days"] == 1 and final["generated_readings"] == 24
    assert_condition(info(client, cid), mode)


def test_duplicate_launch_and_start_do_not_duplicate_scheduling(client, app):
    sim = app.state.simulation
    thread = sim.thread
    sim.launch()
    assert sim.thread is thread and thread.is_alive()
    sim.close()
    stream = start(client, "normal")
    cid = stream["consumer_id"]
    sim.due[cid] = 10**12
    restarted = start(client, "normal")
    assert sim.due == {cid: 10**12}
    assert restarted["run_id"] == stream["run_id"]
    with app.state.database.sessions() as session:
        assert session.scalar(select(func.count()).select_from(Prediction)) == 1
        assert session.scalar(select(func.count()).select_from(SimulationStream)) == 1


def test_manual_scoring_recovers_simulation_error_and_finding(client, app, monkeypatch):
    from app.core.errors import ServiceError
    sim = app.state.simulation
    sim.close()
    def fail(*args, **kwargs):
        raise ServiceError(503, "MODEL_UNAVAILABLE", "Model temporarily unavailable")
    with monkeypatch.context() as patch:
        patch.setattr(app.state.ai_ml, "score_histories", fail)
        stream = start(client, "meter_fault")
        sim.tick(force=True)
    client.post("/api/v1/simulation/stop", json={}).raise_for_status()
    response = client.post("/api/v1/score-history", json={
        "consumers": [{"CONS_NO": stream["consumer_id"], "stored": True}]})
    assert response.status_code == 200
    row = info(client, stream["consumer_id"])
    assert row["last_error"] is None and row["score_state"] == "Scored full stored history"
    assert row["stream_state"] == "stopped"
    finding = client.get("/api/v1/operations").json()["anomalies"][0]
    assert finding["evidence"]["review_probability"] == row["review_probability"]
