import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.ai_ml_service import AIMLService

ML_ROOT = Path(__file__).resolve().parents[2] / "ai_ml" / "Electrify_AI_ML_Final"


@pytest.fixture(scope="session")
def ai_ml():
    service = AIMLService(Settings(_env_file=None))
    service.load()
    assert service.ready, "Real locked model must load for integration tests"
    return service


@pytest.fixture
def app(tmp_path, ai_ml):
    return create_app(Settings(database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
                               _env_file=None), ai_ml=ai_ml)


@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client


@pytest.fixture
def feature_request():
    body = json.loads((ML_ROOT / "sample_data/sample_feature_request.json").read_text())
    body.pop("threshold", None)
    return body


@pytest.fixture
def history_request():
    return {"consumers": [{"CONS_NO": "C001", "period_start": "2026-01-01", "period_end": "2026-01-04",
                           "readings": [{"date": "2026-01-01", "consumption": 0},
                                        {"date": "2026-01-02", "consumption": None},
                                        {"date": "2026-01-03", "consumption": 3.0},
                                        {"date": "2026-01-04", "consumption": 4.0}]}],
            "include_explanations": False}
