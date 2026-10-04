import { Link } from "react-router-dom";
import { useWorkspace } from "./hooks";
import { quality } from "./service";
import { number } from "./format";
import { Badge, Chart, Empty, Header, Metrics, Panel, QueryGate } from "./ui";
export default function DataQuality() {
  const query = useWorkspace();
  const data = query.data;
  const stats = data && quality(data);
  const affected =
    data?.consumers.filter((c) =>
      c.history.some((p) => p.consumption === null || p.consumption < 0),
    ) ?? [];
  return (
    <>
      <Header
        title="Data Quality"
        description="Check the reliability of meter data before interpreting consumption or risk."
      />
      <QueryGate query={query}>
        {data && stats && (
          <>
            <Metrics
              items={[
                {
                  label: "Data Quality Score",
                  value: number(stats.score, "%"),
                  foot: "Valid, present daily values / expected values",
                },
                {
                  label: "Missing Readings",
                  value: number(stats.missing, "%"),
                  foot: "Null values and calendar gaps",
                },
                {
                  label: "Invalid Readings",
                  value: number(stats.invalid, "%"),
                  foot: "Negative stored daily values",
                },
                {
                  label: "Duplicate Readings",
                  value: number(stats.duplicate, "%"),
                  foot: "Stored dates are unique · ingestion rate unavailable",
                },
              ]}
            />
            <div className="notice">
              A recorded <strong>0 kWh</strong> is a valid zero reading. A{" "}
              <strong>null</strong> value means the reading is missing. Meter
              Data Transmission Failure requires a data check, not a theft
              conclusion. All values here cover simulated locality data for the
              last 30 days.
            </div>
            <Panel
              title="Missing-data trend"
              subtitle="Share of connected meters with a missing daily value"
            >
              <Chart
                title="Missing readings over time"
                data={stats.trend}
                lines={[
                  {
                    key: "missing",
                    name: "Missing readings",
                    color: "#c68a30",
                  },
                ]}
                unit="%"
                height={270}
              />
            </Panel>
            <Panel
              title="Affected meters"
              subtitle={`${affected.length} meters require a data check`}
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Meter</th>
                      <th>Consumer</th>
                      <th>Transformer</th>
                      <th>Missing Days</th>
                      <th>Invalid Days</th>
                      <th>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affected.map((c) => (
                      <tr key={c.id}>
                        <td>{c.meter}</td>
                        <td>
                          <Link to={`/consumers/${c.id}`}>{c.id}</Link>
                        </td>
                        <td>{c.transformer}</td>
                        <td>
                          {
                            c.history.filter((p) => p.consumption === null)
                              .length
                          }
                        </td>
                        <td>
                          {
                            c.history.filter(
                              (p) =>
                                p.consumption !== null && p.consumption < 0,
                            ).length
                          }
                        </td>
                        <td>
                          <Badge tone="amber">
                            {c.investigation?.latest_reading
                              ?.communication_status === "offline"
                              ? "Meter Data Transmission Failure"
                              : "Incomplete / invalid data"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!affected.length && (
                <Empty>
                  No missing or invalid daily values in this window.
                </Empty>
              )}
              <div className="source-note">
                Score measures stored daily completeness and non-negative
                values. It cannot detect every meter fault. Ingestion duplicate
                and rejection counters are not provided by the backend.
              </div>
            </Panel>
          </>
        )}
      </QueryGate>
    </>
  );
}
