# Electrify — utility operations

A utility-facing workspace for energy balance, simulated meter intelligence, and human investigation. There is no login or named operator profile.

## Run locally

Use Node 24 and Python 3.10–3.13. From the repository root:

```powershell
./scripts/setup_backend.ps1
npm ci
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

In another terminal:

```powershell
npm run dev
```

Open http://localhost:5173. Restart an existing backend after updating this checkout. The default auto-create setting adds the new findings/cases tables. If auto-create is disabled, run `alembic -c backend/alembic.ini upgrade head` in the activated environment; do not stamp an existing unversioned database blindly.

The frontend uses `VITE_API_BASE_URL` (default http://localhost:8000). Use an empty value for a same-origin server proxy. Keep API keys on a trusted server proxy, never in VITE variables. Production hosting needs SPA route fallback and an explicitly permitted backend CORS origin.

## Workspace

- Overview: transformer energy balance, 7/30-day ranges, CSV, consumption and priority work.
- Locality: interactive 3D and 2D views with shared node detail drawers.
- Consumers: searchable/filterable table and five detail tabs.
- Anomalies: persisted machine findings, with New / Case Created status.
- Cases: persisted human investigation statuses, notes and activity.
- Data Quality: completeness, missing/invalid/duplicate stored readings and affected meters.
- Simulation: locality/transformer/consumer targets and six simple scenarios.

Canonical topology: **T1 → C01–C10; T2 → C11–C20**. Exactly 20 configured consumers and two transformers. The existing generic history/scoring APIs still accept independent original records, which are preserved outside this simulated service territory.

All locality energy is clearly labeled simulated. Before starting meters, the workspace shows illustrative baseline history with **no invented model scores**. Transformer input is an explicitly illustrative baseline plus 4.5%, because there is no transformer metering endpoint. Missing readings stay null; zero remains a valid observation.

## Validation

```powershell
npm run lint
npm test
npm run build
.venv/Scripts/python.exe -m pytest -q backend/tests ai_ml/Electrify_AI_ML_Final/tests --import-mode=importlib
.venv/Scripts/python.exe backend/scripts/smoke.py
.venv/Scripts/python.exe scripts/smoke_workspace.py
.venv/Scripts/python.exe scripts/smoke_simulation.py
```

Browser acceptance requires the optional Python Playwright package and Chromium: `python -m pip install playwright`, then `python -m playwright install chromium`. It uses temporary databases and ports.

See [architecture and API mapping](docs/FRONTEND_BACKEND_INTEGRATION.md), [simulation behavior](docs/SIMULATION_MODE.md), [simulation audit and validation](docs/SIMULATION_VALIDATION.md), and [overhaul validation/report](docs/FRONTEND_OVERHAUL.md).
