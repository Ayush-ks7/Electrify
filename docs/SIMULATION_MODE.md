# Simulated locality

Updated 4 October 2026. Use one backend worker and the Simulation page.

## Controls

1. Target Whole Locality, Transformer, or Consumer.
2. Choose Normal, High Consumption, Sudden Consumption Drop, Suspected Theft Pattern, Meter Fault, or Meter Data Transmission Failure.
3. Start Simulation applies the selection. Selecting another option alone does not change an active run. Stop halts all initialized streams; Start resumes the same scenario. Changing a scenario starts a clean run for the selected meters, retaining only their original baseline. Reset exits simulation for all initialized streams and restores baseline preview. Reset is safe to repeat.

Reset removes generated histories, telemetry, model predictions, stream configuration, scheduling deadlines, legacy investigation rows and unfiled findings. Findings attached to human-created cases, their immutable evidence, statuses and notes remain. Consequently historical open cases can still appear in Overview after reset; they are not active meter generation.

The topology comes from `backend/app/core/topology.py`: T1 serves C01–C10 and T2 serves C11–C20. All views and selectors consume it through /operations. No browser timer fabricates live telemetry.

The UI uses the existing “fast” clock: six simulated hours per nominal two seconds. A full completed day normally takes four updates; load/model processing can slow this. The existing API also retains realistic and very_fast speeds for API clients/tests.

## Existing behavior retained

Synthetic 365-day histories initialize owned simulation copies, separate from original stored consumers. The baseline is fixed before simulation. Completed days enter the existing daily-history repository; a missing interval makes the whole day null. Actual zero stays zero.

Scoring runs on the stored baseline during initialization, then after every completed day. Full stored history goes through ScoringService → AIMLService → locked RiskService. The previous 30-observed-day scheduling gate was removed: the existing model input contract validates histories, and copied history must span at least two calendar days and have a positive baseline. Scenario labels never enter the model. No probability is forced to match a scenario.

Risk Score is the saved model review probability, displayed as a percentage in the consumer table, detail overview/detection, node drawer and simulation meter table. During partial days the last completed-history score remains visible. A failed scoring attempt retains the previous score and shows the error; if there has never been a successful score, the UI explicitly reports its absence rather than fabricating a number. Start retries failed scoring immediately; automatic retries occur at the next completed day.

High Consumption retains the temporary 2.5× load behavior. Sudden Consumption Drop and Suspected Theft Pattern use the existing reduction behavior, with no new classifier. Fault/outage evidence takes precedence in existing cause rules. The UI never treats an outage as theft.

The backend scheduler continues without an open browser. Streams resume paused after server restart. Existing owned demo aliases adopt canonical source IDs on startup while preserving history. A new run ID distinguishes reset/restarted or switched scenario evidence. Telemetry includes the run ID, scenario and original consumer ID. Random waveforms are seeded by source/date/hour, so ticks within the same hour and changes in speed preserve the waveform. Repeated Start on an unchanged scenario neither resets its cursor nor forces an extra tick.

Start, generation, control, workspace snapshots and manual history scoring share the scheduler lock. Browser mutations suspend polling, cancel earlier reads, replace the authoritative status, clear all workspace date-window caches, then fetch current data. Only the application shell polls simulation status; no frontend loop generates data.

## Existing scenario mapping

All six modes below are implemented in the backend and exposed by the UI. Each targets existing consumers/meters directly, a transformer's connected consumers, or the whole locality. There is no separate feeder model or feeder simulator.

| Mode / UI label | Generated condition | Connected transformer supply | Existing detection and UI |
| --- | --- | --- | --- |
| `normal` / Normal | Seeded daily load shape; 225–235 V, online, normal meter | Follows generated consumption plus 4.5% | Normal operational telemetry; actual saved ML probability still visible |
| `legitimate_abnormal` / High Consumption | 2.5× load for four completed days, then recovery; voltage and communication remain normal | Rises and recovers with actual load | Reported temporary load change, Review priority; recovery phase displayed |
| `sudden_drop` / Sudden Consumption Drop | Recorded consumption becomes 22% of baseline profile; online and healthy meter | Actual supply decreases with the load | Consumption change initially; persistent-reduction rule after three completed low days; cause unverified |
| `tampering` / Suspected Theft Pattern | Same 22% recorded profile, representing under-reporting; healthy-looking meter telemetry | Actual supply remains at normal load, so residual increases | Same reduction rules as sudden drop; no cause classifier or theft proof |
| `meter_fault` / Meter Fault | Fault flag, faulty 420 V reading, alternating zero and 12× reported power | Actual supply stays normal; measured meter output is explicitly unreliable | Meter malfunction suspected, High priority; faulty readings are not physical supply voltage |
| `communication_failure` / Meter Data Transmission Failure | Offline; voltage/current/power/energy are null; any missing interval makes the completed day null | Actual supply remains normal; consumer sum/residual are unavailable | Transmission failure, High priority; missing values stay null, never zero |

All nonselected meters retain their current state. A transformer changes only through its connected meters. Source consumer records are never changed. Probability in every row above is independently computed by the locked model on stored history, not assigned by these operational rules; an urgent fault/outage need not have a high theft-screening probability.

## Known limitations

- Simulation results were not redesigned or recalibrated. The two drop scenarios share reduction logic.
- Single backend worker, at most 20 owned streams, maximum 90 simulated days per stream.
- Independent stream clocks can leave gaps in the shared latest calendar window. Energy totals become unavailable when any connected meter is missing.
- Transformer input uses generated supply accumulated before meter faults/under-reporting, plus 4.5%. Before simulation it uses illustrative baseline input. It is never measured transformer energy or an ML feature.
- Cause explanations and severity are operational rules, not trained/calibrated cause probabilities or an Inspection Priority Engine.
- The model is validated for full-history classification, not instantaneous or early-warning detection.
- No physical meters, MQTT/WebSockets, distributed scheduling, authentication, assignments or external alert delivery.
- Unfiled findings follow current detection evidence and disappear on operational recovery if the model does not still flag review. Creating a case freezes its evidence. Historical case evidence is retained through reset.
- Original arbitrary consumer records stay accessible through the unchanged generic APIs; they do not expand the configured 20-consumer locality.

See [simulation audit and validation](SIMULATION_VALIDATION.md). `scripts/smoke_simulation.py` exercises all six scenarios and lifecycle regressions; `scripts/smoke_workspace.py` covers the wider workspace, cases and responsive views.
