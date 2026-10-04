# Frontend overhaul — implementation and validation

Updated 4 October 2026. The repository now runs an integrated utility-operations workspace.

## 1. Files changed

The complete file manifest is below. Main changes:
- Replaced `src/App.tsx` and global `src/index.css`.
- Added `src/workspace/`: seven pages, two detail routes, shell, shared drawer/charts/UI, R3F scene, Cytoscape network, hooks, services, adapter, types, configuration and CSV export.
- Added backend canonical topology, operations projection/API, findings/case models and Alembic migration `0003_workspace`.
- Updated simulation target selection, legacy source mapping, episode IDs and transmission-failure terminology.
- Added operations/CSV/browser regression coverage; updated old browser smoke entry points.
- Replaced stale README/integration/simulation instructions.
- Removed obsolete pages, demo/profile UI, mocks, table/card/chart components, hooks, unused service and old stylesheet.

## 2. Dependencies

Added runtime: `@fontsource/inter`, `@react-three/fiber`, `@react-three/drei`, `three`, `cytoscape`, `gsap`, `lenis`.
Added development types: `@types/three`, `@types/cytoscape`.
Removed unused `clsx`, `tailwind-merge`, Tailwind/Vite plugin, Tailwind, autoprefixer and direct postcss dependency. Existing React Query, React Router, Recharts and Lucide remain.

No Python runtime dependencies were added. Playwright/Chromium were already available as optional QA tools. Prettier was run as a formatting utility, not added as an application dependency.

## 3. Frontend

- Inter typography; sapphire #0F52BA, deep navy, cyan and light neutral surfaces.
- Collapsible desktop sidebar, icon/tooltips on tablet, modal mobile navigation; seven primary entries only.
- No login, operator identity, avatar, profile selector or named activity.
- Overview: 20 consumers, 2 transformers, active anomalies, high-priority open cases; shared energy-balance calculations, 7/30-day ranges, residual and consumption trends, CSV, priority cases and recent findings.
- Locality: 20 lightweight houses and 2 transformers, connections, orbit/pan/zoom, hover/click inspection; stable draggable 2D network, path highlighting, shared drawer and accessible node list.
- Consumers: filterable, searchable, paginated table; Overview, Usage, Detection, Evidence and Cases tabs.
- Anomalies: immutable machine findings, New / Case Created state and focused four-tab detail.
- Cases: list/detail layout, persisted creation/statuses/notes, neutral activity timeline.
- Data Quality: explicit zero/null distinction, completeness, invalid/duplicate stored readings, missing-data trend, affected meters.
- Simulation: target/scenario controls, Start/Stop/Reset and visible simulated/active state.
- Subtle GSAP transitions; Lenis with native touch/keyboard support; hidden scrollbars and reduced-motion opt-out.
- Charts include meaningful axes and units, legend, tooltip and expandable accessible tabular data.
- Secondary model-info drawer displays only supported model metadata.

## 4. Backend/topology

Single source: `backend/app/core/topology.py`.
T1 → C01–C10. T2 → C11–C20. All frontend views consume the same operations response.

New operations API owns date alignment and residuals:
`residual = input − consumer sum`; `residual % = residual / input × 100`.
Null/invalid connected readings make the affected residual unavailable; zero stays zero.

Transformer input is explicitly **illustrative synthetic input**, calculated from independent synthetic baselines plus 4.5%. No actual transformer meter source exists. Baseline preview is also labeled illustrative; no model scores are fabricated.

Findings/cases are distinct persisted entities. One immutable finding is captured per run/scenario episode once existing detection rules or a saved model flag require review. Cases retain evidence through reset. A restart maps older owned demo aliases to canonical source IDs without discarding their histories.

Original generic history/risk/scoring APIs and original consumer records remain intact outside the configured simulated locality. The model, source package and exact 24-feature contract are unchanged.

Model SHA-256:
`9D3E2853E71D01D80F051520D858FA27D07F0026D1FFA8E8EFB97BA23E28EE02`

## 5. Routes

