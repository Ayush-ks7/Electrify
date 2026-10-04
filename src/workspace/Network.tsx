import { useEffect, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";
import type { ViewProps } from "./Locality";
export default function Network({ data, selected, onSelect }: ViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<Core | null>(null);
  const handler = useRef(onSelect);
  useEffect(() => {
    handler.current = onSelect;
  }, [onSelect]);
  const topology = JSON.stringify(
    data.transformers.map((t) => ({ id: t.id, consumers: t.consumers })),
  );
  useEffect(() => {
    const transformers: { id: string; consumers: string[] }[] =
      JSON.parse(topology);
    const cy = cytoscape({
      container: container.current,
      elements: transformers.flatMap((t, ti) => [
        {
          data: { id: t.id, kind: "transformer" },
          position: { x: ti * 450, y: 0 },
        },
        ...t.consumers.map((id, i) => ({
          data: { id, transformer: t.id, kind: "consumer" },
          position: {
            x:
              ti * 450 + Math.cos((i / t.consumers.length) * Math.PI * 2) * 155,
            y: Math.sin((i / t.consumers.length) * Math.PI * 2) * 155,
          },
        })),
        ...t.consumers.map((id) => ({
          data: { id: `${t.id}-${id}`, source: t.id, target: id },
        })),
      ]),
      layout: { name: "preset", padding: 65 },
      minZoom: 0.3,
      maxZoom: 3,
      style: [
        {
          selector: "node",
          style: {
            label: "data(id)",
            "background-color": "#73a9c5",
            width: 22,
            height: 22,
            "font-size": 11,
            color: "#51718e",
            "text-valign": "bottom",
            "text-margin-y": 10,
            "border-width": 3,
            "border-color": "#fff",
          },
        },
        {
          selector: '[kind = "transformer"]',
          style: {
            "background-color": "#0f52ba",
            width: 42,
            height: 42,
            shape: "round-rectangle",
            "font-weight": 600,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.4,
            "line-color": "#c6d5e0",
            "curve-style": "straight",
          },
        },
        { selector: ".review", style: { "background-color": "#d7a049" } },
        {
          selector: ".highlight",
          style: {
            "line-color": "#0f52ba",
            "border-color": "#0f52ba",
            "border-width": 3,
          },
        },
        { selector: "edge.highlight", style: { width: 2.5 } },
        { selector: "node.hover", style: { "border-color": "#219cbd", "border-width": 4 } },
        { selector: ".dim", style: { opacity: 0.28 } },
      ],
    });
    graph.current = cy;
    cy.on("tap", "node", (e) => handler.current(e.target.id()));
    cy.on("mouseover", "node", (e) => {
      e.target.addClass("hover");
      if (container.current) container.current.style.cursor = "pointer";
    });
    cy.on("mouseout", "node", (e) => {
      e.target.removeClass("hover");
      if (container.current) container.current.style.cursor = "grab";
    });
    const resize = new ResizeObserver(() => cy.resize());
    resize.observe(container.current!);
    return () => {
      resize.disconnect();
      cy.destroy();
      graph.current = null;
    };
  }, [topology]);
  useEffect(() => {
    const cy = graph.current;
    if (!cy) return;
    cy.elements().removeClass("highlight dim");
    cy.nodes().unselect();
    if (selected) {
      const node = cy.getElementById(selected);
      node.select();
      const connected =
        node.data("kind") === "transformer"
          ? node.closedNeighborhood()
          : node
              .union(node.connectedEdges())
              .union(node.connectedEdges().sources());
      cy.elements().difference(connected).addClass("dim");
      connected.addClass("highlight");
    }
  }, [selected, topology]);
  useEffect(() => {
    const cy = graph.current;
    if (!cy) return;
    cy.nodes().removeClass("review");
    data.consumers
      .filter((c) => c.investigation?.requires_review)
      .forEach((c) => cy.getElementById(c.id).addClass("review"));
  }, [data.consumers]);
  return (
    <>
      <div
        className="graph-stage"
        ref={container}
        role="img"
        aria-label="Interactive network of transformers and consumers. Use the accessible node list below for keyboard selection."
      />
      <div className="graph-controls">
        <button
          aria-label="Zoom in graph"
          onClick={() => graph.current?.zoom(graph.current.zoom() * 1.2)}
        >
          +
        </button>
        <button
          aria-label="Zoom out graph"
          onClick={() => graph.current?.zoom(graph.current.zoom() / 1.2)}
        >
          −
        </button>
        <button onClick={() => graph.current?.fit(undefined, 65)}>
          Fit network
        </button>
      </div>
    </>
  );
}
