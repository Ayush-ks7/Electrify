import time

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.models import Investigation, MeterReading, Prediction, SimulationStream
from app.main import create_app

SCENARIOS = ["normal", "tampering", "meter_fault", "communication_failure", "legitimate_abnormal"]


def start(client, targets=None, speed="very_fast"):
    response = client.post("/api/v1/simulation/start", json={"targets": targets or [
        {"consumer_id": f"demo:{i+1}", "scenario": scenario} for i, scenario in enumerate(SCENARIOS)], "speed": speed})
    assert response.status_code == 200, response.text
    return response.json()["streams"]


def test_mixed_scenarios_real_model_history_and_status(client, app):
    sim = app.state.simulation
    sim.close()  # deterministic clock; inference still uses the real locked artifact
    streams = start(client)
    ids = {s["scenario"]: s["consumer_id"] for s in streams}
    for _ in range(3):
        sim.tick(force=True)
    rows = {r["scenario"]: r for r in client.get("/api/v1/investigations").json()["investigations"]}
    for name, row in rows.items():
        assert row["simulated"] and row["prediction"]
        assert row["anomaly_score"] is None and row["cause_confidence"] is None
        assert row["prediction"]["score"]["results"][0]["explanation"]["top_signals"]
        risk = client.get(f"/api/v1/consumers/{ids[name]}/risk").json()
        assert risk["score"] == row["prediction"]["score"]
        assert risk["score"]["results"][0]["data_quality"]["observed_days"] >= 365
    assert abs(rows["normal"]["deviation_pct"]) < 10
    assert rows["tampering"]["deviation_pct"] < -70
    assert "tampering is one hypothesis" in rows["tampering"]["probable_cause"]
    assert rows["tampering"]["latest_reading"]["communication_status"] == "online"
    assert rows["meter_fault"]["probable_cause"] == "Meter malfunction suspected"
    assert "theft" not in rows["meter_fault"]["probable_cause"].lower()
    assert rows["meter_fault"]["latest_reading"]["meter_status"] == "fault"
    assert rows["communication_failure"]["latest_daily_kwh"] is None
    assert rows["communication_failure"]["deviation_pct"] is None
    telemetry = client.get(f"/api/v1/consumers/{ids['communication_failure']}/telemetry").json()["readings"]
    assert len(telemetry) == 72
    assert all(all(r[key] is None for key in ["energy_kwh", "power_kw", "voltage_v", "current_a"]) for r in telemetry)
    assert rows["legitimate_abnormal"]["deviation_pct"] > 130
    assert rows["legitimate_abnormal"]["probable_cause"] == "Reported temporary load change"
    cid = ids["tampering"]
    assert client.post(f"/api/v1/investigations/{cid}/status", json={"status": "Under Investigation"}).status_code == 200
    for _ in range(5):
        sim.tick(force=True)
    row = client.get(f"/api/v1/investigations/{cid}").json()
    assert row["case_status"] == "Under Investigation"
    recovered = client.get(f"/api/v1/investigations/{ids['legitimate_abnormal']}").json()
    assert abs(recovered["deviation_pct"]) < 10
    with app.state.database.sessions() as session:
        predictions = list(session.scalars(select(Prediction).where(Prediction.consumer_id == cid)))
        assert len(predictions) == 2  # first completed day, then day eight
        assert predictions[-1].period_end > predictions[0].period_end
        assert session.get(Investigation, ids["meter_fault"]).status == "Requires Review"


def test_partial_days_speed_change_pause_stop_reset_and_original_isolation(client, app, history_request):
    sim = app.state.simulation
    sim.close()
    assert client.post("/api/v1/score-history", json=history_request).status_code == 200
    original = client.get("/api/v1/consumers/C001/history").json()
    original_risk = client.get("/api/v1/consumers/C001/risk").json()
    stream = start(client, [{"consumer_id": "C001", "scenario": "communication_failure"}], "realistic")[0]
    cid = stream["consumer_id"]
    sim.tick(force=True)
    assert client.get(f"/api/v1/consumers/{cid}/history").json()["total"] == 4
    assert client.post("/api/v1/simulation/pause", json={"consumer_ids": [cid]}).status_code == 200
    before = sim.status()
    sim.tick(force=True)
    assert sim.status() == before
    start(client, [{"consumer_id": cid, "scenario": "normal"}])
    sim.tick(force=True)
    history = client.get(f"/api/v1/consumers/{cid}/history").json()
    assert history["total"] == 5 and history["readings"][-1]["consumption"] is None
    assert "Insufficient history" in sim.status()["streams"][0]["score_state"]
    assert client.post("/api/v1/simulation/stop", json={}).status_code == 200
    before = sim.status()
    sim.tick(force=True)
    assert sim.status() == before
    assert client.post("/api/v1/simulation/reset", json={"consumer_ids": ["C001"]}).status_code == 404
    assert client.post("/api/v1/simulation/reset", json={}).status_code == 200
    assert client.get(f"/api/v1/consumers/{cid}").status_code == 404
    assert client.get("/api/v1/consumers/C001/history").json() == original
    assert client.get("/api/v1/consumers/C001/risk").json() == original_risk
    with app.state.database.sessions() as session:
        assert not list(session.scalars(select(SimulationStream)))
        assert not list(session.scalars(select(MeterReading)))


