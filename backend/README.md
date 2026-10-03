# Electrify Backend v1

FastAPI REST service backed by SQLAlchemy and the existing in-process
`electrify_ai_ml.service.RiskService`. The locked model, feature definitions,
threshold logic, and explanations remain in `../ai_ml/Electrify_AI_ML_Final/`.
Scores prioritize review; they are not proof of theft or a basis for automatic punishment.
The model is validated for full-history classification, not real-time detection.

## Setup and run

Run from the Electrify project root with Python 3.10–3.13 (validated here on 3.12.10):

```powershell
./scripts/setup_backend.ps1
Copy-Item backend/.env.example backend/.env  # optional; do not overwrite an existing .env
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

On Linux/macOS, run `bash scripts/setup_backend.sh`, activate `.venv/bin/activate`,
then use `python` in the commands below. Manual installation:

```text
python -m venv .venv
python -m pip install -r backend/requirements.txt -e ./ai_ml/Electrify_AI_ML_Final -e ./backend
python -m pip check
```

Use the activated virtual environment for manual installation. The AI/ML package
must be installed editably at its existing location because its runtime locates
configuration/artifacts relative to the source tree. No model download, credentials,
training, or dataset import is needed. API docs: `http://127.0.0.1:8000/docs`.

## Configuration

`backend/.env` is read regardless of current working directory; environment variables
take precedence. Defaults point to the existing AI/ML artifacts and `backend/electrify.db`.

| Setting | Default / meaning |
| --- | --- |
| `DATABASE_URL` | Absolute SQLite URL to `backend/electrify.db`; explicit relative SQLite URLs are relative to the process working directory |
| `DATABASE_AUTO_CREATE` | `true`; create initial tables on startup for local development |
| `AI_ML_MODEL_PATH` | Existing locked joblib artifact; use an absolute path for overrides |
| `AI_ML_REFERENCE_MEDIANS_PATH` | Existing training-only reference medians; use an absolute path for overrides |
| `DEFAULT_THRESHOLD` | `0.2010437721624017`, in [0,1] |
| `EXPLANATION_TOP_K` | `3`, in 1..24 |
| `MAX_CONSUMERS_PER_REQUEST` | `100`, configurable downward |
| `CORS_ORIGINS` | Comma-separated localhost ports 3000 and 5173 |
| `API_KEY` | Unset: local unauthenticated mode. Set a nonempty secret to require `X-API-Key` on every `/api/v1` endpoint |
| `LOG_LEVEL` | `INFO` |
| `APP_ENV` | `development` (informational) |

The shared-key dependency is the v1 auth hook; it does not implement user roles or
per-consumer authorization. `/health` stays public. Request logs contain generated
request IDs, route templates, status and duration, without IDs, payloads or secrets.
Use `--no-access-log` to prevent Uvicorn from separately logging raw URLs.
Responses include `X-Request-ID`. Backend settings override the corresponding ML
settings; training horizon constants continue to come from the package configuration.

## REST contract

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | Database connectivity/schema initialization and model readiness; 200 or 503 |
| GET | `/api/v1/model-info` | Locked model metadata, exact feature names, configured threshold |
| POST | `/api/v1/score` | Exact 24-feature inputs; creates consumers and saves predictions |
| POST | `/api/v1/score-history` | Raw or stored histories; calls AI/ML feature generation, upserts readings and saves predictions |
| GET | `/api/v1/consumers` | Sorted list with `limit` (1..1000, default 100), `offset` (default 0), and total |
| GET | `/api/v1/consumers/{consumer_id}` | Consumer identifier and creation time |
| GET | `/api/v1/consumers/{consumer_id}/history` | Stored daily rows sorted by date; pagination plus optional inclusive `period_start` and `period_end` filters |
| GET | `/api/v1/consumers/{consumer_id}/risk` | Latest persisted prediction, timestamp, source, period, and full single-consumer score envelope |

GET risk never runs inference. It returns the latest saved result even if later
readings or model configuration changed; check its timestamp and period. Repeated
POST requests append predictions. Raw history submissions update overlapping dates
and preserve existing dates outside the submitted period. Entire scoring batches
commit atomically, including newly created consumers and daily readings.

Feature requests follow the [AI/ML API specification](../ai_ml/Electrify_AI_ML_Final/API_SPEC.md):
`consumers: [{CONS_NO, features: {all 24 keys}}]`. All feature keys are required;
values must be finite numbers or explicit `null`. Feature names/order are imported
from the package, not maintained separately. `CONS_NO` is an opaque string identifier
(1..128 characters without whitespace). Labels and all extra keys are rejected.

Raw-history example:

```json
{
  "consumers": [{
    "CONS_NO": "C001",
    "period_start": "2026-01-01",
    "period_end": "2026-01-03",
    "readings": [
      {"date": "2026-01-01", "consumption": 0},
      {"date": "2026-01-02", "consumption": null},
      {"date": "2026-01-03", "consumption": 3.5}
    ]
  }],
  "include_explanations": true,
  "explanation_top_k": 3
}
```

