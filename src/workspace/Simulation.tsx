import { useState } from "react";
import { Link } from "react-router-dom";
import type { Scenario } from "../types/simulation";
import {
  useWorkspace,
  useSimulationState,
  useSimulationControls,
} from "./hooks";
import { scenarios } from "./config";
import { Badge, Header, Panel, QueryGate } from "./ui";
import { RiskScore } from "./RiskScore";
export default function Simulation() {
  const query = useWorkspace();
  const [target, setTarget] = useState("Whole Locality");
  const [node, setNode] = useState("");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const state = useSimulationState();
  const data = query.data;
  const ids = data
    ? target === "Whole Locality"
      ? data.consumers.map((c) => c.id)
      : target === "Transformer"
        ? (data.transformers.find((t) => t.id === node)?.consumers ?? [])
        : node
          ? [node]
          : []
    : [];
  const mutation = useSimulationControls(ids, scenario);
  const reset = () => {
    // Reset the draft in the click event, never in a later response callback
    // that could overwrite the user's next target selection.
    setTarget("Whole Locality");
    setNode("");
    setScenario("normal");
    mutation.mutate("reset");
  };
  const streams = state.data?.streams ?? [];
  const running = streams.filter((s) => s.state === "running");
  return (
    <>
      <Header
        title="Simulation"
        description="Explore meter scenarios in an explicitly simulated service territory."
      />
      {query.error && <div className="notice error" role="alert">
        Workspace data is unavailable. You can still reset the simulation.
        <button disabled={mutation.isPending} onClick={reset}>Reset</button>
        {mutation.error && <p>{mutation.error.message}</p>}
      </div>}
      <QueryGate query={query}>
        {data && (
          <div className="simulation-layout">
            <Panel>
              <div className="sim-steps">
                <div className="sim-status">
                  <h2>Meter simulation</h2>
                  <Badge tone={running.length ? "green" : "blue"}>
                    {state.isPending ? "Checking simulation…" : running.length
                      ? "Simulation Active"
                      : streams.length ? "Simulation Stopped" : "Simulation Off"}
                  </Badge>
                </div>
                <label className="field">
                  <span>
                    <span className="step-number">1</span>Choose a target
                  </span>
                  <select
                    disabled={mutation.isPending}
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      setNode(
                        e.target.value === "Transformer"
                          ? data.transformers[0]?.id ?? ""
                          : e.target.value === "Consumer"
                            ? data.consumers[0]?.id ?? ""
                            : "",
                      );
                    }}
                  >
                    <option>Whole Locality</option>
                    <option>Transformer</option>
                    <option>Consumer</option>
                  </select>
                </label>
                {target !== "Whole Locality" && (
                  <label className="field">
                    {target}
                    <select
                      disabled={mutation.isPending}
                      aria-label={target}
                      value={node}
                      onChange={(e) => setNode(e.target.value)}
                    >
                      {(target === "Transformer"
                        ? data.transformers
                        : data.consumers
                      ).map((n) => (
                        <option key={n.id}>{n.id}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  <span>
                    <span className="step-number">2</span>Choose a scenario
                  </span>
                  <select
                    disabled={mutation.isPending}
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value as Scenario)}
                  >
                    {scenarios.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {ids.length} consumer{ids.length === 1 ? "" : "s"} selected
                </p>
                <p>Choose a scenario, then Start to apply it. A changed scenario starts a clean run for the selected meters. Stop and Reset apply to all initialized meters.</p>
                <div className="action-row">
                  <button
                    className="primary"
                    disabled={mutation.isPending || !ids.length || !state.data}
                    onClick={() => mutation.mutate("start")}
                  >
                    Start Simulation
                  </button>
                  <button
                    disabled={mutation.isPending}
                    onClick={reset}
                  >
                    Reset
                  </button>
                  {running.length > 0 && (
                    <button
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate("stop")}
                    >
                      Stop
                    </button>
                  )}
                </div>
                {mutation.error && (
                  <div className="notice error" role="alert">
                    {mutation.error.message}
                  </div>
                )}
                {state.error && (
                  <div className="notice error" role="alert">
                    {state.error.message}
                    <button onClick={() => state.refetch()}>Retry</button>
                  </div>
                )}
                {mutation.isSuccess && (
                  <div className="notice success" role="status">
                    {mutation.variables === "reset" ? "Simulation reset. Baseline preview restored."
                      : mutation.variables === "stop" ? "Generation stopped. Readings retained until Reset."
                      : "Selected scenario applied."}
                  </div>
                )}
              </div>
              <div className="sim-copy">
                <p>
                  Accelerated simulated time. Scoring uses completed daily
                  history and refreshes daily; partial days retain the last saved score.
                  Reset removes generated streams and unfiled findings; evidence
                  attached to human-created cases remains.
                </p>
              </div>
            </Panel>
            <div>
              <Panel
                title="Simulation scope"
                subtitle="One shared locality across every view"
              >
                <div className="panel-body">
                  {data.transformers.map((t) => (
                    <div key={t.id}>
                      <h3>
                        {t.id} · {t.consumers.length} consumers
                      </h3>
                      <div className="node-chips">
                        {t.consumers.map((cid) => (
                          <button
                            key={cid}
                            disabled={mutation.isPending}
                            className={ids.includes(cid) ? "selected" : ""}
                            onClick={() => {
                              setTarget("Consumer");
                              setNode(cid);
                            }}
                          >
                            {cid}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="What to expect">
                <div className="panel-body">
                  <p>
                    Generated readings flow through the existing data-quality
                    checks, telemetry rules, and locked full-history model.
                    Scenario labels never determine a risk score.
                  </p>
                  <h3>
                    {running.length} active · {streams.length} initialized
                    meters
                  </h3>
                  <p>
                    High consumption lasts four simulated days, then recovers. Drop
                    scenarios use the existing reduction behavior; their causes
                    remain unverified.
                  </p>
                  <div className="action-row">
                    <Link className="button-link" to="/locality">
                      View locality →
                    </Link>
                    <Link className="button-link" to="/anomalies">
                      Review findings →
                    </Link>
                  </div>
                  {streams.length > 0 && <div className="table-scroll">
                    <table aria-label="Simulation meters">
                      <thead><tr><th>Consumer</th><th>Active scenario</th><th>State / simulated time</th><th>Risk Score</th></tr></thead>
                      <tbody>{streams.map((s) => <tr key={s.consumer_id}>
                        <td>{s.source_consumer_id}<span className="subcell">Run {s.run_id.slice(0, 8)}</span></td>
                        <td>{scenarios.find((option) => option.value === s.scenario)?.label ?? s.scenario}
                          {s.scenario === "legitimate_abnormal" && s.completed_days >= 4 && <span className="subcell">Recovery phase</span>}
                        </td>
                        <td>{s.state}<span className="subcell">{s.cursor} · {s.completed_days} completed days</span></td>
                        <td>
                          {(() => {
                            const c = data.consumers.find(
                              (c) => c.id === s.source_consumer_id,
                            );
                            const info = c?.investigation
                              ? {
                                  ...c.investigation,
                                  scenario: s.scenario,
                                  simulated: true,
                                }
                              : null;
                            return <RiskScore info={info} />;
                          })()}
                        </td>
                      </tr>)}</tbody>
                    </table>
                  </div>}
                  {streams
                    .filter((s) => s.last_error)
                    .map((s) => (
                      <div className="notice error" key={s.consumer_id}>
                        {s.source_consumer_id}: {s.last_error}
                      </div>
                    ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </QueryGate>
    </>
  );
}
