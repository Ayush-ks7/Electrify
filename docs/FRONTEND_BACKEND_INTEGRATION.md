# Frontend / backend integration

Validated on 2026-10-03. The existing React/TypeScript/Vite (`gargee`) shell,
navigation, colors, cards, table layout and consumer tabs are retained. Live views
now use FastAPI. No backend contracts, AI/ML sources, model artifacts, feature
definitions, or runtime dependencies were changed.

## Run locally

From the repository root, use the existing backend environment (see
[`backend/README.md`](../backend/README.md) for first-time setup):

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
npm ci
Copy-Item .env.example .env.local # only if you do not already have .env.local
npm run dev
```

Open **http://localhost:5173**. Vite uses that fixed origin and fails if the port
is occupied instead of silently choosing an origin the backend does not allow.
If these servers are already running, use the existing instances.

`VITE_API_BASE_URL` is a public backend origin (default `http://localhost:8000`),
without `/api/v1`. Restart Vite after changing it; production builds embed it.
Set `VITE_API_BASE_URL=` for a same-origin reverse proxy serving `/health` and
`/api/v1/*`. Deployments also need an SPA fallback for client-side routes.

The backend already permits `http://localhost:5173` through `CORS_ORIGINS`; no
backend CORS change was necessary. If you deliberately use another frontend
origin, explicitly add that origin in `backend/.env` and restart FastAPI. The
preview server's default origin is different and must also be configured.

Do not set an API key in `VITE_*`, JavaScript, or browser storage. Local direct
access works with the existing optional backend API key unset. If backend
`API_KEY` is enabled, use a trusted authenticated server proxy which holds and
injects it. A proxy/auth system is not introduced in this integration; denied
requests display a clear error.

## Screen / endpoint mapping

| Existing UI | Data source / behavior |
| --- | --- |
| Dashboard system status | `GET /health`, including degraded component statuses |
| Dashboard KPI cards, screening overview, priority table, recent predictions | `GET /api/v1/consumers` and `GET /api/v1/consumers/{id}/risk` |
| Dashboard consumption chart | `GET /api/v1/consumers/{id}/history` for the selected consumer |
| Consumers table, search, status/date filtering, sorting and pagination | Paginated consumer directory plus cached latest risk records |
| Global search modal | Same cached consumer directory; ID search; up to 50 matches |
| Consumer detail header | `GET /api/v1/consumers/{id}` |
| Overview and Usage & Profiling tabs | Stored daily history; chart and dated readings, including null and zero |
| Detection & ML Signals tab | Latest risk probability, saved threshold/status, data quality and explanation signals |
| Evidence & Timeline tab | Saved explanation signals, prediction ID/source/period/scope; no fabricated event timeline |
| Score Stored History button | `POST /api/v1/score-history` with `CONS_NO`, `stored: true`, explanations enabled; invalidates live caches after success |
| System diagnostics | `GET /health` and `GET /api/v1/model-info` |
| Typed scoring service | `POST /api/v1/score` and raw/stored `POST /api/v1/score-history`; no new feature-entry/upload form was added to the existing UI |

## Data meaning and limitations

- Probabilities are displayed as percentages. Screening uses the exact saved
  `screening_flag`, `status` and `screening_threshold`, not the mock UI's invented
  severity ranges. A model result is a review signal, never proof of theft.
- Dashboard counts and mean probability cover each consumer's latest saved
  prediction. They are not counts of incidents, alerts, confirmed theft or cases.
  Unscored consumers are excluded from the mean. Partial risk failures suppress
  aggregate risk figures and offer retry instead of presenting incomplete totals.
- Missing consumption stays `null`; recorded zero stays zero. Calendar gaps are
  shown as null chart gaps. No features, baselines or interpolated readings are
  calculated. Display windows cover 7/30/365 calendar days ending at the latest
  stored reading. The unsupported hourly option is disabled.
- The consumption chart is explicitly for one selected consumer. The API has no
  system aggregate or historical risk-trend endpoint; the other chart region
  shows counts by the saved screening status.
- Names, meter IDs, tariffs, addresses, service points, hourly usage, peer data,
  baseline deviations, cause attribution, model performance metrics and runtime
  throughput are unavailable. Live screens say so rather than inventing values.
- Anomalies/anomaly detail, Cases/Alerts, Analytics and Data Quality retain their
  existing sample UI with a prominent **Demo workspace** banner. Notifications
  and the operator profile are explicitly marked demo. Demo case changes and
  notification read state remain local storage only. Live consumer detail does
  not attach mock cases to real consumers.
- There is no data importer UI in the existing design. An empty backend produces
  zero consumer counts and an honest empty state. Populate it using existing
  scoring endpoints and documented backend payloads; the frontend does not seed
  or fabricate operational records.
- Consumer IDs are preserved and URL encoded. Reserved characters `:#?+%` were
  verified. IDs containing `/` remain subject to the existing backend path-route
  limitation; no backend routing contract was changed.
