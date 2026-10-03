# HANDOFF_NOTE.md — READ THIS FIRST

## Current project stage

**FINAL AI/ML HANDOFF** for Codeutsava X.0 project **Electrify**.

The AI/ML component is the first major technical component completed.

**Frontend: NOT IMPLEMENTED.**
**Backend: NOT IMPLEMENTED.**

The next stage is backend development through Codex. Frontend development follows later.

## What is complete

- Dataset audit and data semantics decisions
- chronological cleaning rules
- exact Task 4 V1 feature engineering implementation
- leakage-safe ML experimentation
- locked calibrated HistGradientBoosting model
- configurable screening threshold
- prediction/inference service
- raw-history to feature inference path
- structured validation/errors
- model-sensitivity explanations
- training/test provenance
- automated tests
- FastAPI API
- setup/configuration documentation

## What this package contains

- `src/electrify_ai_ml/` — actual reusable AI/ML source code
- `models/electrify_final_model.joblib` — locked trained model
- `artifacts/` — model provenance and explanation/reference artifacts
- `config/` — stable runtime configuration/schema
- `tests/` — automated tests
- `scripts/` — reproducibility and validation utilities
- `docs/API_SPEC.md` — stable HTTP and in-process contract
- `docs/INTEGRATION_GUIDE.md` — backend integration instructions
- `CODEX_HANDOFF.md` — full Codex handoff and ready-to-use prompt

## How the future backend should consume AI/ML

**Preferred:** import the component in-process:

`from electrify_ai_ml.service import RiskService`

Then call `RiskService.score_histories(...)` with daily readings.

A FastAPI boundary is also ready at:
- `POST /v1/score`
- `POST /v1/score-history`

## Critical data rule

Missing is not zero.

For raw-history inference, every intended calendar day should be represented, using
`consumption: null` for a missing reading.

## Files Codex should read first

1. `HANDOFF_NOTE.md`
2. `CODEX_HANDOFF.md`
3. `docs/API_SPEC.md`
4. `docs/INTEGRATION_GUIDE.md`
5. `README.md`

## Exact next action

Open the future Electrify backend repository in VS Code with Codex.

First ask Codex to inspect this AI/ML package, then build the backend around the documented
contract. The frontend should not be built in this AI/ML handoff.

## Current blockers/prerequisites

No AI/ML credential or external service is required.

The following are intentionally pending:
- backend application/database design
- frontend implementation
- authentication/authorization
- production deployment
- operational threshold calibration using real inspection costs/capacity

These pending items do not require reconstructing the AI/ML implementation.

## Important limitation

The locked model is validated for **full-history consumer classification**. Do not market or document
it as validated real-time/early-warning detection.