| Route | Behavior |
| --- | --- |
| /, /dashboard | Redirect to /overview |
| /overview | Default operations home |
| /locality | Shared 3D / 2D locality |
| /consumers, /consumers/:id | Directory and five-tab detail |
| /anomalies, /anomalies/:id | Machine finding queue/detail |
| /cases?case=ID | Investigation workspace |
| /data-quality | Quality summary and affected meters |
| /simulation | Simulation controls |
| /alerts | Redirect to /anomalies |
| /analytics, /system | Redirect to /overview; model info moved to secondary drawer |

## 6. Simulation limitations

The existing simulation-result algorithm was preserved. Drop and suspected-theft scenarios share reduction behavior; high consumption remains temporary. Risk scores need completed history and do not necessarily match a chosen scenario. Cause explanations remain unverified operational rules.

The scheduler still requires one worker, supports at most 20 owned streams and stops each at 90 simulated days. Independent simulated clocks can create missing dates in a shared window; those produce unavailable totals. Physical metering, ingestion rejection counters, distributed scheduling, calibrated cause confidence and a validated Inspection Priority Engine are not available.

## 7. Problem statement / deliverables

Repository inspection covered root instructions, backend prompt, integration/simulation/validation docs, backend schemas/routes/services/models/tests, frontend code, and AI/ML handoff/API/integration/model-card documents. **No separate problem-statement PDF, document or file was present.** An external PS therefore could not be independently certified.

All frontend-facing capabilities described in the supplied request are integrated. Unsupported cause probabilities, separate anomaly scores and calibrated cause confidence are explicitly unavailable. Transformer metering is represented only as labeled illustrative data. No replacement ML detector/classifier was invented.

Historical analysis, profiling comparisons, supported detection evidence, risk prioritization, case investigation, simulated updates and energy export are integrated into the requested sections.

## Validation

- `npm run typecheck`, `npm run lint`, `npm run build`: pass; lint has zero warnings/errors.
- `npm test`: **9 passed**, including selected-range CSV and existing transport/null-preservation contracts.
- Backend + unchanged AI/ML tests: **63 passed**.
- Python compile/import checks: pass.
- Real backend/Uvicorn → RiskService smoke: **8 endpoints passed**, 1,034-day history, saved scores and matching stored rescoring.
- `pip check`: no broken requirements.
- Browser acceptance uses temporary ports and a temporary database, preserving developer state. Covers all seven routes, exact topology/mappings, residual/CSV ranges, 3D/2D clicks and highlights, graph dragging, consumer filters/tabs, anomaly→case, every case action and persisted notes, real simulation/ML, null outage data, stop/reset, responsive layouts, touch/wheel/keyboard scrolling, hidden scrollbars, reduced motion and API-error retry.
- Screenshots/logs: ignored `logs/workspace-validation/`.
- Locked model hash unchanged; `git diff -- ai_ml` is empty.

Non-blocking upstream warnings: Vite's chunk-size advisory for chart/application and lazy 3D bundles; Three.js Clock deprecation through R3F; Starlette/AnyIO deprecation; Node's experimental type-transform notice. Heavy 3D/graph code is loaded only when needed. npm could not remove two old ignored native Tailwind cache binaries held by an existing process; package/lockfile cleanup and the build succeeded.

## Setup

Restart the backend after updating. With default DATABASE_AUTO_CREATE=true, new tables are added automatically. For an Alembic-managed database, upgrade to head using the activated environment. Run a single Uvicorn worker, then `npm run dev`; see [README](../README.md).

## Complete file manifest

