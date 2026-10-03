# Virtual IoT Simulation Mode

This extends the original Backend v1 scope at the user's request. The locked AI/ML package, artifact, and 24-feature contract remain unchanged. No frontend timer generates telemetry, no new model is trained, and no scenario label is passed into inference.

## Run the demo

Restart the backend to load the new routes and tables, and run the existing Vite frontend:

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
npm run dev
```

Use **one backend process/worker per database**. The existing default `DATABASE_AUTO_CREATE=true` adds the three new tables without modifying existing consumer/history/prediction tables. For a database managed with Alembic instead, run `alembic -c backend/alembic.ini upgrade head` from the activated environment. Do not stamp a pre-existing unversioned database blindly; follow the backend's existing migration guidance.

1. Open Overview and click the blue **Simulation Mode** button at bottom right.
2. Select Normal, Theft / Tampering, Meter Malfunction, Communication Failure, or Legitimate Abnormal Consumption.
3. Select one or several consumers, or select the predefined five-consumer demo group.
4. Choose Fast demo or Very fast and Start. **Run mixed demo** assigns one scenario to each of the five demo consumers in scenario-list order.
5. Watch the same investigation table, live power chart, completed daily history, fixed baseline, and saved model signals update automatically.
6. Open a consumer for supporting evidence, model explanations, data quality, and saved case status.
7. Pause or Stop all, or use the individual stream controls. Start/Resume continues the stored cursor and can change that consumer's scenario/speed. Reset Simulation removes all owned demo copies and their histories, telemetry, predictions and case statuses.

Selections of existing consumers create deterministic `SIM-…` copies of their stored histories. Source consumer data is never modified. The demo group receives explicitly synthetic 365-day normal history. Changing a scenario continues the existing copy; reset before a fresh baseline experiment. Start is atomic across the selected targets, with a maximum of 20 owned copies.

## Architecture and data flow

```text
FastAPI lifespan → one background meter scheduler
  → independent persisted stream cursors and scenario state
  → timestamped interval telemetry in meter_readings
  → complete daily aggregates through ConsumerRepository
  → existing ScoringService → AIMLService → locked RiskService
  → existing immutable predictions + investigation workflow state
  → normal REST API → React Query polling → existing dashboard/detail components
