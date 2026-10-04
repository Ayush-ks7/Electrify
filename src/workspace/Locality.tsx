import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { useWorkspace } from "./hooks";
import { Header, Panel, QueryGate, Tabs } from "./ui";
import { NodeDrawer } from "./NodeDrawer";
import type { Workspace } from "./types";
const Scene = lazy(() => import("./Scene"));
const Network = lazy(() => import("./Network"));
export interface ViewProps {
  data: Workspace;
  selected: string | null;
  onSelect: (id: string) => void;
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <h3>3D rendering is unavailable on this device</h3>
        <p>Use the 2D Graph tab or the accessible node list below.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Locality() {
  const query = useWorkspace();
  const [view, setView] = useState("3D View");
  const [selected, setSelected] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const select = (id: string) => {
    setSelected(id);
    setDrawer(true);
  };
  useEffect(() => {
    if (!stage.current) return;
    const element = stage.current;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(element, { opacity: 0.5 }, { opacity: 1, duration: 0.2 });
    });
    return () => media.revert();
  }, [view, query.isPending]);
  return (
    <>
      <Header
        title="Locality"
        description="Explore the connected network. Select a transformer or consumer to inspect it."
      />
      <QueryGate query={query}>
        {query.data && (
          <>
            <Panel>
              <div className="locality-toolbar">
                <Tabs
                  values={["3D View", "2D Graph"]}
                  value={view}
                  onChange={setView}
                />
                <div className="locality-legend">
                  <span>
                    <i
                      className="legend-dot"
                      style={{ background: "#0f52ba" }}
                    />
                    Transformer
                  </span>
                  <span>
                    <i
                      className="legend-dot"
                      style={{ background: "#68a9c5" }}
                    />
                    Consumer
                  </span>
                  <span>
                    <i
                      className="legend-dot"
                      style={{ background: "#d7a049" }}
                    />
                    Needs review
                  </span>
                </div>
              </div>
              <div ref={stage} className="locality-stage" data-lenis-prevent>
                <Suspense
                  fallback={
                    <div className="loading">Loading locality view…</div>
                  }
                >
                  {view === "3D View" ? (
                    <SceneBoundary>
                      <Scene
                        data={query.data}
                        selected={selected}
                        onSelect={select}
                      />
                    </SceneBoundary>
                  ) : (
                    <Network
                      data={query.data}
                      selected={selected}
                      onSelect={select}
                    />
                  )}
                </Suspense>
                <div className="locality-caption">
                  <strong>
                    {query.data.transformers.length} transformers ·{" "}
                    {query.data.consumers.length} consumers
                  </strong>
                  <p>
                    {view === "3D View"
                      ? "Drag to orbit · Right-drag to pan · Scroll to zoom"
                      : "Drag nodes to arrange · Drag background to pan · Scroll to zoom"}
                  </p>
                </div>
              </div>
              <div className="source-note">
                Simulated locality · Connections represent the canonical meter
                mapping. Select a transformer to highlight its consumers.
              </div>
              <details className="locality-node-list">
                <summary>Accessible node list · select a node</summary>
                {query.data.transformers.map((t) => (
                  <div className="node-group" key={t.id}>
                    <button
                      className={selected === t.id ? "primary" : ""}
                      onClick={() => select(t.id)}
                    >
                      {t.id}
                    </button>
                    <div className="node-chips">
                      {t.consumers.map((cid) => (
                        <button
                          className={selected === cid ? "selected" : ""}
                          key={cid}
                          onClick={() => select(cid)}
                        >
                          {cid}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </details>
            </Panel>
            {drawer && selected && (
              <NodeDrawer
                id={selected}
                data={query.data}
                onClose={() => setDrawer(false)}
                onSelect={select}
              />
            )}
          </>
        )}
      </QueryGate>
    </>
  );
}