This short example is technically scoreable but does not claim validated performance.
The package returns its horizon warnings. Raw histories require 2..10000 daily readings,
no duplicates, and every calendar date represented, even when period bounds are omitted.
Both bounds must be supplied together or omitted together. Missing consumption is
explicit `null`; zero remains an observed zero. Dates are `YYYY-MM-DD`. Input order
does not matter. No labels are passed to AI/ML.

Rescore a saved consumer through the same POST endpoint:

```json
{
  "consumers": [{"CONS_NO": "C001", "stored": true}],
  "include_explanations": false
}
```

Stored references optionally accept both period bounds. Without bounds, the service
uses the first/last stored date. Absent database days become explicit null readings
before calling AI/ML and are saved on successful scoring. The history GET endpoint
returns actual stored rows, without inventing calendar rows during reads.

Both POST endpoints accept optional `threshold`, `include_explanations` (default true),
and `explanation_top_k` (default configured value). Batches contain 1..100 unique IDs,
subject to the configured limit. Responses retain model version, scope, probability,
threshold, screening flag/status, quality, explanation, warnings and disclaimer.

Errors use `{"detail":{"code":"...","message":"..."}}`:
422 `INVALID_INPUT`, 404 `CONSUMER_NOT_FOUND` / `RISK_NOT_FOUND`, 401 `UNAUTHORIZED`,
409 `WRITE_CONFLICT` (retry a concurrent conflicting write), 503 `MODEL_UNAVAILABLE`
/ `DATABASE_UNAVAILABLE`, or 500 `INTERNAL_ERROR`. Validation responses additionally
contain safe error messages without echoing rejected inputs. Model failures never
return artifact paths. A failed model load leaves health/consumer APIs available;
fix configuration and restart to reload the model.

## Persistence and migrations

`consumers` stores IDs and creation times; `daily_readings` uses `(consumer_id, date)`
as its key with nullable consumption; `predictions` stores immutable per-consumer JSON
snapshots, model version, source, timestamp and analysis period. Timestamps are UTC
(SQLite stores them without a timezone suffix). SQLite foreign keys are enabled.

For an empty database managed with Alembic:

```text
python -m alembic -c backend/alembic.ini upgrade head
```

Then set `DATABASE_AUTO_CREATE=false` before startup. For a database already created
by this exact v1 schema, verify the tables first and use `alembic ... stamp head` to
adopt migration tracking. Future schema changes require migrations; `create_all`
does not upgrade existing tables. The included migration is tested with SQLite.

PostgreSQL uses the same SQLAlchemy models and migrations. Install a PostgreSQL
driver, set `DATABASE_URL=postgresql+psycopg://...`, run migrations, and disable auto
creation. PostgreSQL execution has not been validated in this workspace.

## Validation

From the project root using the virtual environment:

```text
python -m pytest -q backend/tests ai_ml/Electrify_AI_ML_Final/tests --import-mode=importlib
python -m compileall -q backend/app backend/scripts backend/migrations
python -c "import app.main; import electrify_ai_ml.service"
python -m pip check
python backend/scripts/smoke.py
```

`cd backend` then `python -m pytest -q` also runs the backend suite. Tests use isolated
temporary databases and real model inference. The smoke script starts a separate
Uvicorn process, checks all eight endpoints, scores a 1034-day synthetic calendar
with a missing day and a zero day, verifies persistence and stored rescoring, and
stops the process. It does not read or transform supplied datasets.

## Docker

Build with the **project root** as context:

```text
docker build -f backend/Dockerfile -t electrify-backend .
docker run --rm -p 8000:8000 -v electrify-db:/state electrify-backend
```

The image retains AI/ML under `/app/ai_ml`, uses a non-root application user, and stores
SQLite in `/state`. Docker execution is a separate check from the validated local
Windows environment.

## Integration decisions and limits

- Thin routes delegate to services and repositories. One model loads per application
  worker; synchronous inference is serialized within each worker for predictable access.
- **Mixed-period compatibility:** the package combines raw-history calendars in a batch.
  The adapter groups equal periods before calling `RiskService.score_histories`, then
  restores request order. This prevents other consumers' dates from changing a score
  without changing any feature code. A real-model regression verifies batch/single parity.
- Backend validation is intentionally stricter than the package HTTP wrapper: explicit
  null values, finite numeric types, complete calendars, paired bounds, unique batch IDs,
  bounded histories. All feature calculation remains in the AI/ML package.
- No AI/ML source, model, or feature definitions were edited. No dataset transformations,
  frontend, IoT, MQTT/WebSocket, new detectors, cause classification or priority engine
  are included. See [validation report](VALIDATION_REPORT.md) for run results and limits.
