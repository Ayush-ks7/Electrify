# Simulation implementation and validation

Validated on 2026-10-03 against the local Windows workspace. Tests use temporary databases and the real locked model; the developer's running database was not reset or seeded by validation. No commits or pushes were made.

## Results

| Check | Result |
| --- | --- |
| Existing + new backend tests: `.venv/Scripts/python.exe -m pytest backend/tests -q` | **48 passed** (41 existing, 7 simulation tests) |
| Existing AI/ML tests: run `../../.venv/Scripts/python.exe -m pytest -q` in `ai_ml/Electrify_AI_ML_Final` | **11 passed** |
| Frontend type-check: `npm run typecheck` | **Passed** |
| Frontend lint: `npm run lint` | **Passed**, 0 errors, 18 warnings in pre-existing code |
| Frontend build: `npm run build` | **Passed**; existing large-bundle warning (~751 kB main JS, ~224 kB gzip) |
| Existing frontend tests: `npm test` | **8 passed** |
| Python import/compile: `python -m compileall -q backend/app backend/tests scripts/smoke_simulation.py` | **Passed** |
| Existing real-model E2E: `python backend/scripts/smoke.py` | **Passed**, 8 endpoints, 1,034 history days, stored rescore matches, probability `0.004550805063616289` |
| Browser/runtime E2E: `python scripts/smoke_simulation.py` | **Passed**, 0 browser errors, 0 failed browser requests |
| Alembic migration/schema parity | **Passed** as part of backend tests, including upgrade, schema comparison, downgrade |
| `git diff --check` | **Passed**; Git emits platform line-ending notices, no whitespace errors |
| Locked AI/ML changes | **None**; model Git blob matches HEAD, and no files under `ai_ml/` changed |

Python tests report the existing Starlette/AnyIO deprecation warning. Node's test runner reports its experimental TypeScript-transform warning. Lint warnings concern unused declarations in old sample components and existing React effect/purity patterns; none concern the new simulator or investigation components. They are recorded rather than suppressed. The prior `smoke_frontend.py` script targets the old tab/sample-screen architecture; its shared server helpers are reused by the new complete runtime script, while its obsolete screen assertions were not run or rewritten.

Verified locked artifact checksums:

```text
SHA-256: 9d3e2853e71d01d80f051520d858fa27d07f0026d1ffa8e8efb97ba23e28ee02
Git blob (working file and HEAD): 12cd1fadecfa89e668786abb50c2981a07f85e8a
```

## Runtime and visual review

The Playwright run launches its own FastAPI and Vite processes, seeds a real persisted source consumer in a temporary database, and operates the real UI in Chromium. It verifies:

- Selecting an existing consumer creates a demo copy; realistic minute telemetry arrives without a frontend generation timer.
- Pause prevents cursor advancement; Stop preserves evidence; Reset deletes only owned copies.
- Five independent streams run simultaneously with different scenarios.
- Outage voltage/current/power/energy remain null, including complete daily nulls (also asserted directly in backend tests).
- Fault telemetry presents “Meter malfunction suspected,” independently of the model's screening flag.
- Persistent reduction produces an unverified tampering hypothesis, while temporary load context is explicitly supplied by the simulator.
- Dashboard rows and selected history update via polling without document reload.
- Consumer details show actual saved model explanation signals; manual stored-history rescoring still works for simulation and original consumers.
- Case status persists in the database and survives subsequent scoring; restart recovery is covered by backend tests.
- CORS preflight succeeds; browser requests and console contain no runtime/API errors in the successful run.
- Mobile controls fit a 390×844 viewport; desktop dashboard, detail and control screenshots were visually inspected for consistency with the existing style.
- Cases, Anomalies and Alerts redirect to the same live investigations. System/model diagnostics still show the locked model version.

The first browser run exposed a reset/polling race that briefly fetched deleted demo history. Controls now cancel/suspend reads and refresh consumer membership before history polling resumes. Subsequent full browser runs passed without 404s or failed requests.

Generated, ignored artifacts:

- `logs/simulation-validation/report.json`
- `logs/simulation-validation/dashboard.png`
- `logs/simulation-validation/consumer-detail.png`
- `logs/simulation-validation/controls.png`
- `logs/simulation-validation/mobile-controls.png`
- `logs/simulation-validation/backend.log`, `vite.log`

Additional backend assertions cover: real full-history inference and seven-day score cadence; partial days and speed changes; recorded zero versus missing readings; temporary-load recovery; model failure retaining telemetry and later retrying; atomic invalid multi-target starts; duplicate source/copy aliases; selective reset ownership checks; the 90-day stop limit; API-key protection; and restart-persisted status with paused streams.

## Files changed by this task

