import json
from pathlib import Path
from fastapi.testclient import TestClient
from electrify_ai_ml.api import app

client=TestClient(app)
ROOT=Path(__file__).resolve().parents[1]

def test_health():
    r=client.get("/health")
    assert r.status_code==200
    assert r.json()["feature_count"]==24

def test_model_info():
    r=client.get("/v1/model-info")
    assert r.status_code==200
    body=r.json()
    assert body["feature_count"]==24
    assert body["default_threshold"] > 0

def test_score_sample():
    body=json.loads((ROOT/"sample_data/sample_feature_request.json").read_text())
    r=client.post("/v1/score",json=body)
    assert r.status_code==200, r.text
    item=r.json()["results"][0]
    assert 0 <= item["predicted_probability"] <= 1
    assert isinstance(item["screening_flag"],bool)
    assert len(item["explanation"]["top_signals"])==3
    assert "not proof" in r.json()["disclaimer"].lower()

def test_score_history_sample():
    body=json.loads((ROOT/"sample_data/sample_history_request.json").read_text())
    r=client.post("/v1/score-history",json=body)
    assert r.status_code==200, r.text
    item=r.json()["results"][0]
    assert 0 <= item["predicted_probability"] <= 1

def test_missing_feature_rejected():
    body=json.loads((ROOT/"sample_data/sample_feature_request.json").read_text())
    body["consumers"][0]["features"].pop("recent_30d_mean")
    r=client.post("/v1/score",json=body)
    assert r.status_code==422
    assert r.json()["detail"]["code"]=="INVALID_INPUT"

def test_extra_feature_rejected():
    body=json.loads((ROOT/"sample_data/sample_feature_request.json").read_text())
    body["consumers"][0]["features"]["unexpected_feature"]=1
    r=client.post("/v1/score",json=body)
    assert r.status_code==422
