# Simulation audit and validation — 4 October 2026

Scope: stabilize the existing implementation. The current request explicitly authorizes simulation/frontend fixes beyond the historical Backend v1 scope in AGENTS.md. No model artifact, AI/ML source, feature calculation, scenario category, case status, feeder model or dependency was added or changed. Existing unrelated workspace changes were preserved.

## Audit and root causes

Traced `Simulation.tsx` → workspace hooks/service → simulation API/schema → persisted `SimulationStream` → hourly telemetry/daily history → `ScoringService` → `AIMLService` → locked `RiskService` → `InvestigationService` → workspace projection → Overview, consumer table/detail, node drawer, anomalies and cases. Also reviewed shell polling, topology, data quality, migrations, generic consumer/scoring routes, configuration and existing tests.

- Scenario changes retained the prior run's partial-day totals, missing flag, completed history, predictions and latest telemetry. A change from outage to normal could produce a missing normal day. Each changed target now returns to its original baseline with a new run ID.
- Randomness depended on generated-reading count, making the waveform depend on speed/tick segmentation. It now depends on source/date/hour; scenario constraints are applied after noise. Telemetry records scenario and run provenance.
- Baseline scores were absent; automatic scoring ran only after the first completed day and every seven days thereafter. An arbitrary 30-observed-day gate suppressed otherwise supported scoring. Initialization and each completed day now use the existing locked model, with the existing ML input validation. Slow clocks retain the previous completed-history score. Scoring failures remain explicit and retryable.
- Consumers showed operational priority instead of numeric probability, and the node drawer omitted the score. A shared presentation component now shows the backend probability in the table, details, drawer and simulation status table, separately from operational priority.
- Transformer input stayed at baseline during legitimate high load, producing contradictory negative residuals. Supply is now accumulated from generated load before reported meter faults/under-reporting, then aggregated through the existing topology. It never enters model inference.
- Unfiled findings froze their first (sometimes unscored) snapshot and survived reset. They now track evolving evidence and are cleared on reset/switch or recovery. Opening a case freezes evidence; human statuses and notes survive reset.
- Reset used stale client-side stream IDs and merely invalidated caches. Controls now resolve all owned streams on the server. Queries are canceled before and after mutations, polling is suspended during controls, and all workspace window caches are reset. Reset is idempotent, including repeated explicit IDs already removed.
- Manual history scoring and workspace reads could overlap reset. They now share the simulation lifecycle lock, so a scoring response cannot recreate a deleted simulation copy and snapshots cannot straddle reset.
- A successful manual full-history retry now clears the simulation scoring error and refreshes unfiled evidence, including when generation is stopped.
- Reset completion could overwrite a rapidly changed draft target. Draft reset now occurs before controls re-enable. Target/scenario controls are disabled during lifecycle mutations. The status table is constrained to its grid column on mobile.

## Implementation areas

- Backend: `services/simulation_service.py`, `investigation_service.py`, `operations_service.py`; routes `operations.py`, `scoring.py`.
- Frontend: `workspace/hooks.ts`, `Simulation.tsx`, `Shell.tsx`, `RiskScore.tsx`, `Consumers.tsx`, `NodeDrawer.tsx`, `Investigations.tsx`, `service.ts`; `types/simulation.ts`, `index.css`.
- Verification: `backend/tests/test_simulation.py`, `test_simulation_regression.py`; `scripts/smoke_simulation.py`, `smoke_workspace.py`.

See [mode → telemetry → entity → detection → UI mapping](SIMULATION_MODE.md#existing-scenario-mapping). All six existing modes are represented: normal, legitimate_abnormal, sudden_drop, tampering, meter_fault and communication_failure. Both reduction modes still share the existing operational detector. No probability is forced to match a scenario label.

## Verification commands

```powershell
.venv/Scripts/python.exe -m pytest backend/tests -q -p no:cacheprovider
.venv/Scripts/python.exe -m pytest ai_ml/Electrify_AI_ML_Final/tests -q -p no:cacheprovider
.venv/Scripts/python.exe -m compileall -q backend/app backend/tests scripts
npm test
npm run typecheck
npm run build
npm run lint
.venv/Scripts/python.exe scripts/smoke_simulation.py
.venv/Scripts/python.exe scripts/smoke_workspace.py
```

The backend regressions exercise all 36 ordered scenario pairs (including unchanged Start), all six generated conditions, pause/stop/reset, original-record isolation, daily scores through the real model, deterministic repeats, partial-day segmentation, supply balance, anomaly evolution, preserved case evidence, one-stream failure isolation, model-failure recovery and reset during manual scoring. An assertion compares the actual UI scenario configuration with the backend literal contract.

The simulation browser suite uses real FastAPI, the real model and a temporary database. It checks six modes through SPA navigation, consumer table/detail score visibility, Overview/anomaly updates, stop, repeated reset/start cycles, an intentionally delayed old response, an injected reset failure and all 20 meters' model scores. The workspace suite checks the broader UI, 3D/2D drawers, case creation/status/notes, persistence, responsive views and backend-outage retry. Neither suite alters the developer database.

## Recorded results

- Full backend suite: **102 passed**. Following the final manual-score recovery fix, the API suite, reset/scoring concurrency regression and new manual-recovery regression were rerun: **31 passed** (103 distinct backend tests exercised in total).
- Existing AI/ML tests: **11 passed**, using the actual locked artifact. No AI/ML files changed.
- Frontend Node tests: **9 passed**. Type checking, production build and lint passed.
- Python compile checks and backend/`RiskService` imports passed. A Windows sandbox process-launch failure on a repeated compile check was resolved by rerunning with the existing Python execution approval.
- Simulation browser regressions: **passed**, all six modes, real numeric probabilities and all 20 initialized meters; zero recorded runtime/console errors. Repeated resets, scenario switches, stop, delayed stale-response rejection and reset-failure retry passed.
- Wider workspace browser acceptance: **passed**, including case lifecycle/notes, model integration, responsive simulation layout, 3D/2D drawers, exports, reduced motion and intentional backend-outage retry; zero recorded runtime errors.
- Reports/screenshots/logs: `logs/simulation-validation/` and `logs/workspace-validation/` (local ignored artifacts). Temporary server processes and databases were cleaned up by the suites.
- Non-blocking existing warnings: Starlette/AnyIO and Three.js deprecations, Node experimental TypeScript-transform notice, and Vite large-chunk warning. No dependencies were added to address unrelated warnings.

## Limits

- Single backend worker/process and one shared simulated territory; multiple tabs control the same streams. This is not a distributed scheduler or isolated multi-user simulator.
- All numeric scores are real full-history model results. They are not instantaneous anomaly scores, may remain similar between days, and need not rise for an operational fault/outage. If the model is unavailable, the UI retains a labeled previous score or explicitly reports unavailability; no fake numeric fallback exists.
- An initialized consumer has a model score; untouched illustrative preview consumers honestly remain “Not scored.” Selecting Whole Locality initializes and scores all 20 meters. Generic stored consumer APIs remain separate from the fixed locality projection.
- Independent stream clocks can produce genuinely missing dates in the shared window, especially after switching only one target. Latest consumer usage comes from that consumer's actual latest completed day, not another meter's calendar cursor. Missing data is never filled with zero.
- High Consumption lasts four simulated days and then recovers by design. The two drop modes share reduction detection; causes remain unverified. Meter Fault's implausible reported values represent faulty measurements, not the actual supply.
- Human-created cases and their evidence intentionally survive reset, so historical open-case counters can remain. Reset removes all generation and unfiled simulation events.
- No exhaustive cross-browser, distributed deployment or long-duration load testing is claimed.
