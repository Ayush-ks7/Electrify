# Electrify — Codex project rules

## Current state
- `ai_ml/Electrify_AI_ML_Final/` is the validated AI/ML source of truth.
- Build the backend around it; do not rebuild/retrain/duplicate the model.
- Preserve the locked model artifact and the exact 24-feature V1 contract.

## Integration rules
- Preferred first architecture: Backend -> in-process `electrify_ai_ml.service.RiskService`.
- Keep the AI/ML package isolated under `ai_ml/`.
- Do not copy AI/ML source into `backend/`.
- `CONS_NO` is an identifier, never a model feature.
- `FLAG`/`CHK_STATE` are labels and never inference inputs.
- Missing consumption is `null`, not zero.
- Do not invent a new feature calculation in the backend.
- Model probability is a review-prioritization signal, not proof of theft.

## Scope for Backend v1
Implement FastAPI, validation, database persistence, AI/ML adapter/service, health/model-info,
consumer/history endpoints, scoring endpoints, tests, configuration, logging and setup docs.
Do not build frontend, MQTT/WebSocket, IoT simulation, new ML detectors, cause classification,
or the Inspection Priority Engine in this phase.

## Quality
Run tests, import/compile checks and a real backend -> AI/ML end-to-end smoke test before finishing.
Document deviations and blockers explicitly.