```

`simulation_streams` records ownership, baseline provenance, cursor, state, scenario, speed, partial-day accumulation and scoring progress. `meter_readings` holds virtual interval timestamps, real server arrival timestamps, voltage, current, power, interval energy, meter status and communication status. `investigations` holds one workflow status per consumer. Existing `Consumer`, `DailyReading`, and `Prediction` tables/repositories are reused.

The scheduler is independent of browser activity. A process-local lock serializes generation and controls; telemetry, daily aggregate and cursor advancement commit together. Model scoring happens after this ingestion commit, so model unavailability does not discard readings. Scoring failures are shown in the UI and retried after the next completed day. Streams are recovered **paused** after a backend restart, preserving their cursor and partial day. Pause/Stop retain evidence. Shutdown joins the worker before disposing database connections.

Polling is every two seconds while the page is visible. Simulation progress invalidates cached history; investigation and interval telemetry queries also poll. Controls cancel in-flight reads and briefly suspend polling; the consumer membership list refreshes before history polling resumes after reset. React Query handles retries/errors and shares requests across dashboard, alerts and details. No WebSocket, broker or extra infrastructure is introduced.

## Time and scoring contract

| Speed | Wall time per scheduler step | Virtual time advanced |
| --- | --- | --- |
| Realistic | 60 seconds | 1 minute |
| Fast demo | 2 seconds | 6 hours |
| Very fast | 1 second | 24 hours |

The first step is immediate. Generation divides accelerated steps into hourly intervals; realistic steps are minute intervals, split correctly at hour/day boundaries even after speed changes. These are accelerated virtual clocks, not claims that 24 actual hours have elapsed. Under scoring/DB load, wall cadence is best effort and never catches up by fabricating missed wall-clock readings. Dates can advance into the future; virtual UTC time and real receipt time are separate. Each copy stops automatically at 90 completed simulated days.

Power uses a daily load profile with morning/evening peaks and deterministic small random fluctuations; interval kWh equals power × interval duration. Current uses the generated voltage and an assumed 0.95 power factor. The baseline is the mean of valid non-negative consumption among the source's last 30 stored dates, fixed before simulation. It is a descriptive comparison only, not a newly engineered model feature or forecast.

Only completed days enter `DailyReading`. Any missing interval makes the entire completed daily aggregate `null`; incomplete days are never presented to the full-history model as complete days. An outage's null record represents a missing expected interval/status observation, not a received meter payload. Genuine observed zero values remain zero.

Automatic scoring starts after the first newly completed day if the full stored history has at least 30 observed days, then repeats every seven completed simulated days. The 30-day gate is a conservative **demo scheduling policy**, not a validated model minimum or assurance of statistical adequacy. The predefined group already contains 365 synthetic historical days. Original histories with fewer observed days continue to accumulate without automatic scores until eligible. Full stored history, including calendar gaps, goes through the existing scoring service. `CONS_NO` remains an identifier; scenario, telemetry statuses, source labels, and investigation statuses never become model features.

Scores and feature-sensitivity explanations are actual locked model outputs. A short synthetic reduction may not move a full-history classifier much or cross its screening threshold. No score is forced to fit the chosen scenario. The UI displays scored period, missing/observed days, saved threshold, warnings, and the review-only disclaimer.

## Scenario behavior and interpretation

| Scenario | Generated behavior | Operational explanation |
| --- | --- | --- |
| Normal | Daily baseline/profile plus small fluctuations; online; normal meter | No telemetry rule alert unless actual saved ML output flags review |
| Theft / Tampering | Persistent ~78% reduction, online, no fault flag | Early change under observation; after three complete days below 50% baseline, tampering is one unverified hypothesis alongside occupancy/load changes |
| Meter Malfunction | Fault flag, implausible 420 V, alternating excessive and zero readings | Meter malfunction suspected; service meter and validate data before interpreting risk |
| Communication Failure | Offline; voltage/current/power/energy all null; daily consumption null | Restore communication, verify missing intervals; no theft inference from missingness |
| Legitimate Abnormal | Temporary 2.5× load for four simulated days, then normal load | Simulator supplies an explicitly unverified load-change report; confirm context and monitor recovery |

Operational cause hypotheses are derived from telemetry, descriptive comparisons and explicit load context, with fault/outage precedence over reduction rules. They are separate from the full-history model probability. Confidence is qualitative evidence provenance, never a fabricated percentage. `anomaly_score` and numeric `cause_confidence` remain nullable extension fields and are currently null. Inspection priority is a transparent operational rule label (`High`, `Review`, `Routine`), not a newly implemented ML priority engine.

New operational/ML review findings create a persisted `Requires Review` record. Operators can set `Under Investigation`, `Dismissed`, or `Resolved`. Normal consumers without a case show Monitoring. Automatic refresh never overwrites operator status or automatically reopens a resolved case. Ongoing evidence remains visible even after resolution; event-based reopening/audit trails are not implemented.

## API

All endpoints use the existing `/api/v1` API-key dependency and CORS configuration. No browser API key is added; use the existing trusted proxy setup if authentication is configured.

| Method | Endpoint | Request / purpose |
| --- | --- | --- |
| GET | `/simulation` | All owned streams and demo/scheduling limits |
| POST | `/simulation/start` | `{ "targets": [{ "consumer_id": "demo:1", "scenario": "normal" }], "speed": "fast" }`; accepts source IDs or existing simulation IDs |
| POST | `/simulation/pause` | `{ "consumer_ids": [] }`; empty means all owned streams |
| POST | `/simulation/stop` | Same selection; preserves cursor and evidence |
| POST | `/simulation/reset` | Same selection; deletes only consumers proven owned by `simulation_streams` |
| GET | `/investigations?limit=100&offset=0` | Unified consumer/telemetry/risk/evidence/status records |
| GET | `/investigations/{consumer_id}` | One unified detail record |
| POST | `/investigations/{consumer_id}/status` | `{ "status": "Under Investigation" }` |
| GET | `/consumers/{consumer_id}/telemetry?limit=96` | Most recent intervals, returned chronologically (max 1000) |

The existing `/consumers`, `/history`, `/risk`, `/score-history`, health and model-info APIs continue working. There is no public arbitrary telemetry-ingestion endpoint; the trusted internal scheduler is the ingestion source for this phase.

## UI changes and remaining scope

Existing typography, colors, spacing, card/table/select/button primitives, header and sidebar shell are preserved. Overview remains the main dashboard. The directory reuses the same investigation table; the existing consumer detail route consolidates readings, history, baseline, risk, causes, evidence and status. The notification button opens the same live review records. Legacy Cases, Anomalies and Alerts routes redirect to Investigations. Legacy Analytics/Data Quality sample routes redirect to the live dashboard/directory; their old source files remain unused, not displayed as live capabilities.

Still unsupported: trained cause classification, calibrated cause confidence, separate anomaly detector/score, validated Inspection Priority Engine, service-point/category/feeder/transformer metadata, peer/network loss analysis, physical meter transport/MQTT, authentication roles, durable external scheduling, distributed workers, investigation assignments/notes/audit history, case reopening, and production alert delivery. These are documented extension points, not filled with fake values. Extend `InvestigationService` for verified metadata or a real cause/priority service and introduce an authenticated ingestion adapter before supporting physical meters.

Still synthetic/mock: all generated telemetry; the predefined group's seeded histories; simulator-provided legitimate-load context; and the existing static “Demo profile” in the top bar. The old unused sample screens/services remain in the source tree. Live dashboard, investigation, notification, history, status and scoring data come from the backend/database; probabilities and explanations are not mocked.

Prototype limits: one local backend worker, 20 owned copies, 90 simulated days per copy, uncalibrated rules, no production-scale investigation query optimization/retention policy, partial/outage days conservatively null, no intermittent reconnection/backfill scenario, and no guarantee that synthetic data matches the model's training distribution. Reset is demo-only deletion; it leaves original histories and their predictions intact.

Validation results and the exact task file manifest are recorded in [SIMULATION_VALIDATION.md](SIMULATION_VALIDATION.md).
