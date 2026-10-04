import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Database,
  LayoutDashboard,
  Menu,
  Play,
  Users,
  X,
  Zap,
} from "lucide-react";
import Lenis from "lenis";
import gsap from "gsap";
import { Drawer } from "./ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useSimulationState } from "./hooks";
const navigation = [
  { path: "/overview", label: "Overview", icon: LayoutDashboard },
  { path: "/locality", label: "Locality", icon: Boxes },
  { path: "/consumers", label: "Consumers", icon: Users },
  { path: "/anomalies", label: "Anomalies", icon: Activity },
  { path: "/cases", label: "Cases", icon: ClipboardList },
  { path: "/data-quality", label: "Data Quality", icon: Database },
  { path: "/simulation", label: "Simulation", icon: Play },
];
export default function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const location = useLocation();
  const simulation = useSimulationState(true);
  const streams = simulation.data?.streams ?? [];
  const main = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLDialogElement>(null);
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: 30000,
  });
  const model = useQuery({
    queryKey: ["model"],
    queryFn: () => api.modelInfo(),
    enabled: help,
  });
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({
        autoRaf: true,
        naiveDimensions: true,
        anchors: true,
        prevent: (node) => node.hasAttribute("data-lenis-prevent"),
      });
      return () => lenis.destroy();
    });
    return () => media.revert();
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!main.current) return;
    const element = main.current;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        element,
        { opacity: 0.5, y: 7 },
        { opacity: 1, y: 0, duration: 0.24, clearProps: "all" },
      );
    });
    return () => media.revert();
  }, [location.pathname]);
  useEffect(() => {
    if (mobile) mobileRef.current?.showModal();
    else mobileRef.current?.close();
  }, [mobile]);
  const nav = (
    <>
      <a href="/overview" className="brand">
        <span className="brand-mark">
          <Zap size={23} fill="currentColor" />
        </span>
        <span className="nav-label">
          electrify<span className="brand-period">.</span>
        </span>
      </a>
      <div className="nav-caption nav-label">WORKSPACE</div>
      <nav aria-label="Primary navigation">
        {navigation.map((n) => (
          <NavLink
            key={n.path}
            to={n.path}
            title={n.label}
            aria-label={n.label}
            onClick={() => setMobile(false)}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <n.icon size={19} />
            <span className="nav-label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="territory nav-label">
          <span className="territory-dot" />
          Locality workspace<small>Simulated service territory</small>
        </div>
        <button
          className="help nav-item"
          title="About this workspace"
          onClick={() => {
            setMobile(false);
            setHelp(true);
          }}
        >
          <CircleHelp size={19} />
          <span className="nav-label">About & model info</span>
          <ArrowUpRight size={14} className="nav-label" />
        </button>
      </div>
    </>
  );
  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        {nav}
        <button
          className="collapse-button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
      <dialog
        ref={mobileRef}
        className="mobile-navigation"
        aria-label="Navigation"
        onCancel={() => setMobile(false)}
        data-lenis-prevent
      >
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        {nav}
      </dialog>
      <div className="workspace">
        <div className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Operations</span>
            <span className="slash">/</span>
            <strong>
              {navigation.find((n) => location.pathname.startsWith(n.path))
                ?.label ?? "Overview"}
            </strong>
          </div>
          <div className="topbar-meta">
            <span
              className={`connection-dot ${health.data?.status === "ok" ? "" : "offline"}`}
            />
            <span>
              {health.data?.status === "ok"
                ? "Backend connected"
                : "Backend unavailable"}
            </span>
            <span className="topbar-divider" />
            <span className="simulation-label">
              {simulation.error ? "Simulation status unavailable" : simulation.isPending ? "Checking simulation…" : streams.some((s) => s.state === "running")
                ? `Simulation active · ${streams.filter((s) => s.state === "running").length} meters`
                : streams.length ? "Simulation stopped · data retained" : "Baseline preview"}
            </span>
          </div>
        </div>
        <main ref={main} id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>Electrify · Utility intelligence</span>
          <span>Detection informs review. It does not establish theft.</span>
        </footer>
      </div>
      {help && (
        <Drawer title="About this workspace" onClose={() => setHelp(false)}>
          <p>
            Meter data → Data quality → Consumer profiling → Anomaly detection →
            Cause explanation → Risk → Human investigation.
          </p>
          <div className="notice">
            All locality energy data is simulated. Causes are operational
            hypotheses. The locked model supplies review probabilities, not
            proof of theft.
          </div>
          <h3>Model information</h3>
          {model.data ? (
            <dl className="detail-list">
              <dt>Model</dt>
              <dd>{model.data.model_family}</dd>
              <dt>Version</dt>
              <dd>{model.data.model_version}</dd>
              <dt>Features</dt>
              <dd>{model.data.feature_count}</dd>
              <dt>Scope</dt>
              <dd>{model.data.scope}</dd>
            </dl>
          ) : (
            <p>
              {model.error
                ? "Model information unavailable."
                : "Loading model information…"}
            </p>
          )}
          <p>
            No trained cause classifier or separate anomaly score is available.
            Peer averages are descriptive comparisons within a transformer.
          </p>
        </Drawer>
      )}
    </div>
  );
}
