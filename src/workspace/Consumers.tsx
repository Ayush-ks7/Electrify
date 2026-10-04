import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace, useStoredScore } from "./hooks";
import { cause, latest, risk, status, usageTrend } from "./service";
import { date, number } from "./format";
import {
  Badge,
  Chart,
  Empty,
  Header,
  Metrics,
  Panel,
  QueryGate,
  Tabs,
} from "./ui";
import type { Consumer, Workspace } from "./types";
import { RiskScore } from "./RiskScore";
export function Consumers() {
  const query = useWorkspace();
  const data = query.data;
  const [search, setSearch] = useState("");
  const [transformer, setTransformer] = useState("");
  const [riskFilter, setRisk] = useState("");
  const [state, setState] = useState("");
  const [causeFilter, setCause] = useState("");
  const [page, setPage] = useState(0);
  const rows =
    data?.consumers.filter(
      (c) =>
        `${c.id} ${c.meter}`.toLowerCase().includes(search.toLowerCase()) &&
        (!transformer || c.transformer === transformer) &&
        (!riskFilter || risk(c) === riskFilter) &&
        (!state || status(c) === state) &&
        (!causeFilter || cause(c) === causeFilter),
    ) ?? [];
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 10) - 1),
  );
  return (
    <>
      <Header
        title="Consumers"
        description="Find a meter, understand its consumption, and review its signals."
        actions={
          <Badge>{data?.consumers.length ?? "…"} connected consumers</Badge>
        }
      />
      <QueryGate query={query}>
        {data && (
          <Panel>
            <div className="filters">
              <label className="search">
                Search
                <input
                  placeholder="Consumer or meter ID"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                Transformer
                <select
                  value={transformer}
                  onChange={(e) => setTransformer(e.target.value)}
                >
                  <option value="">All transformers</option>
                  {data.transformers.map((t) => (
                    <option key={t.id}>{t.id}</option>
                  ))}
                </select>
              </label>
              <label>
                Risk
                <select
                  value={riskFilter}
                  onChange={(e) => setRisk(e.target.value)}
                >
                  <option value="">All risk levels</option>
                  {["High", "Review", "Low", "Not scored"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {["Anomaly detected", "Monitoring", "Baseline preview"].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Likely Cause
                <select
                  value={causeFilter}
                  onChange={(e) => setCause(e.target.value)}
                >
                  <option value="">All causes</option>
                  {[...new Set(data.consumers.map(cause))].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="table-scroll">
              <table aria-label="Consumers">
                <thead>
                  <tr>
                    {[
                      "Consumer",
                      "Meter",
                      "Transformer",
                      "Current Usage",
                      "Risk Score",
                      "Status",
                      "Last Reading",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice(currentPage * 10, currentPage * 10 + 10)
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link to={`/consumers/${c.id}`}>{c.id}</Link>
                          <span className="subcell">{c.source}</span>
                        </td>
                        <td>{c.meter}</td>
                        <td>{c.transformer}</td>
                        <td>{number(latest(c), "kWh/day")}</td>
                        <td>
                          <RiskScore info={c.investigation} />
                          <span className="subcell">
                            {c.investigation?.simulated
                              ? "Simulation risk score"
                              : "Model review score"}
                          </span>
                          <Badge>{risk(c)}</Badge>
                        </td>
                        <td>
                          <Badge>{status(c)}</Badge>
                        </td>
                        <td>
                          {c.backend_id
                            ? date(
                                c.investigation?.latest_reading?.timestamp ??
                                  c.history.at(-1)?.date,
                              )
                            : "No received reading"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!rows.length && <Empty>No consumers match these filters.</Empty>}
            <div className="pagination">
              <span>
                {rows.length} consumers · Page {currentPage + 1} of{" "}
                {Math.max(1, Math.ceil(rows.length / 10))}
              </span>
              <div>
                <button
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </button>
                <button
                  disabled={(currentPage + 1) * 10 >= rows.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </Panel>
        )}
      </QueryGate>
    </>
  );
}
export function ConsumerDetail() {
  const { id } = useParams();
  const query = useWorkspace();
  const consumer = query.data?.consumers.find((c) => c.id === id);
  return (
    <QueryGate query={query}>
      {consumer && query.data ? (
        <ConsumerWorkspace key={id} consumer={consumer} data={query.data} />
      ) : (
        <Empty>
          Consumer not found. <Link to="/consumers">Back to consumers</Link>
        </Empty>
      )}
    </QueryGate>
  );
}
function ConsumerWorkspace({
  consumer: c,
  data,
}: {
  consumer: Consumer;
  data: Workspace;
}) {
  const [tab, setTab] = useState("Overview");
  const score = useStoredScore(c.backend_id);
  const info = c.investigation;
  const saved = info?.prediction?.score.results[0];
  const related = data.cases.filter(
    (cs) =>
      data.anomalies.find((a) => a.id === cs.anomaly_id)?.consumer === c.id,
  );
  return (
    <>
      <Link className="text-link" to="/consumers">
        ← Consumers
      </Link>
      <Header
        eyebrow={`${c.transformer} / ${c.meter}`}
        title={`Consumer ${c.id}`}
        description={`${c.source} · Consumption is shown in kWh per completed day.`}
        actions={<Badge>{status(c)}</Badge>}
      />
      <Tabs
        values={["Overview", "Usage", "Detection", "Evidence", "Cases"]}
        value={tab}
        onChange={setTab}
      />
      <div role="tabpanel">
        {tab === "Overview" && (
          <>
            <Metrics
              items={[
                {
                  label: "Current Usage",
                  value: number(latest(c)),
                  foot: "kWh / completed day",
                },
                {
                  label: "Historical Baseline",
                  value: number(c.baseline),
                  foot: "kWh / day · fixed descriptive reference",
                },
                {
                  label: "Risk / Priority",
                  value: risk(c),
                  foot: "Operational rules + saved screening flag",
                },
                {
                  label: "Risk Score",
                  value: <RiskScore info={info} />,
                  foot: "Full-history locked model",
                },
              ]}
            />
            <div className="detail-grid">
              <Panel
                title="Likely cause"
                subtitle="Operational hypothesis · requires verification"
              >
                <div className="panel-body">
                  <h3>{cause(c)}</h3>
                  <p>
                    {info?.recommended_action ??
                      "Start a simulated meter to generate readings and detection evidence."}
                  </p>
                  <div className="notice" style={{ marginTop: 20 }}>
                    A model probability prioritizes review. It does not confirm
                    theft.
                  </div>
                </div>
              </Panel>
              <Panel title="Consumer profile">
                <div className="panel-body">
                  <dl className="detail-list">
                    <dt>Meter</dt>
                    <dd>{c.meter}</dd>
                    <dt>Transformer</dt>
                    <dd>{c.transformer}</dd>
                    <dt>Data source</dt>
                    <dd>{c.source}</dd>
                    <dt>Reading date</dt>
                    <dd>
                      {c.backend_id
                        ? date(c.history.at(-1)?.date)
                        : "Illustrative baseline only"}
                    </dd>
                    <dt>Anomaly status</dt>
                    <dd>{status(c)}</dd>
                  </dl>
                </div>
              </Panel>
            </div>
          </>
        )}
        {tab === "Usage" && (
          <>
            <Panel
              title="Consumption history"
              subtitle="Last 30 calendar days · missing readings appear as gaps"
            >
              <Chart
                title="Actual consumption, baseline & peer average"
                data={usageTrend(c, data)}
                lines={[
                  {
                    key: "consumption",
                    name: c.backend_id
                      ? "Actual simulated consumption"
                      : "Illustrative consumption",
                    color: "#0f52ba",
                  },
                  {
                    key: "baseline",
                    name: "Historical baseline",
                    color: "#93a4bc",
                    dashed: true,
                  },
                  {
                    key: "peer",
                    name: "Connected peer average",
                    color: "#2599b5",
                  },
                ]}
                height={310}
              />
              <div className="source-note">
                Peer average excludes this consumer and uses the other connected
                meters. Baseline and peer values are descriptive comparisons,
                not model features or forecasts.
              </div>
            </Panel>
            <Metrics
              items={[
                {
                  label: "Observed Days",
                  value: c.history.filter((p) => p.consumption !== null).length,
                },
                {
                  label: "Missing Days",
                  value: c.history.filter((p) => p.consumption === null).length,
                },
                {
                  label: "Zero Readings",
                  value: c.history.filter((p) => p.consumption === 0).length,
                },
                {
                  label: "Latest Change",
                  value: number(info?.deviation_pct, "%"),
                  foot: "Against fixed pre-simulation baseline",
                },
              ]}
            />
          </>
        )}
        {tab === "Detection" && (
          <>
            <Panel
              title="Detection & model signals"
              subtitle="Only saved backend model outputs are displayed"
              action={
                <button
                  disabled={!c.backend_id || score.isPending}
                  onClick={() => score.mutate()}
                >
                  {score.isPending ? "Scoring…" : "Score stored history"}
                </button>
              }
            >
              <div className="panel-body">
                {score.error && (
                  <div className="notice error" role="alert">
                    {score.error.message}
                  </div>
                )}
                {score.isSuccess && (
                  <div className="notice success" role="status">
                    Saved model result updated.
                  </div>
                )}
                <dl className="detail-list">
                  <dt>
                    Risk Score{" "}
                    {info?.simulated ? "(simulation)" : "· model review score"}
                  </dt>
                  <dd>
                    <RiskScore info={info} />
                  </dd>
                  {info?.simulated && info?.review_probability != null && (
                    <>
                      <dt>Raw ML model probability</dt>
                      <dd>{number(info.review_probability * 100, "%")}</dd>
                    </>
                  )}
                  <dt>Saved threshold</dt>
                  <dd>
                    {number(
                      saved?.screening_threshold == null
                        ? null
                        : saved.screening_threshold * 100,
                      "%",
                    )}
                  </dd>
                  <dt>Screening status</dt>
                  <dd>{saved?.status ?? "Not scored"}</dd>
                  <dt>Anomaly score</dt>
                  <dd>Unavailable · no separate detector score</dd>
                  <dt>Confidence</dt>
                  <dd>{info?.cause_evidence_confidence ?? "Unavailable"}</dd>
                  <dt>Likely cause probabilities</dt>
                  <dd>Unavailable · no trained cause classifier</dd>
                  <dt>Scored period</dt>
                  <dd>
                    {info?.prediction
                      ? `${date(info.prediction.period_start)} – ${date(info.prediction.period_end)}`
                      : "Not scored"}
                  </dd>
                </dl>
                {saved?.explanation?.top_signals.length ? (
                  <ul className="evidence-list">
                    {saved.explanation.top_signals.map((s) => (
                      <li key={s.feature}>
                        <strong>{s.feature}</strong>: {s.description} (
                        {s.direction.replaceAll("_", " ")})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No saved model signals yet.</p>
                )}
                {info?.prediction?.score.history_warnings.map((w) => (
                  <div className="notice" key={w}>
                    {w}
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
        {tab === "Evidence" && (
          <div className="detail-grid">
            <Panel title="Evidence in plain language">
              <div className="panel-body">
                {info?.evidence.length ? (
                  <ul className="evidence-list">
                    {info.evidence.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  <Empty>No detection evidence has been generated.</Empty>
                )}
              </div>
            </Panel>
            <Panel title="Evidence timeline">
              <div className="panel-body">
                <div className="timeline">
                  {info?.detection_start && (
                    <div className="timeline-item">
                      <strong>Scenario observations began</strong>
                      <small>
                        {date(info.detection_start)} · simulated time
                      </small>
                    </div>
                  )}
                  {info?.prediction && (
                    <div className="timeline-item">
                      <strong>Model result saved</strong>
                      <small>
                        {date(info.prediction.created_at)} · server time
                      </small>
                    </div>
                  )}
                  {data.anomalies
                    .filter((a) => a.consumer === c.id)
                    .map((a) => (
                      <div className="timeline-item" key={a.id}>
                        <Link to={`/anomalies/${a.id}`}>{a.id} detected</Link>
                        <small>{date(a.detected_at)}</small>
                      </div>
                    ))}
                </div>
                {!info && <Empty>No recorded events.</Empty>}
              </div>
            </Panel>
          </div>
        )}
        {tab === "Cases" && (
          <Panel title="Related investigations">
            {related.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {related.map((cs) => (
                      <tr key={cs.id}>
                        <td>
                          <Link to={`/cases?case=${cs.id}`}>{cs.id}</Link>
                        </td>
                        <td>
                          <Badge>{cs.status}</Badge>
                        </td>
                        <td>{date(cs.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                No related cases. <Link to="/anomalies">Review anomalies</Link>{" "}
                to create an investigation.
              </Empty>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