def test_restart_pauses_persisted_streams_and_keeps_status(client, app, ai_ml):
    app.state.simulation.close()
    cid = start(client, [{"consumer_id": "demo:1", "scenario": "meter_fault"}])[0]["consumer_id"]
    app.state.simulation.tick(force=True)
    client.post(f"/api/v1/investigations/{cid}/status", json={"status": "Resolved"})
    restarted = create_app(app.state.settings, ai_ml=ai_ml)
    with TestClient(restarted) as other:
        stream = other.get("/api/v1/simulation").json()["streams"][0]
        assert stream["state"] == "paused" and stream["generated_readings"] == 24
        assert other.get(f"/api/v1/investigations/{cid}").json()["case_status"] == "Resolved"


def test_scheduler_runs_without_browser_and_controls_are_validated(client, app):
    cid = start(client, [{"consumer_id": "demo:1", "scenario": "normal"}])[0]["consumer_id"]
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        state = app.state.simulation.status()["streams"][0]
        if state["completed_days"] >= 2:
            break
        time.sleep(.1)
    assert state["completed_days"] >= 2
    assert client.post("/api/v1/simulation/start", json={"targets": [{"consumer_id": "demo:2", "scenario": "fake"}]}).status_code == 422
    assert client.post("/api/v1/simulation/start", json={"targets": [{"consumer_id": "demo:2", "scenario": "normal"}] * 2}).status_code == 422
    assert client.post(f"/api/v1/investigations/{cid}/status", json={"status": "Proven theft"}).status_code == 422
    # Transactional start: an invalid second target leaves no partial demo copy.
    assert client.post("/api/v1/simulation/start", json={"targets": [{"consumer_id": "demo:2", "scenario": "normal"}, {"consumer_id": "absent", "scenario": "normal"}]}).status_code == 404
    assert len(app.state.simulation.status()["streams"]) == 1


def test_scoring_failure_retains_telemetry_and_retries(client, app, monkeypatch):
    from app.core.errors import ServiceError
    app.state.simulation.close()
    cid = start(client, [{"consumer_id": "demo:1", "scenario": "normal"}])[0]["consumer_id"]
    def fail(*args, **kwargs):
        raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML model is unavailable.")
    with monkeypatch.context() as patch:
        patch.setattr(app.state.ai_ml, "score_histories", fail)
        app.state.simulation.tick(force=True)
    row = client.get(f"/api/v1/investigations/{cid}").json()
    assert row["latest_reading"] and row["prediction"] is None and row["last_error"]
    app.state.simulation.tick(force=True)
    row = client.get(f"/api/v1/investigations/{cid}").json()
    assert row["prediction"] and row["last_error"] is None


def test_simulation_limits_aliases_and_selective_reset(client, app):
    app.state.simulation.close()
    streams = start(client, [{"consumer_id": "demo:1", "scenario": "normal"},
                             {"consumer_id": "demo:2", "scenario": "meter_fault"}])
    cid = next(s["consumer_id"] for s in streams if s["source_consumer_id"] == "demo:1")
    before = app.state.simulation.status()
    # Source ID and copy ID cannot mutate the same stream twice in one request.
    response = client.post("/api/v1/simulation/start", json={"targets": [
        {"consumer_id": "demo:1", "scenario": "tampering"}, {"consumer_id": cid, "scenario": "normal"}]})
    assert response.status_code == 422 and app.state.simulation.status() == before
    with app.state.database.sessions() as session:
        stream = session.get(SimulationStream, cid)
        stream.config = {**stream.config, "completed_days": 89}
        session.commit()
    app.state.simulation.tick(force=True)
    assert next(s for s in app.state.simulation.status()["streams"] if s["consumer_id"] == cid)["state"] == "stopped"
    assert client.post("/api/v1/simulation/start", json={"targets": [{"consumer_id": cid, "scenario": "normal"}]}).status_code == 422
    response = client.post("/api/v1/simulation/reset", json={"consumer_ids": [cid]})
    assert response.status_code == 200 and len(response.json()["streams"]) == 1
    assert client.get(f"/api/v1/consumers/{cid}").status_code == 404


def test_new_endpoints_share_auth_and_cors(tmp_path, ai_ml):
    from app.core.config import Settings
    protected = create_app(Settings(_env_file=None, api_key="test-key",
                                    database_url=f"sqlite:///{(tmp_path / 'auth.db').as_posix()}"), ai_ml=ai_ml)
    with TestClient(protected) as client:
        assert client.get("/api/v1/simulation").status_code == 401
        assert client.get("/api/v1/investigations").status_code == 401
        assert client.post("/api/v1/simulation/reset", json={}).status_code == 401
        assert client.get("/api/v1/simulation", headers={"X-API-Key": "test-key"}).status_code == 200
        response = client.options("/api/v1/simulation/start", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-api-key"})
        assert response.status_code == 200 and response.headers["access-control-allow-origin"] == "http://localhost:5173"
