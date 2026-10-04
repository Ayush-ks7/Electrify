import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Zap } from "lucide-react";
import { useWorkspace } from "./hooks";
import { date, number } from "./format";
import { Badge, Chart, Empty, Header, Metrics, Panel, QueryGate } from "./ui";
import { consumptionTrend } from "./service";
import { downloadCSV } from "./export";
import { NodeDrawer } from "./NodeDrawer";
export function Overview() {
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useWorkspace(days);
  const data = query.data;
  const openCases =
    data?.cases.filter(
      (c) => !["Resolved", "False Positive"].includes(c.status),
    ) ?? [];
  const highCases = openCases.filter(
    (c) =>
      data?.anomalies.find((a) => a.id === c.anomaly_id)?.evidence
        .inspection_priority === "High",
  );
  const active =
    data?.anomalies.filter(
      (a) => !a.case_id || openCases.some((c) => c.id === a.case_id),
    ) ?? [];
  return (
    <>
      <Header
        title="Overview"
        description="A clear view of your network. A focused list of what needs attention."
        actions={
          <>
            <div
              className="range-switch"
              aria-label="Energy balance date range"
            >
              {[7, 30].map((d) => (
                <button
                  key={d}
                  className={days === d ? "selected" : ""}
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                >
                  Last {d} Days
                </button>
              ))}
            </div>
            <button
              disabled={!data || !!query.error}
              onClick={() => data && downloadCSV(data)}
            >
              <Download size={14} />
              Export CSV
            </button>
          </>
        }
      />
      <QueryGate query={query}>
        {data && (
          <>
            <Metrics
              items={[
                {
                  label: "Total Consumers",
                  value: data.consumers.length,
                  foot: "Connected across the locality",
                },
                {
                  label: "Transformers",
                  value: data.transformers.length,
                  foot: "10 connected consumers each",
                },
                {
                  label: "Active Anomalies",
                  value: active.length,
                  foot: "Machine findings awaiting closure",
                },
                {
                  label: "High-Risk Cases",
                  value: highCases.length,
                  foot: "Open investigations · rule priority",
                },
              ]}
            />
            <section className="panel">
              <div className="panel-head">
                <div className="balance-heading">
                  <span className="heading-icon">
                    <Zap size={18} />
                  </span>
                  <div>
                    <h2>Transformer Energy Balance</h2>
                    <p>
                      Account for energy entering and leaving each transformer.
                    </p>
                  </div>
                </div>
                <Badge tone="blue">{days}-day view</Badge>
              </div>
              <div className="table-scroll">
                <table aria-label="Transformer energy balance">
                  <thead>
                    <tr>
                      <th>Transformer</th>
                      <th>Input Energy</th>
                      <th>Consumer Energy Sum</th>
                      <th>Residual Energy</th>
                      <th>Residual %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transformers.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <button
                            className="table-button"
                            onClick={() => setSelected(t.id)}
                          >
                            {t.id}
                          </button>
                          <span className="subcell">
                            {t.consumers.length} consumers
                          </span>
                        </td>
                        <td>{number(t.input, "kWh")}</td>
                        <td>{number(t.consumer, "kWh")}</td>
                        <td>
                          <strong>{number(t.residual, "kWh")}</strong>
                        </td>
                        <td>{number(t.percent, "%")}</td>
                        <td>
                          <Badge>{t.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="formula">
                <strong>Residual Energy</strong>
                <span>=</span>
                <span>Transformer Input Energy</span>
                <span>−</span>
                <span>Sum of Connected Consumer Energy</span>
              </div>
              <Chart
                title="Residual energy trend"
                data={data.transformers[0].trend.map((p, i) => ({
                  date: p.date,
                  ...Object.fromEntries(
                    data.transformers.map((t) => [t.id, t.trend[i].residual]),
                  ),
                }))}
                lines={data.transformers.map((t, i) => ({
                  key: t.id,
                  name: `${t.id} residual`,
                  color: i ? "#219cbd" : "#0f52ba",
                }))}
              />
              <div className="source-note">
                {date(data.range.start)} – {date(data.range.end)} ·{" "}
                {data.input_source} Missing consumer readings leave residuals
                unavailable.
              </div>
            </section>
            <div className="lower-grid">
              <Panel
                title="Consumption Trend"
                subtitle="Total connected consumer energy · simulated"
              >
                <Chart
                  title="Daily consumption"
                  data={consumptionTrend(data)}
                  lines={[
                    {
                      key: "consumption",
                      name: "Consumer energy",
                      color: "#2d739f",
                    },
                  ]}
                  height={205}
                />
              </Panel>
              <Panel
                title="Priority Cases"
                subtitle="Investigations that need a closer look"
                action={
                  <Link className="text-link" to="/cases">
                    All cases <ArrowUpRight size={13} />
                  </Link>
                }
              >
                {openCases.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Case / Consumer</th>
                          <th>Priority</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...openCases]
                          .sort(
                            (a, b) =>
                              Number(highCases.includes(b)) -
                              Number(highCases.includes(a)),
                          )
                          .slice(0, 4)
                          .map((c) => (
                            <tr key={c.id}>
                              <td>
                                <Link to={`/cases?case=${c.id}`}>{c.id}</Link>
                                <span className="subcell">
                                  {
                                    data.anomalies.find(
                                      (a) => a.id === c.anomaly_id,
                                    )?.consumer
                                  }
                                </span>
                              </td>
                              <td>
                                <Badge>
                                  {highCases.includes(c) ? "High" : "Review"}
                                </Badge>
                              </td>
                              <td>
                                <Badge>{c.status}</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>
                    <h3>No open investigations</h3>Create a case from an
                    important anomaly.
                    <br />
                    <Link to="/anomalies">Review machine findings →</Link>
                  </Empty>
                )}
              </Panel>
            </div>
            <Panel
              title="Recent Important Alerts"
              subtitle="Latest machine findings · causes remain unverified"
              action={
                <Link className="text-link" to="/anomalies">
                  View anomalies <ArrowUpRight size={13} />
                </Link>
              }
            >
              {active.length ? (
                <div className="alert-list">
                  {active.slice(0, 3).map((a) => (
                    <div className="alert-row" key={a.id}>
                      <div>
                        <Link to={`/anomalies/${a.id}`}>
                          <strong>
                            {a.consumer} · {a.evidence.probable_cause}
                          </strong>
                        </Link>
                        <p>
                          {date(a.detected_at)} ·{" "}
                          {a.evidence.inspection_priority} priority
                        </p>
                      </div>
                      <Badge>{a.case_id ? "Case Created" : "New"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>
                  No important alerts.{" "}
                  <Link to="/simulation">Start a simulation</Link> to observe
                  meter scenarios and review findings.
                </Empty>
              )}
            </Panel>
          </>
        )}
      </QueryGate>
      {selected && data && (
        <NodeDrawer
          id={selected}
          data={data}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
        />
      )}
    </>
  );
}