```text
 M README.md
 M backend/app/db/models.py
 M backend/app/main.py
 M backend/app/schemas/simulation.py
 M backend/app/services/investigation_service.py
 M backend/app/services/simulation_service.py
 M backend/tests/test_migrations.py
 M backend/tests/test_simulation.py
 M docs/FRONTEND_BACKEND_INTEGRATION.md
 M docs/SIMULATION_MODE.md
 M docs/SIMULATION_VALIDATION.md
 M index.html
 M package-lock.json
 M package.json
 M public/favicon.svg
 M scripts/smoke_frontend.py
 M scripts/smoke_simulation.py
 D src/App.css
 M src/App.tsx
 D src/components/cards/EvidenceCard.tsx
 D src/components/cards/InvestigationSummary.tsx
 D src/components/cards/KpiCard.tsx
 D src/components/cards/ModelSignalCard.tsx
 D src/components/charts/ActualBaselinePeerChart.tsx
 D src/components/charts/AnomalyTrendChart.tsx
 D src/components/charts/CauseDistributionChart.tsx
 D src/components/charts/ConsumptionTrendChart.tsx
 D src/components/charts/HourlyHeatmapChart.tsx
 D src/components/charts/LiveMeterChart.tsx
 D src/components/charts/QualityTrendChart.tsx
 D src/components/charts/SeverityDistributionChart.tsx
 D src/components/common/AnomalyScoreBadge.tsx
 D src/components/common/CauseProbabilityList.tsx
 D src/components/common/ConfidenceBar.tsx
 D src/components/common/EmptyState.tsx
 D src/components/common/PageHeader.tsx
 D src/components/common/PipelineFlow.tsx
 D src/components/common/QueryState.tsx
 D src/components/common/RiskIndicator.tsx
 D src/components/common/SeverityBadge.tsx
 D src/components/common/StatusBadge.tsx
 D src/components/common/Timeline.tsx
 D src/components/layout/AppShell.tsx
 D src/components/layout/CaseDrawer.tsx
 D src/components/layout/GlobalSearchModal.tsx
 D src/components/layout/NotificationDrawer.tsx
 D src/components/layout/Sidebar.tsx
 D src/components/layout/SimulationPanel.tsx
 D src/components/layout/Topbar.tsx
 D src/components/tables/AlertTable.tsx
 D src/components/tables/AnomalyTable.tsx
 D src/components/tables/CaseTable.tsx
 D src/components/tables/ConsumerTable.tsx
 D src/components/tables/InvestigationTable.tsx
 D src/components/tables/QualityIssueTable.tsx
 D src/components/ui/badge.tsx
 D src/components/ui/button.tsx
 D src/components/ui/card.tsx
 D src/components/ui/input.tsx
 D src/components/ui/modal.tsx
 D src/components/ui/select.tsx
 D src/components/ui/skeleton.tsx
 D src/components/ui/tabs.tsx
 D src/hooks/index.ts
 D src/hooks/live.ts
 D src/hooks/simulation.ts
 M src/index.css
 D src/mocks/index.ts
 D src/pages/Alerts/index.tsx
 D src/pages/Analytics/index.tsx
 D src/pages/Anomalies/index.tsx
 D src/pages/AnomalyDetail/index.tsx
 D src/pages/Cases/index.tsx
 D src/pages/ConsumerDetail/index.tsx
 D src/pages/Consumers/index.tsx
 D src/pages/Dashboard/index.tsx
 D src/pages/DataQuality/index.tsx
 D src/pages/System/index.tsx
 D src/services/index.ts
 M src/types/index.ts
 M src/types/simulation.ts
 D src/utils/classNames.ts
 M vite.config.ts
?? backend/app/api/routes/operations.py
?? backend/app/core/topology.py
?? backend/app/services/operations_service.py
?? backend/migrations/versions/0003_workspace.py
?? backend/tests/test_operations.py
?? docs/FRONTEND_OVERHAUL.md
?? scripts/smoke_workspace.py
?? src/workspace/Consumers.tsx
?? src/workspace/DataQuality.tsx
?? src/workspace/Investigations.tsx
?? src/workspace/Locality.tsx
?? src/workspace/Network.tsx
?? src/workspace/NodeDrawer.tsx
?? src/workspace/Overview.tsx
?? src/workspace/Scene.tsx
?? src/workspace/Shell.tsx
?? src/workspace/Simulation.tsx
?? src/workspace/adapter.ts
?? src/workspace/config.ts
?? src/workspace/export.ts
?? src/workspace/format.ts
?? src/workspace/hooks.ts
?? src/workspace/service.ts
?? src/workspace/types.ts
?? src/workspace/ui.tsx
?? tests/workspace.test.mjs
```
