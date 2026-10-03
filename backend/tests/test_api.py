from copy import deepcopy
from datetime import date
import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.db.models import Consumer, DailyReading, Prediction
from app.db.repositories import ConsumerRepository
from app.main import create_app
from app.services.ai_ml_service import AIMLService


def test_health_and_model_info(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "model": "ok", "feature_count": 24}
    assert response.headers["X-Request-ID"]
    info = client.get("/api/v1/model-info")
    assert info.status_code == 200
    assert info.json()["feature_count"] == 24
    assert len(info.json()["required_features"]) == 24
    assert info.json()["default_threshold"] == 0.2010437721624017


def test_real_feature_score_persists(client, app, feature_request):
    response = client.post("/api/v1/score", json=feature_request)
    assert response.status_code == 200, response.text
    body = response.json()
    result = body["results"][0]
    assert 0 <= result["predicted_probability"] <= 1
    assert len(result["explanation"]["top_signals"]) == 3
    assert "not proof" in body["disclaimer"]
    cid = result["CONS_NO"]
    assert client.get(f"/api/v1/consumers/{cid}").status_code == 200
    saved = client.get(f"/api/v1/consumers/{cid}/risk").json()
    assert saved["score"] == body
    assert saved["source"] == "features"
    with app.state.database.sessions() as session:
        assert session.scalar(select(func.count()).select_from(Prediction)) == 1
        assert session.scalar(select(func.count()).select_from(DailyReading)) == 0


def test_real_history_and_stored_rescore(client, app, history_request):
    response = client.post("/api/v1/score-history", json=history_request)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["results"][0]["data_quality"] == {"observed_days": 3, "missing_days": 1, "missing_ratio": 0.25}
    assert body["history_warnings"]
    history = client.get("/api/v1/consumers/C001/history").json()
    assert history["readings"] == history_request["consumers"][0]["readings"]
    stored = client.post("/api/v1/score-history", json={"consumers": [{"CONS_NO": "C001", "stored": True}],
                                                       "include_explanations": False})
    assert stored.status_code == 200, stored.text
    assert stored.json() == body
    risk = client.get("/api/v1/consumers/C001/risk").json()
    assert risk["source"] == "stored_history"
    assert risk["prediction_id"] == 2
    with app.state.database.sessions() as session:
        assert session.scalar(select(func.count()).select_from(DailyReading)) == 4
        assert session.get(DailyReading, ("C001", date(2026, 1, 2))).consumption is None
        assert session.get(DailyReading, ("C001", date(2026, 1, 1))).consumption == 0


def test_sparse_stored_history_fills_calendar_with_null(client, app):
    with app.state.database.sessions.begin() as session:
        session.add(Consumer(consumer_id="sparse"))
        session.flush()
        session.add_all([DailyReading(consumer_id="sparse", date=date(2026, 1, 1), consumption=0),
                         DailyReading(consumer_id="sparse", date=date(2026, 1, 3), consumption=3)])
    result = client.post("/api/v1/score-history", json={"consumers": [{"CONS_NO": "sparse", "stored": True}],
                                                       "include_explanations": False})
    assert result.status_code == 200, result.text
    quality = result.json()["results"][0]["data_quality"]
    assert quality["observed_days"] == 2 and quality["missing_days"] == 1
    assert client.get("/api/v1/consumers/sparse/history").json()["readings"][1]["consumption"] is None


def test_mixed_periods_equal_individual_scores(client, history_request):
    first = history_request["consumers"][0]
    second = {"CONS_NO": "C002", "readings": [{"date": "2025-02-01", "consumption": 10},
                                               {"date": "2025-02-02", "consumption": 12}]}
    batch = client.post("/api/v1/score-history", json={"consumers": [first, second], "include_explanations": False})
    assert batch.status_code == 200, batch.text
    for i, consumer in enumerate([first, second]):
        single = client.post("/api/v1/score-history", json={"consumers": [consumer], "include_explanations": False})
        assert batch.json()["results"][i] == single.json()["results"][0]
    assert batch.json()["results"][1]["data_quality"]["missing_days"] == 0


@pytest.mark.parametrize("mutation", ["missing", "label", "string", "bool", "id", "duplicate", "threshold", "extra"])
def test_bad_feature_payload(client, feature_request, mutation):
    consumer = feature_request["consumers"][0]
    if mutation == "missing":
        consumer["features"].pop("observed_days")
    elif mutation == "label":
        consumer["features"]["FLAG"] = 1
    elif mutation == "string":
        consumer["features"]["observed_days"] = "12"
    elif mutation == "bool":
        consumer["features"]["observed_days"] = True
    elif mutation == "id":
        consumer["CONS_NO"] = " "
    elif mutation == "duplicate":
        feature_request["consumers"].append(deepcopy(consumer))
    elif mutation == "threshold":
        feature_request["threshold"] = 2
    else:
        feature_request["CHK_STATE"] = 1
    response = client.post("/api/v1/score", json=feature_request)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_INPUT"
    assert client.get("/api/v1/consumers").json()["total"] == 0


@pytest.mark.parametrize("mutation", ["duplicate", "gap", "date", "one_day", "period", "label", "missing_value"])
def test_malformed_history(client, history_request, mutation):
    consumer = history_request["consumers"][0]
    if mutation == "duplicate":
        consumer["readings"].append(consumer["readings"][0])
    elif mutation == "gap":
        consumer.pop("period_start")
        consumer.pop("period_end")
        consumer["readings"].pop(1)
    elif mutation == "date":
        consumer["readings"][0]["date"] = "2026-02-30"
    elif mutation == "one_day":
        consumer["readings"] = consumer["readings"][:1]
    elif mutation == "period":
        consumer["period_end"] = "2025-01-01"
    elif mutation == "label":
        consumer["CHK_STATE"] = 1
    else:
        consumer["readings"][0].pop("consumption")
    response = client.post("/api/v1/score-history", json=history_request)
    assert response.status_code == 422, response.text


