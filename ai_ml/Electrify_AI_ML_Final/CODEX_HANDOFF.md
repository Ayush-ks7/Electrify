# CODEX_HANDOFF.md — Electrify AI/ML -> Future Backend

## 1. Purpose

This package is the finished AI/ML component for **Electrify**.

The future backend does not exist yet. Your job is to build the backend **around** this already-completed component,
not to redesign the ML system.

## 2. Read these files first

1. `HANDOFF_NOTE.md`
2. `README.md`
3. `docs/API_SPEC.md`
4. `docs/INTEGRATION_GUIDE.md`
5. `config/feature_schema.json`
6. `artifacts/model_card.md`

## 3. What the ML component provides

- exact 24-feature V1 feature generation
- locked calibrated model artifact
- probability inference
- configurable screening threshold
- local sensitivity explanations
- validation/error handling
- in-process service
- FastAPI API

## 4. Main files

- `src/electrify_ai_ml/feature_engineering.py`: exact Task 4 V1 features
- `src/electrify_ai_ml/service.py`: backend-facing orchestration layer
- `src/electrify_ai_ml/model.py`: artifact loading/inference
- `src/electrify_ai_ml/explain.py`: local sensitivity explanations
- `src/electrify_ai_ml/api.py`: FastAPI interface
- `src/electrify_ai_ml/cleaning.py`: deterministic dataset cleaning helpers
- `models/electrify_final_model.joblib`: locked model
- `artifacts/feature_reference_medians_train_only.json`: training-only explanation references

## 5. Initialization

Python:

```python
from electrify_ai_ml.service import RiskService
ai = RiskService.create()
```

HTTP:

```bash
uvicorn electrify_ai_ml.api:app --host 0.0.0.0 --port 8000
```

## 6. Backend-facing interface

Preferred in-process call:

```python
result = ai.score_histories([
    {
        "CONS_NO": "C001",
        "period_start": "2026-01-01",
        "period_end": "2026-03-31",
        "readings": [
            {"date": "2026-01-01", "consumption": 3.2},
            {"date": "2026-01-02", "consumption": None}
        ]
    }
])
```

For precomputed features:

```python
result = ai.score_feature_rows([
    {"CONS_NO":"C001", <24 exact feature keys>}
])
```

See `docs/API_SPEC.md` for complete schemas.

## 7. Input rules

- `CONS_NO` is an identifier only.
- Send no labels.
- Exactly 24 model features are accepted in `/v1/score`.
- Raw histories must preserve chronological daily structure.
- Missing consumption must be `null`, not zero.
- Duplicate dates are rejected.
- Non-finite numeric values are rejected.
- `period_start` and `period_end` are recommended for raw history so calendar gaps are caught.

## 8. Output rules

Backend should retain:
- `predicted_probability`
- `screening_threshold`
- `screening_flag`
- `status`
- `data_quality`
- `explanation`
- `model_version`

`predicted_probability` is a calibrated model estimate. It is not a proof/certainty statement.

## 9. Threshold

Default: **0.201043772162**

Keep it configurable. Do not hard-code it into UI logic or treat it as an operationally validated optimum.

## 10. Explainability

Explanations use leave-one-feature-out median replacement sensitivity.

This is **not causal attribution**.

Use neutral wording such as:
"Model identified consumption patterns associated with higher predicted risk."

Avoid:
"This consumer stole electricity."

## 11. Integration architecture

Preferred initial architecture:

`Backend -> RiskService (in-process)`

Alternative:

`Backend -> HTTP -> FastAPI AI/ML service`

Do not introduce a separate service boundary unless it provides a concrete benefit for the main repository.

## 12. Tests and commands

```bash
pip install -r requirements.txt
pip install -e .
pytest -q
python scripts/validate_package.py
```

API:
```bash
uvicorn electrify_ai_ml.api:app --host 0.0.0.0 --port 8000
```

## 13. What Codex must not change unnecessarily

- the 24 feature definitions
- the serialized model
- the calibration method
- the model threshold default
- the explanation method
- the target exclusion rules
- the missing-vs-zero semantics

Any change to those must be justified, tested, and documented as a model/integration change.

## 14. Known limitations

- no frontend
- no backend
- no database
- no auth
- no production deployment
- no field-cost-based threshold tuning
- full-history classification only
- raw history outside the Dataset A training horizon is not covered by the reported validation metrics

## 15. Ready-to-use Codex prompt

> You are now integrating the finished Electrify AI/ML component into the new backend repository.
>
> First inspect this package before writing backend code. Read `HANDOFF_NOTE.md`, `CODEX_HANDOFF.md`,
> `README.md`, `docs/API_SPEC.md`, and `docs/INTEGRATION_GUIDE.md`.
>
> The AI/ML implementation is already complete. Do not redesign or retrain the model.
>
> Build the backend from scratch around the documented AI/ML contract. Prefer in-process use of
> `electrify_ai_ml.service.RiskService` unless the repository architecture gives a concrete reason to
> use the FastAPI service boundary.
>
> Connect the backend to:
> - raw daily consumer history
> - exact Task 4 V1 feature generation
> - calibrated model inference
> - configurable screening threshold
> - explanation output
>
> Add:
> 1. request/response validation
> 2. error handling
> 3. authentication/authorization hooks appropriate to the new backend
> 4. persistence/database models for scored consumers and model version where appropriate
> 5. backend integration tests
> 6. one end-to-end test from stored/raw history to model result
> 7. configuration/environment management
> 8. clear API documentation
> 9. health checks
> 10. logging that does not leak raw consumption payloads
>
> Preserve the AI/ML semantics:
> - missing != zero
> - do not use `CONS_NO` as a model feature
> - do not pass labels into inference
> - keep the threshold configurable
> - treat model output as review prioritization, not proof of theft
>
> Do not build the frontend in this stage.
>
> Run all tests, fix actual issues, and report:
> - files created/changed
> - architecture decisions
> - commands executed
> - test results
> - remaining blockers/prerequisites
> - any AI/ML integration assumptions
>
> If the backend architecture requires a modification to the AI/ML module, explain why before
> changing it and keep the model artifact and feature definitions unchanged unless a concrete
> compatibility issue is demonstrated.