- All directory/history pages are fetched at the backend's 1000-row page limit.
  The v1 API has no bulk latest-risk endpoint or server search, so risk summaries
  require one lookup per consumer, at most six concurrently. Results share the
  existing React Query cache for 60 seconds; input changes filter locally and
  chart-window changes do not refetch history. There is no polling. Very large
  directories would benefit from a future server-side search/summary endpoint.

## Implementation files

New files:

- `.env.example`: public backend URL example.
- `src/services/api.ts`: single live HTTP client, pagination, timeouts, cancellation,
  backend error mapping and typed endpoints.
- `src/types/api.ts`: backend transport types and live consumer view types.
- `src/hooks/live.ts`: shared queries, bounded risk loading, refresh and rescoring.
- `src/utils/liveData.ts`: presentation mapping, honest summary counts and daily chart windows.
- `src/components/common/QueryState.tsx`: loading, empty, error and retry UI.
- `tests/frontend-api.test.mjs`: eight meaningful contract/presentation regression tests.
- `scripts/smoke_frontend.py`: isolated real-browser/full-stack acceptance checks.
- This document.

Modified files:

- `src/pages/{Dashboard,Consumers,ConsumerDetail,System}/index.tsx`.
- `src/components/tables/ConsumerTable.tsx`.
- `src/components/charts/ConsumptionTrendChart.tsx`.
- `src/components/layout/{AppShell,GlobalSearchModal,NotificationDrawer,Topbar}.tsx`.
- `src/hooks/index.ts` (live global search), `src/services/index.ts` (demo scope comment).
- `src/types/index.ts` (nullable chart values), `src/utils/formatters.ts` (missing consumption).
- `vite.config.ts`, `package.json` (test/typecheck commands), `README.md` (documentation link).

## Validation

```powershell
npm test
npm run typecheck
npm run lint
npm run build
.venv/Scripts/python.exe -m pytest -q backend/tests ai_ml/Electrify_AI_ML_Final/tests --import-mode=importlib
.venv/Scripts/python.exe -m compileall -q backend/app backend/scripts backend/migrations scripts/smoke_frontend.py
.venv/Scripts/python.exe backend/scripts/smoke.py
.venv/Scripts/python.exe -m pip check
```

Optional browser validation tooling (not application dependencies):

```powershell
.venv/Scripts/python.exe -m pip install playwright
.venv/Scripts/python.exe -m playwright install chromium
.venv/Scripts/python.exe scripts/smoke_frontend.py
```

- Frontend regression suite: **8 passed**, using Node 24's built-in test runner.
  Node emits an experimental type-transform warning; no test dependency was added.
- Type check and production build: **passed**. Vite reports its existing large
  bundle warning (about 917 kB minified / 260 kB gzip); route splitting was not
  added as unrelated architecture work.
- Lint: **exit 0**, 18 existing warnings in legacy/demo code (unused imports,
  render-time dates and synchronous effect state updates); no errors.
- Backend + unchanged AI/ML suite: **52 passed**, one upstream Starlette/AnyIO
  deprecation warning. Python compile/import checks and `pip check` passed.
- Existing backend smoke: **all eight endpoints passed** through Uvicorn and the
  real locked model, including feature/history inference, persistence and stored rescoring.
- Chromium acceptance: empty and populated dashboards, live directory/search,
  encoded ID navigation, 1034-day paginated history, null versus zero, chart
  windows, real explanations/data quality, stored rescoring, feature-only records,
  global search, model info and 390px mobile layout passed. Healthy flow: **zero
  browser console errors or warnings**, no CORS errors, no idle refetch loops.
- Fault injection checks cover missing consumers, API failure/retry, partial risk
  failures, denied access and missing saved predictions. CORS preflight passes
  for the test origin and rejects an untrusted origin.
- Browser reports/screenshots are generated under ignored
  `logs/frontend-validation/`. Each final run starts Vite and FastAPI on temporary
  ports with an isolated temporary SQLite database and cleans up its processes.
- An initial browser run hit an already-running frontend on port 5173. Its two
  `BROWSER-*` consumers, 1034 readings and three predictions were precisely
  identified and removed from the local DB, restoring its original empty state.
  The harness now uses temporary ports and asserts the frontend's backend URL
  before any writes. Existing developer servers were left running.
- Consumer navigation now resets tab and mutation state per ID, preventing a
  previous consumer's successful-scoring message from appearing on another record.

The locked model SHA-256 remains:

```text
9D3E2853E71D01D80F051520D858FA27D07F0026D1FFA8E8EFB97BA23E28EE02
```

`git diff -- ai_ml backend` is empty, including the locked 24-feature definitions.
The initial worktree was clean. Integration changes remain unstaged/uncommitted;
no commit or push was made. See `git status --short` and `git diff --stat` for the
complete final working-tree change list.
