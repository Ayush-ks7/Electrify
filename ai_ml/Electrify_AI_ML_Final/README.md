# Electrify AI/ML — Final Implementation Package

This is the final standalone AI/ML component for the Codeutsava X.0 project **Electrify**.

## Current project stage

The AI/ML component is complete and packaged for integration. The Electrify frontend and backend do **not** exist yet. The next development stage is backend construction, followed later by frontend construction.

## What this package does

1. Converts chronological daily electricity-consumption history into the exact 24 Task 4 V1 features used by the locked model.
2. Loads the calibrated Task 7 model artifact.
3. Produces a calibrated risk probability for each consumer.
4. Applies a configurable screening threshold.
5. Produces model-sensitivity explanations.
6. Exposes the inference layer both as an in-process Python service and as a FastAPI HTTP API.
7. Validates inputs, handles missing values through the serialized model pipeline, and returns structured errors.
8. Provides reproducibility, provenance, tests, and Codex integration documentation.

## Architecture

`raw daily history -> V1 feature engineering -> locked calibrated model -> risk probability -> configurable screening status -> explanation`

The model is a **full-history consumer classifier**. It is not validated for real-time or early-warning cutoff prediction.

## Directory structure

See the complete tree in `HANDOFF_NOTE.md` and the focused integration map in `CODEX_HANDOFF.md`.

## Prerequisites

- Python 3.13.x was used for final package validation.
- The exact validated dependency versions are listed in `requirements.txt`.
- Python 3.10+ is the intended minimum for the source package, but reproduce the tested environment when loading the serialized artifact.

## Installation

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

## Configuration

Copy `.env.example` to `.env` if desired. The module reads:

- `ELECTRIFY_MODEL_PATH`
- `ELECTRIFY_REFERENCE_MEDIANS_PATH`
- `ELECTRIFY_DEFAULT_THRESHOLD`
- `ELECTRIFY_MAX_CONSUMERS`
- `ELECTRIFY_EXPLANATION_TOP_K`
- `ELECTRIFY_LOG_LEVEL`

No credentials are required. No external API or cloud service is required.

## Run the API

```bash
uvicorn electrify_ai_ml.api:app --host 0.0.0.0 --port 8000
```

Interactive API docs are then available at `/docs`.

## In-process usage

```python
from electrify_ai_ml.service import RiskService

service = RiskService.create()
result = service.score_feature_rows([
    {
        "CONS_NO": "consumer-001",
        # exact 24 feature keys here
    }
])
```

See `docs/INTEGRATION_GUIDE.md` for a complete example.

## Test

```bash
pytest -q
python scripts/validate_package.py
```

## Model artifact

`models/electrify_final_model.joblib` is the locked Task 7 artifact.

- HistGradientBoostingClassifier
- class-balanced training
- median imputation + missing indicators inside the artifact
- sigmoid calibration (5-fold CV inside the Dataset A training split)
- 24 Task 4 V1 features
- default screening threshold: **0.201043772162**

## Threshold

The threshold is a configurable screening convention selected using training-only cross-validation. It is **not** a field-validated operational optimum because the project has not supplied a real inspection-cost matrix or inspection-capacity constraint.

## Explanations

Local explanations are leave-one-feature-out median-replacement sensitivities using **training-only reference medians**. They are not causal attributions.

## Safety / intended use

A high score means the locked model estimates higher risk relative to its learned pattern. It is not proof that a consumer committed theft and should not automatically trigger punitive action.

## Troubleshooting

- `MODEL_UNAVAILABLE` on `/health` means the model/config artifact paths are wrong or the runtime is incompatible.
- `INVALID_INPUT` means a required feature/date/history value is missing, extra, duplicated, non-numeric, or otherwise invalid.
- If the serialized artifact fails to load in another environment, reproduce the validated scikit-learn version from `requirements.txt` before changing the model.
- If raw history is shorter or materially different from the Dataset A training horizon, scoring is technically possible but the package does not claim validated performance for that input regime.

## Known limitations

1. Full-history classification only.
2. The locked model was trained on Dataset A's 80% training split; the 20% test set remains the basis for the reported frozen evaluation.
3. Dataset B was used only as post-lock robustness evidence and is not a tuning/validation set for the locked model.
4. Raw-history inference requires every intended calendar day to be represented; use `consumption: null` for a missing reading.
5. Explanation sensitivities are model-specific and not causal.
6. No production deployment, authentication, database, queue, or frontend is included because those components do not yet exist.


## Raw-history scoring

Use `POST /v1/score-history` or `RiskService.score_histories()` when the future backend has daily readings.
For missing meter data, send `consumption: null`. Do not replace missing with zero.

For precomputed Task 4 V1 features, use `POST /v1/score` or `RiskService.score_feature_rows()`.

See `API_SPEC.md` and `docs/FEATURE_ENGINEERING_SPEC.md`.
