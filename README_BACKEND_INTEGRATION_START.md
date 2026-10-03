# Electrify Backend + AI/ML Integration Starter

This starter is designed to merge directly into the existing `Electrify/` VS Code workspace.

## What is included

- `ai_ml/Electrify_AI_ML_Final/` — the complete validated AI/ML package from
  `Electrify_AI_ML_Final_Package.zip`, preserved as the source of truth.
- `backend/` — an integration-ready backend scaffold.
- `AGENTS.md` — compact project rules for Codex.
- `CODEX_PLUS_PROMPT_BACKEND_V1.md` — the ready-to-paste Codex Plus prompt.
- `docs/` — integration notes.
- `scripts/` — cross-platform setup/check helpers.
- `.gitignore` — root project hygiene.

## What this ZIP does NOT replace

It does not replace your existing:
- `data/raw/`
- `data/processed/`
- `notebooks/`

Extract the ZIP into the existing `Electrify/` project root and choose merge/overwrite only for
starter files supplied by this archive. Your existing datasets are not included.

## Recommended first run

From the `Electrify/` root:

Windows PowerShell:
`.\scripts\setup_backend.ps1`

macOS/Linux:
`bash ./scripts/setup_backend.sh`

Then open `CODEX_PLUS_PROMPT_BACKEND_V1.md` and paste it into Codex Plus in VS Code.

The prompt remains valid after this ZIP is extracted: the paths, AI/ML package location and
backend scaffold all match.

## Important

The AI/ML model is already validated. Backend integration must call the existing
`electrify_ai_ml.service.RiskService`. Do not retrain or duplicate the model.
