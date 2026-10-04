import { number, date } from "./format";
import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: string;
}) {
  const value = String(children);
  const color =
    tone ??
    (/High|Review|Anomaly|New|Incomplete|Fault/.test(value)
      ? "amber"
      : /Resolved|Within|Low|Confirmed|Monitoring/.test(value)
        ? "green"
        : "blue");
  return <span className={`badge ${color}`}>{children}</span>;
}
export function Header({
  eyebrow = "UTILITY OPERATIONS",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-actions">{actions}</div>
    </header>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Tabs({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {values.map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={v === value}
          onClick={() => onChange(v)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              const delta = e.key === "ArrowRight" ? 1 : -1;
              const index =
                (values.indexOf(v) + delta + values.length) % values.length;
              onChange(values[index]);
              (
                e.currentTarget.parentElement?.children[index] as HTMLElement
              )?.focus();
            }
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function QueryGate({
  query,
  children,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown };
  children: ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="loading" role="status">
        <span className="loading-bar" />
        Loading utility workspace…
      </div>
    );
  if (query.error)
    return (
      <div className="notice error" role="alert">
        {query.error.message}
        <button onClick={() => query.refetch()}>Retry</button>
      </div>
    );
  return children;
}
export function Chart({
  title,
  data,
  lines,
  unit = "kWh",
  height = 240,
}: {
  title: string;
  data: object[];
  lines: { key: string; name: string; color: string; dashed?: boolean }[];
  unit?: string;
  height?: number;
}) {
  return (
    <figure className="chart">
      <figcaption>
        {title}
        <span>Daily values · UTC</span>
      </figcaption>
      <div
        role="img"
        aria-label={`${title}. X axis: Date (UTC). Y axis: ${unit}. Values also available in the data table.`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 18, right: 20, bottom: 20, left: 12 }}
          >
            <CartesianGrid stroke="#e8edf3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => String(v).slice(5)}
              tickLine={false}
              axisLine={false}
              minTickGap={35}
              label={{
                value: "Date (UTC)",
                position: "insideBottom",
                offset: -16,
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={50}
              label={{
                value: unit === "%" ? "Missing (%)" : "Energy (kWh)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              labelFormatter={(v) => date(String(v))}
              formatter={(v, name) => [number(Number(v), unit), name]}
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #dbe3ee",
                fontSize: 12,
              }}
            />
            <Legend verticalAlign="top" height={30} />
            {lines.map((l) => (
              <Line
                key={l.key}
                dataKey={l.key}
                name={l.name}
                stroke={l.color}
                strokeWidth={2.2}
                dot={false}
                connectNulls={false}
                strokeDasharray={l.dashed ? "5 5" : undefined}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>View chart data</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                {lines.map((l) => (
                  <th key={l.key}>
                    {l.name} ({unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((raw, i) => {
                const row = raw as Record<string, number | string | null>;
                return (
                  <tr key={i}>
                    <td>{String(row.date)}</td>
                    {lines.map((l) => (
                      <td key={l.key}>{number(row[l.key] as number | null)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
export function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    dialog.showModal();
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        dialog,
        { x: 35, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.22 },
      );
    });
    return () => {
      media.revert();
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          e.clientX < e.currentTarget.getBoundingClientRect().left
        )
          closeRef.current();
      }}
      data-lenis-prevent
    >
      <div className="drawer-head">
        <div>
          <span className="eyebrow">DETAILS</span>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close drawer"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="drawer-body">{children}</div>
    </dialog>
  );
}
export function Metrics({
  items,
}: {
  items: { label: string; value: ReactNode; foot?: string }[];
}) {
  return (
    <div className="metrics">
      {items.map((i) => (
        <div className="metric" key={i.label}>
          <span>{i.label}</span>
          <strong>{i.value}</strong>
          {i.foot && <small>{i.foot}</small>}
        </div>
      ))}
    </div>
  );
}
