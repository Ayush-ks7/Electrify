# Integration Guide — Future Electrify Backend

## Recommended architecture

Because the backend does not exist yet, the cleanest hackathon architecture is:

`Backend -> RiskService (in-process) -> feature engineering -> model -> explanation`

Keep the FastAPI API as a ready-made alternative if the backend later moves the AI/ML layer into a separate process/container.

## In-process example

```python
from electrify_ai_ml.service import RiskService

ai = RiskService.create()

result = ai.score_histories([
    {
        "CONS_NO": "C001",
        "period_start": "2026-01-01",
        "period_end": "2026-03-31",
        "readings": [
            {"date": "2026-01-01", "consumption": 3.2},
            {"date": "2026-01-02", "consumption": None},
            {"date": "2026-01-03", "consumption": 3.4},
            # every intended calendar day should be represented
        ],
    }
])
```

## Backend responsibilities

The future backend should own:

- authentication and authorization
- consumer lookup
- database access
- converting stored meter readings into the documented `readings` contract
- selecting the analysis period
- persisting/displaying results
- audit logging appropriate to the application

The AI/ML module owns:

- deterministic V1 feature generation
- model loading
- probability inference
- threshold post-processing
- explanation generation
- schema validation inside the AI/ML boundary

## Important data rule

Missing consumption is **not** zero. Preserve `null` for missing data.

If the database has no record for a day, the backend should add a daily record with `consumption: null` before sending the history to `/v1/score-history` or `RiskService.score_histories()`.

## Important model rule

Do not send labels (`FLAG`, `CHK_STATE`) to inference.

Do not use `CONS_NO` as a feature.

Do not retrain the model during backend integration.

## UI/result semantics

Backend should store/serve at least:

- `predicted_probability`
- `screening_threshold`
- `screening_flag`
- `status`
- `data_quality`
- `explanation`
- `model_version`

Present a flag as a review-prioritization signal, not as proof of theft.

## Deployment

Local API:
```bash
uvicorn electrify_ai_ml.api:app --host 0.0.0.0 --port 8000
```

Docker:
```bash
docker build -t electrify-ai-ml .
docker run --rm -p 8000:8000 electrify-ai-ml
```