def test_missing_consumers_and_risk(client, app):
    for suffix in ["", "/history", "/risk"]:
        assert client.get("/api/v1/consumers/absent" + suffix).status_code == 404
    response = client.post("/api/v1/score-history", json={"consumers": [{"CONS_NO": "absent", "stored": True}]})
    assert response.status_code == 404
    with app.state.database.sessions.begin() as session:
        session.add(Consumer(consumer_id="empty"))
    assert client.get("/api/v1/consumers/empty/risk").json()["detail"]["code"] == "RISK_NOT_FOUND"
    assert client.post("/api/v1/score-history", json={"consumers": [{"CONS_NO": "empty", "stored": True}]}).status_code == 422


def test_history_upsert_and_pagination(client, history_request):
    assert client.post("/api/v1/score-history", json=history_request).status_code == 200
    history_request["consumers"][0]["readings"][0]["consumption"] = 7
    assert client.post("/api/v1/score-history", json=history_request).status_code == 200
    response = client.get("/api/v1/consumers/C001/history?limit=1&offset=1").json()
    assert response["total"] == 4 and len(response["readings"]) == 1
    assert client.get("/api/v1/consumers/C001/history").json()["readings"][0]["consumption"] == 7
    assert client.get("/api/v1/consumers?limit=1&offset=1").json()["consumers"] == []
    assert client.get("/api/v1/consumers?limit=0").status_code == 422
    assert client.get("/api/v1/consumers/C001/history?period_start=2026-02-01&period_end=2026-01-01").status_code == 422


def test_inference_failure_safe_and_atomic(client, ai_ml, feature_request, monkeypatch, caplog):
    def fail(*args, **kwargs):
        raise RuntimeError("SECRET C:/private/model.joblib")
    monkeypatch.setattr(ai_ml._service, "score_feature_rows", fail)
    with caplog.at_level(logging.INFO):
        response = client.post("/api/v1/score", json=feature_request)
    assert response.status_code == 503
    assert "SECRET" not in response.text + caplog.text
    assert client.get("/api/v1/consumers").json()["total"] == 0


def test_database_failure_rolls_back_batch(client, app, feature_request, monkeypatch):
    def fail(*args, **kwargs):
        raise OperationalError("SECRET", {}, RuntimeError("SECRET"))
    monkeypatch.setattr(ConsumerRepository, "save_prediction", fail)
    response = client.post("/api/v1/score", json=feature_request)
    assert response.status_code == 503 and "SECRET" not in response.text
    with app.state.database.sessions() as session:
        assert session.scalar(select(func.count()).select_from(Consumer)) == 0


def test_unavailable_model_keeps_health_available(tmp_path, history_request, caplog):
    settings = Settings(database_url="sqlite://", ai_ml_model_path=tmp_path / "SECRET.joblib", _env_file=None)
    with TestClient(create_app(settings)) as client:
        assert client.get("/health").status_code == 503
        assert client.get("/api/v1/model-info").status_code == 503
        assert client.post("/api/v1/score-history", json=history_request).status_code == 503
        assert client.get("/api/v1/consumers").status_code == 200
    assert "SECRET" not in caplog.text


def test_config_auth_cors_and_limits(ai_ml, feature_request):
    settings = Settings(database_url="sqlite://", api_key="test-key", max_consumers_per_request=1, _env_file=None)
    with TestClient(create_app(settings, ai_ml)) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/model-info").status_code == 401
        headers = {"X-API-Key": "test-key"}
        assert client.get("/api/v1/model-info", headers=headers).status_code == 200
        preflight = client.options("/api/v1/score", headers={"Origin": "http://localhost:3000",
                                    "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "X-API-Key"})
        assert preflight.headers["access-control-allow-origin"] == "http://localhost:3000"
        other = deepcopy(feature_request["consumers"][0])
        other["CONS_NO"] = "other"
        feature_request["consumers"].append(other)
        assert client.post("/api/v1/score", headers=headers, json=feature_request).status_code == 422


def test_threshold_configuration_and_override(feature_request):
    settings = Settings(database_url="sqlite://", default_threshold=0.9, explanation_top_k=1, _env_file=None)
    feature_request.pop("explanation_top_k", None)
    with TestClient(create_app(settings)) as client:
        first = client.post("/api/v1/score", json=feature_request).json()["results"][0]
        assert first["screening_threshold"] == 0.9
        assert len(first["explanation"]["top_signals"]) == 1
        feature_request["threshold"] = 0
        second = client.post("/api/v1/score", json=feature_request).json()["results"][0]
        assert second["screening_flag"] is True and second["screening_threshold"] == 0


def test_restart_retains_predictions(tmp_path, ai_ml, feature_request):
    settings = Settings(database_url=f"sqlite:///{(tmp_path / 'persistent.db').as_posix()}", _env_file=None)
    with TestClient(create_app(settings, ai_ml)) as client:
        body = client.post("/api/v1/score", json=feature_request).json()
    with TestClient(create_app(settings, ai_ml)) as client:
        cid = body["results"][0]["CONS_NO"]
        assert client.get(f"/api/v1/consumers/{cid}/risk").json()["score"] == body


def test_request_logs_use_templates(client, history_request, caplog):
    with caplog.at_level(logging.INFO, logger="electrify.backend"):
        client.post("/api/v1/score-history", json=history_request)
        client.get("/api/v1/consumers/C001/history")
    logs = " ".join(r.getMessage() for r in caplog.records if r.name.startswith("electrify.backend"))
    assert "{consumer_id}" in logs
    assert "C001" not in logs and "consumption" not in logs
