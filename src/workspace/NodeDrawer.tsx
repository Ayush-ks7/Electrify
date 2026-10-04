import { Link } from "react-router-dom";
import { date, number } from "./format";
import { Badge, Drawer } from "./ui";
import { cause, latest, risk, status } from "./service";
import type { Workspace } from "./types";
import { RiskScore } from "./RiskScore";
export function NodeDrawer({
  id,
  data,
  onClose,
  onSelect,
}: {
  id: string;
  data: Workspace;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const consumer = data.consumers.find((c) => c.id === id);
  const transformer = data.transformers.find((t) => t.id === id);
  return (
    <Drawer
      title={consumer ? `Consumer ${id}` : `Transformer ${id}`}
      onClose={onClose}
    >
      {consumer ? (
        <>
          <Badge>{status(consumer)}</Badge>
          <dl className="detail-list">
            <dt>Consumer ID</dt>
            <dd>{consumer.id}</dd>
            <dt>Meter ID</dt>
            <dd>{consumer.meter}</dd>
            <dt>Transformer</dt>
            <dd>
              <button
                className="table-button"
                onClick={() => onSelect(consumer.transformer)}
              >
                {consumer.transformer}
              </button>
            </dd>
            <dt>Current consumption</dt>
            <dd>{number(latest(consumer), "kWh/day")}</dd>
            <dt>Historical baseline</dt>
            <dd>{number(consumer.baseline, "kWh/day")}</dd>
            <dt>Risk / priority</dt>
            <dd>
              <Badge>{risk(consumer)}</Badge>
            </dd>
            <dt>Risk Score · model review probability</dt>
            <dd><RiskScore info={consumer.investigation} /></dd>
            <dt>Anomaly status</dt>
            <dd>{status(consumer)}</dd>
            <dt>Likely cause</dt>
            <dd>{cause(consumer)}</dd>
            <dt>Last reading</dt>
            <dd>
              {consumer.backend_id
                ? date(
                    consumer.investigation?.latest_reading?.timestamp ??
                      consumer.history.at(-1)?.date,
                  )
                : "No received meter reading"}
            </dd>
            <dt>Source</dt>
            <dd>{consumer.source}</dd>
          </dl>
          <div className="notice">
            A suspected cause needs human verification. Missing meter data does
            not establish theft.
          </div>
          <Link className="button-link" to={`/consumers/${consumer.id}`}>
            Open consumer detail →
          </Link>
        </>
      ) : transformer ? (
        <>
          <Badge>{transformer.status}</Badge>
          <dl className="detail-list">
            <dt>Date range</dt>
            <dd>
              {date(data.range.start)} – {date(data.range.end)}
            </dd>
            <dt>Input energy</dt>
            <dd>{number(transformer.input, "kWh")}</dd>
            <dt>Consumer energy sum</dt>
            <dd>{number(transformer.consumer, "kWh")}</dd>
            <dt>Residual energy</dt>
            <dd>{number(transformer.residual, "kWh")}</dd>
            <dt>Residual</dt>
            <dd>{number(transformer.percent, "%")}</dd>
            <dt>Health / status</dt>
            <dd>{transformer.status}</dd>
          </dl>
          <h3>{transformer.consumers.length} connected consumers</h3>
          <div className="node-chips">
            {transformer.consumers.map((cid) => (
              <button key={cid} onClick={() => onSelect(cid)}>
                {cid}
              </button>
            ))}
          </div>
          <div className="notice" style={{ marginTop: 24 }}>
            {data.input_source} Residuals are not attributed to theft.
          </div>
        </>
      ) : (
        <p>Node not found.</p>
      )}
    </Drawer>
  );
}