The workspace already contained uncommitted frontend/backend integration work. The following is the complete **task-specific** manifest (31 files); existing integration edits were built upon, not reverted.

| File | Change |
| --- | --- |
| `README.md` | Link to simulation setup |
| `backend/README.md` | Extension/startup/migration guidance |
| `backend/app/main.py` | Scheduler lifecycle and API registration |
| `backend/app/db/models.py` | Stream, telemetry and investigation persistence |
| `backend/app/api/routes/simulation.py` | New control, investigation and telemetry endpoints |
| `backend/app/schemas/simulation.py` | Strict scenario/control/status request validation |
| `backend/app/services/simulation_service.py` | Backend generation, aggregation, state and scoring scheduling |
| `backend/app/services/investigation_service.py` | Unified evidence, rules, saved prediction and case-status projection |
| `backend/migrations/versions/0002_simulation.py` | Additive schema migration |
| `backend/tests/test_migrations.py` | Updated schema expectations |
| `backend/tests/test_simulation.py` | Seven behavioral/integration tests |
| `src/App.tsx` | Consolidated routes and legacy redirects |
| `src/components/cards/InvestigationSummary.tsx` | Shared context, status, evidence and explanation component |
| `src/components/charts/ConsumptionTrendChart.tsx` | Honest pre-simulation baseline label |
| `src/components/charts/LiveMeterChart.tsx` | Live interval power chart with missing gaps |
| `src/components/layout/AppShell.tsx` | Simulator entry point and live investigation alert count |
| `src/components/layout/NotificationDrawer.tsx` | Backend-backed unified alerts instead of sample notifications |
| `src/components/layout/Sidebar.tsx` | Overview/Investigations/System navigation |
| `src/components/layout/SimulationPanel.tsx` | Scenario, consumer, speed and lifecycle controls |
| `src/components/tables/InvestigationTable.tsx` | Shared searchable investigation queue |
| `src/components/ui/modal.tsx` | Accessible dialog label, keyboard focus trap and focus restoration |
| `src/hooks/live.ts` | Suspend history queries while simulation controls execute |
| `src/hooks/simulation.ts` | Shared polling and case-status mutation hooks |
| `src/pages/Dashboard/index.tsx` | Unified live queue, current telemetry and baseline/history comparison |
| `src/pages/Consumers/index.tsx` | Same unified queue in the directory |
| `src/pages/ConsumerDetail/index.tsx` | One consolidated investigation detail view |
| `src/services/simulation.ts` | Typed simulation/investigation API client |
| `src/types/simulation.ts` | Explicit transport types and scenario/status options |
| `scripts/smoke_simulation.py` | Isolated real browser/backend/model runtime validation |
| `docs/SIMULATION_MODE.md` | Architecture, API, demo, provenance, scope and limitations |
| `docs/SIMULATION_VALIDATION.md` | This report and file manifest |

Pre-existing dirty/untracked paths **not edited by this task**: `package.json`, `src/components/layout/GlobalSearchModal.tsx`, `src/components/layout/Topbar.tsx`, `src/components/tables/ConsumerTable.tsx`, `src/hooks/index.ts`, `src/pages/System/index.tsx`, `src/services/index.ts`, `src/types/index.ts`, `src/utils/formatters.ts`, `vite.config.ts`, `.env.example`, `docs/FRONTEND_BACKEND_INTEGRATION.md`, `scripts/smoke_frontend.py`, `src/components/common/QueryState.tsx`, `src/services/api.ts`, `src/types/api.ts`, `src/utils/liveData.ts`, and `tests/frontend-api.test.mjs`.

Git diff and status were inspected, including the additive database changes, frontend navigation changes, new services and test files. The repository remains uncommitted.

## Remaining requirements and limitations

No fake model outputs were introduced. Generated telemetry and demo history are synthetic; legitimate-load context is supplied by the simulator; the top bar still contains the pre-existing static Demo profile. Legacy sample page source remains unused.

Calibrated cause confidence, trained cause classification, independent anomaly score, validated inspection-priority engine, physical IoT/MQTT ingestion, category/feeder/transformer metadata, peer/grid loss analytics, workflow audit/assignment/notes, distributed scheduling, and production alert delivery remain unsupported. Null numeric confidence/anomaly fields and the investigation service provide explicit extension points. The present cause/priority/action layer uses documented rules and context, not ML classification.

Run one backend worker, at most 20 demo copies, and at most 90 virtual days per copy. Restart pauses streams; reset starts fresh copies. Scoring only sees completed daily histories and runs periodically, so it does not guarantee an immediate theft flag for short synthetic episodes. All probabilities remain review signals. See [SIMULATION_MODE.md](SIMULATION_MODE.md) for exact semantics and startup commands.
