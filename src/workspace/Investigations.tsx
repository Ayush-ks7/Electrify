import { caseStatuses } from "./config";
import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useCaseActions, useWorkspace } from "./hooks";
import { date, number } from "./format";
import {
  Badge,
  Chart,
  Drawer,
  Empty,
  Header,
  Panel,
  QueryGate,
  Tabs,
} from "./ui";
import type { Anomaly, Case, CaseStatus, Workspace } from "./types";
export function Anomalies() {
  const query = useWorkspace();
  const [filter, setFilter] = useState("");
  const data = query.data;
  const anomalies =
    data?.anomalies.filter(
      (a) => !filter || (filter === "New" ? !a.case_id : !!a.case_id),
    ) ?? [];
  return (
    <>
      <Header
        title="Anomalies"
        description="Machine-generated findings. Review the evidence before opening an investigation."
      />
      <QueryGate query={query}>
        {data && (
          <Panel
            title="Detection queue"
            subtitle={`${anomalies.length} findings · simulated meters`}
            action={
              <select
                aria-label="Anomaly status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All findings</option>
                <option>New</option>
                <option>Case Created</option>
              </select>
            }
          >
            <div className="table-scroll">
              <table aria-label="Anomalies">
                <thead>
                  <tr>
                    {[
                      "Anomaly",
                      "Consumer",
                      "Transformer",
                      "Risk",
                      "Likely Cause",
                      "Severity",
                      "Detected At",
                      "Case",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/anomalies/${a.id}`}>{a.id}</Link>
                        <span className="subcell">
                          <Badge>{a.case_id ? "Case Created" : "New"}</Badge>
                        </span>
                      </td>
                      <td>
                        <Link to={`/consumers/${a.consumer}`}>
                          {a.consumer}
                        </Link>
                      </td>
                      <td>
                        {
                          data.consumers.find((c) => c.id === a.consumer)
                            ?.transformer
                        }
                      </td>
                      <td>
                        {number(
                          a.evidence.review_probability == null
                            ? null
                            : a.evidence.review_probability * 100,
                          "%",
                        )}
                      </td>
                      <td style={{ whiteSpace: "normal", minWidth: 200 }}>
                        {a.evidence.probable_cause}
                      </td>
                      <td>
                        <Badge>{a.evidence.inspection_priority}</Badge>
                      </td>
                      <td>{date(a.detected_at)}</td>
                      <td>
                        {a.case_id ? (
                          <Link to={`/cases?case=${a.case_id}`}>
                            {a.case_id}
                          </Link>
                        ) : (
                          <Link to={`/anomalies/${a.id}`}>Review →</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!anomalies.length && (
              <Empty>
                <h3>No findings in this queue</h3>Start a{" "}
                <Link to="/simulation">meter simulation</Link> to generate
                observations.
                <br />
                Findings appear when existing telemetry rules or the locked
                model indicate review.
              </Empty>
            )}
            <div className="source-note">
              Risk is the saved model review probability. Severity is the
              existing operational rule priority, not a calibrated anomaly
              score.
            </div>
          </Panel>
        )}
      </QueryGate>
    </>
  );
}
export function AnomalyDetail() {
  const { id } = useParams();
  const query = useWorkspace();
  const a = query.data?.anomalies.find((a) => a.id === id);
  return (
    <QueryGate query={query}>
      {a && query.data ? (
        <Finding key={a.id} anomaly={a} data={query.data} />
      ) : (
        <Empty>
          Anomaly not found. <Link to="/anomalies">Back to anomalies</Link>
        </Empty>
      )}
    </QueryGate>
  );
}
function Finding({ anomaly: a, data }: { anomaly: Anomaly; data: Workspace }) {
  const [tab, setTab] = useState("Overview");
  const action = useCaseActions();
  const navigate = useNavigate();
  const c = data.consumers.find((c) => c.id === a.consumer)!;
  return (
    <>
      <Link className="text-link" to="/anomalies">
        ← Anomalies
      </Link>
      <Header
        eyebrow={`MACHINE FINDING / ${a.consumer}`}
        title={a.id}
        description={`Detected ${date(a.detected_at)} · ${c.transformer} · Simulated meter`}
        actions={
          a.case_id ? (
            <Link className="button-link" to={`/cases?case=${a.case_id}`}>
              Open case →
            </Link>
          ) : (
            <button
              className="primary"
              disabled={action.isPending}
              onClick={() =>
                action.mutate(
                  { anomaly: a.id },
                  { onSuccess: (cs) => navigate(`/cases?case=${cs.id}`) },
                )
              }
            >
              Create Case
            </button>
          )
        }
      />
      {action.error && (
        <div className="notice error" role="alert">
          {action.error.message}
        </div>
      )}
      <Tabs
        values={["Overview", "Consumption", "Evidence", "Related Case"]}
        value={tab}
        onChange={setTab}
      />
      <div role="tabpanel">
        {tab === "Overview" && (
          <Panel title="Finding summary">
            <div className="panel-body">
              <dl className="detail-list">
                <dt>Status</dt>
                <dd>
                  <Badge>{a.case_id ? "Case Created" : "New"}</Badge>
                </dd>
                <dt>Consumer</dt>
                <dd>
                  <Link to={`/consumers/${a.consumer}`}>{a.consumer}</Link>
                </dd>
                <dt>Likely cause</dt>
                <dd>{a.evidence.probable_cause}</dd>
                <dt>Severity</dt>
                <dd>
                  <Badge>{a.evidence.inspection_priority}</Badge>
                </dd>
                <dt>Risk probability at detection</dt>
                <dd>
                  {number(
                    a.evidence.review_probability == null
                      ? null
                      : a.evidence.review_probability * 100,
                    "%",
                  )}
                </dd>
                <dt>Recommended next step</dt>
                <dd>{a.evidence.recommended_action}</dd>
              </dl>
              <div className="notice">
                This is a machine finding, not a confirmed cause or theft
                determination. An investigation starts only when a case is
                created.
              </div>
            </div>
          </Panel>
        )}
        {tab === "Consumption" && (
          <Panel
            title="Consumption context"
            subtitle="Current last-30-day history; case evidence is preserved when a case is created"
          >
            <Chart
              title={`${c.id} daily consumption`}
              data={c.history}
              lines={[{ key: "consumption", name: c.source, color: "#0f52ba" }]}
            />
          </Panel>
        )}
        {tab === "Evidence" && (
          <Panel title="Evidence saved at detection">
            <div className="panel-body">
              <ul className="evidence-list">
                {a.evidence.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <p>{a.evidence.cause_evidence_confidence}</p>
              <div className="timeline">
                <div className="timeline-item">
                  <strong>Finding recorded</strong>
                  <small>{date(a.detected_at)} · server time</small>
                </div>
              </div>
            </div>
          </Panel>
        )}
        {tab === "Related Case" && (
          <Panel title="Human investigation">
            {a.case_id ? (
              <div className="panel-body">
                <Link className="button-link" to={`/cases?case=${a.case_id}`}>
                  Open {a.case_id} →
                </Link>
              </div>
            ) : (
              <Empty>
                No case has been created for this finding. Use Create Case to
                begin an investigation.
              </Empty>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
export function Cases() {
  const query = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("");
  const data = query.data;
  const cases = data?.cases.filter((c) => !filter || c.status === filter) ?? [];
  const selected = cases.find((c) => c.id === params.get("case")) ?? cases[0];
  return (
    <>
      <Header
        title="Cases"
        description="Human investigations, with evidence and a clear record of decisions."
        actions={
          <Link className="button-link" to="/anomalies">
            Create Case from anomaly →
          </Link>
        }
      />
      <QueryGate query={query}>
        {data && (
          <>
            <div className="filters" style={{ paddingLeft: 0 }}>
              <label>
                Case status
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {caseStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            {cases.length && selected ? (
              <div className="case-workspace">
                <Panel title={`Investigations (${cases.length})`}>
                  <div className="case-list">
                    {cases.map((c) => (
                      <button
                        key={c.id}
                        className={selected.id === c.id ? "selected" : ""}
                        onClick={() => setParams({ case: c.id })}
                      >
                        <strong>{c.id}</strong>
                        <Badge>{c.status}</Badge>
                        <small>
                          {
                            data.anomalies.find((a) => a.id === c.anomaly_id)
                              ?.consumer
                          }{" "}
                          · {date(c.created_at)}
                        </small>
                      </button>
                    ))}
                  </div>
                </Panel>
                <CaseWorkspace
                  key={selected.id}
                  record={selected}
                  anomaly={data.anomalies.find(
                    (a) => a.id === selected.anomaly_id,
                  )!}
                />
              </div>
            ) : (
              <Panel>
                <Empty>
                  <h3>No cases in this queue</h3>Cases begin with a machine
                  finding.
                  <br />
                  <Link to="/anomalies">
                    Review anomalies and create a case →
                  </Link>
                </Empty>
              </Panel>
            )}
          </>
        )}
      </QueryGate>
    </>
  );
}
function CaseWorkspace({
  record: c,
  anomaly: a,
}: {
  record: Case;
  anomaly: Anomaly;
}) {
  const [action, setAction] = useState<"status" | "note" | null>(null);
  const [nextStatus, setNextStatus] = useState<CaseStatus>(c.status);
  const [note, setNote] = useState("");
  const mutation = useCaseActions();
  const [message, setMessage] = useState("");
  const change = (status: CaseStatus) => {
    setNextStatus(status);
    setAction("status");
    setMessage("");
    mutation.reset();
  };
  return (
    <Panel
      title={c.id}
      subtitle={`Consumer ${a.consumer} · ${a.id}`}
      action={<Badge>{c.status}</Badge>}
    >
      <div className="panel-body">
        <h3>{a.evidence.probable_cause}</h3>
        <p>{a.evidence.recommended_action}</p>
        <div className="action-row">
          <button onClick={() => change(c.status)}>Change Status</button>
          <button
            onClick={() => {
              setAction("note");
              mutation.reset();
              setMessage("");
            }}
          >
            Add Note
          </button>
          <button onClick={() => change("Confirmed")}>Mark Confirmed</button>
          <button onClick={() => change("False Positive")}>
            Mark False Positive
          </button>
          <button onClick={() => change("Resolved")}>Resolve</button>
        </div>
        {message && (
          <div className="notice success" role="status">
            {message}
          </div>
        )}
        <div className="notice">
          “Confirmed” records a human-verified finding. It does not
          automatically mean confirmed theft.
        </div>
        <h3>Supporting evidence</h3>
        <ul className="evidence-list">
          {a.evidence.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <Link className="text-link" to={`/anomalies/${a.id}`}>
          Open original anomaly →
        </Link>
        <h3>Case activity</h3>
        <div className="timeline">
          {[...c.events].reverse().map((e, i) => (
            <div className="timeline-item" key={`${e.at}-${i}`}>
              <strong>{e.message}</strong>
              {e.note && <p>{e.note}</p>}
              <small>{new Date(e.at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
      {action && (
        <Drawer
          title={action === "note" ? "Add case note" : "Update case status"}
          onClose={() => setAction(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(
                action === "note"
                  ? { id: c.id, note }
                  : { id: c.id, status: nextStatus },
                {
                  onSuccess: () => {
                    setMessage(
                      action === "note" ? "Note added" : "Status updated",
                    );
                    setNote("");
                    setAction(null);
                  },
                },
              );
            }}
          >
            {action === "note" ? (
              <label className="field">
                Investigation note
                <textarea
                  required
                  maxLength={4000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record evidence, observations, or the next step."
                />
              </label>
            ) : (
              <>
                <label className="field">
                  Status
                  <select
                    aria-label="Status"
                    value={nextStatus}
                    onChange={(e) =>
                      setNextStatus(e.target.value as CaseStatus)
                    }
                  >
                    {caseStatuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                {nextStatus === "Confirmed" && (
                  <div className="notice">
                    Use after human verification. Add a note describing what was
                    confirmed.
                  </div>
                )}
              </>
            )}
            {mutation.error && (
              <div className="notice error" role="alert">
                {mutation.error.message}
              </div>
            )}
            <button
              type="submit"
              className="primary"
              disabled={
                mutation.isPending || (action === "note" && !note.trim())
              }
            >
              {mutation.isPending
                ? "Saving…"
                : action === "note"
                  ? "Add Note"
                  : "Save Status"}
            </button>
          </form>
        </Drawer>
      )}
    </Panel>
  );
}
