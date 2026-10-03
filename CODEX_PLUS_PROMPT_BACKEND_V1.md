# Codex Plus Prompt — Electrify Backend v1

Work from the `Electrify/` project root. Read `AGENTS.md` first, then inspect:
- `ai_ml/Electrify_AI_ML_Final/CODEX_HANDOFF.md`
- `ai_ml/Electrify_AI_ML_Final/HANDOFF_NOTE.md`
- `ai_ml/Electrify_AI_ML_Final/README.md`
- `ai_ml/Electrify_AI_ML_Final/API_SPEC.md`
- `ai_ml/Electrify_AI_ML_Final/INTEGRATION_GUIDE.md`
- `ai_ml/Electrify_AI_ML_Final/pyproject.toml`
- `ai_ml/Electrify_AI_ML_Final/config/`
- `ai_ml/Electrify_AI_ML_Final/src/electrify_ai_ml/`
- `ai_ml/Electrify_AI_ML_Final/models/electrify_final_model.joblib`
- `ai_ml/Electrify_AI_ML_Final/tests/`

## Goal
Build Backend v1 around the existing validated AI/ML package. Do NOT retrain, replace, rewrite,
duplicate, or move the ML model/feature pipeline. Use the existing `RiskService` in-process unless
there is a concrete repository-level reason to use the package's HTTP API.

## Current project
Electrify/
├── data/raw/                        # existing datasets
├── data/processed/                  # existing processed data
├── notebooks/
├── ai_ml/Electrify_AI_ML_Final/     # LOCKED AI/ML source of truth
└── backend/                         # implement here

## Backend structure
Use/complete:
backend/
├── app/
│   ├── main.py
│   ├── core/{config.py,logging.py}
│   ├── api/routes/{health.py,scoring.py,consumers.py}
│   ├── schemas/{scoring.py,consumer.py}
│   ├── services/{ai_ml_service.py,consumer_service.py}
│   └── db/{database.py,models.py,repositories.py}
├── tests/
├── scripts/
├── requirements.txt
├── pyproject.toml
├── .env.example
├── Dockerfile
└── README.md

## Dependencies
Create/use an isolated Python 3.10–3.13 environment.
Install backend deps plus the local AI/ML package; do not duplicate its source.
Backend baseline:
FastAPI 0.128.2
Uvicorn 0.48.0
Pydantic 2.13.4
pydantic-settings (<3)
SQLAlchemy (>=2,<3)
Alembic (>=1.14,<2)
python-dotenv (<2)
HTTPX 0.28.1
pytest 9.0.2
pytest-asyncio (<2)

Install the local package from:
`./ai_ml/Electrify_AI_ML_Final`

## AI/ML contract
The AI/ML package already provides:
- exact 24-feature V1 generation
- calibrated HistGradientBoosting model
- thresholding
- local sensitivity explanations
- validation/error handling
- `RiskService.score_histories()` and `score_feature_rows()`
- FastAPI fallback service

Preserve:
- missing != zero (`null` for missing)
- `CONS_NO` is ID only
- no `FLAG`/`CHK_STATE` in inference
- exact feature names/types
- configurable default threshold `0.2010437721624017`
- model output is not proof of theft

## Backend responsibilities
Own:
- consumer lookup
- database access
- converting stored history into the documented reading contract
- request/response validation
- result persistence
- API/auth hooks where appropriate
- application logging
- frontend-facing REST contract

AI/ML owns:
- feature generation
- model inference
- threshold post-processing
- explanations

## APIs
Implement/test:
GET  /health
GET  /api/v1/model-info
POST /api/v1/score
POST /api/v1/score-history
GET  /api/v1/consumers
GET  /api/v1/consumers/{consumer_id}
GET  /api/v1/consumers/{consumer_id}/history
GET  /api/v1/consumers/{consumer_id}/risk

Keep route handlers thin. Put logic in services/repositories.

## DB
Use SQLite locally via SQLAlchemy. Keep PostgreSQL-ready.
Initial persistence:
- consumer
- daily meter/history record
- prediction/score record
- model/version metadata if useful

Do not unnecessarily transform the supplied datasets.

## Validation / errors
Use Pydantic.
Return clear 4xx errors for invalid payloads/IDs/history.
Return controlled 5xx errors for AI/ML/model failures.
Never expose filesystem paths or sensitive logs.

## Tests / acceptance
Add tests for health, model-info, valid score, valid history score, bad payload, missing consumer,
malformed history, AI/ML failure, DB persistence, schemas.
Run:
- `pytest -q`
- compile/import checks
- backend startup with Uvicorn
- one real end-to-end backend -> `RiskService` score
- endpoint smoke test

## Do NOT implement in this phase
Frontend, MQTT/WebSocket, IoT simulation, peer clustering, new anomaly detectors,
cause classification, or Inspection Priority Engine.

## Final report
Return:
1. files created/changed
2. dependencies installed
3. commands run
4. test/smoke results
5. architecture notes
6. blockers/deviations
7. any AI/ML compatibility issue

Only modify the AI/ML package when a concrete integration compatibility issue is demonstrated.
Never alter the locked model artifact or 24-feature definitions just for convenience.
