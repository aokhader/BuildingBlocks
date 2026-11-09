"use client";

import { useReactFlow, useStoreApi } from "@xyflow/react";
import { useState, type MouseEvent, type PointerEvent } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type SelectionBox = { x0: number; y0: number; x1: number; y1: number };

const EDGE_SAMPLES = 24;

function inBox(box: SelectionBox, x: number, y: number) {
  return (
    x >= Math.min(box.x0, box.x1) &&
    x <= Math.max(box.x0, box.x1) &&
    y >= Math.min(box.y0, box.y1) &&
    y <= Math.max(box.y0, box.y1)
  );
}

// Edges have no stored geometry, so sample each rendered path in screen space.
function edgeIdsCrossing(box: SelectionBox, container: Element) {
  const ids = new Set<string>();
  container.querySelectorAll(".react-flow__edge").forEach((el) => {
    const path = el.querySelector<SVGPathElement>(".react-flow__edge-path");
    const ctm = path?.getScreenCTM();
    const id = el.getAttribute("data-id");
    if (!path || !ctm || !id) return;
    const length = path.getTotalLength();
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const p = path
        .getPointAtLength((length * i) / EDGE_SAMPLES)
        .matrixTransform(ctm);
      if (inBox(box, p.x, p.y)) return void ids.add(id);
    }
  });
  return ids;
}

// React Flow's own selection box only starts on the left button (left-drag pans here),
// so right-drag draws our own box and selects everything it touches.
export function useSelectionBox() {
  const { getIntersectingNodes, screenToFlowPosition } = useReactFlow<
    CanvasNode,
    CanvasEdge
  >();
  const store = useStoreApi<CanvasNode, CanvasEdge>();
  const [box, setBox] = useState<SelectionBox | null>(null);

  function select(next: SelectionBox, container: Element) {
    // A zero-width or zero-height box has area 0, and getIntersectingNodes counts
    // "overlap >= box area" as a hit, so it would match every node.
    if (next.x0 === next.x1 || next.y0 === next.y1) return;
    const a = screenToFlowPosition({ x: next.x0, y: next.y0 });
    const b = screenToFlowPosition({ x: next.x1, y: next.y1 });
    const nodeIds = new Set(
      getIntersectingNodes(
        {
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(a.x - b.x),
          height: Math.abs(a.y - b.y),
        },
        true,
      ).map((n) => n.id),
    );
    const edgeIds = edgeIdsCrossing(next, container);
    const { nodes, edges, triggerNodeChanges, triggerEdgeChanges } =
      store.getState();
    // Edges between two selected nodes go along with them.
    for (const e of edges)
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) edgeIds.add(e.id);
    triggerNodeChanges(
      nodes
        .filter((n) => !!n.selected !== nodeIds.has(n.id))
        .map((n) => ({
          type: "select",
          id: n.id,
          selected: nodeIds.has(n.id),
        })),
    );
    triggerEdgeChanges(
      edges
        .filter((e) => !!e.selected !== edgeIds.has(e.id))
        .map((e) => ({
          type: "select",
          id: e.id,
          selected: edgeIds.has(e.id),
        })),
    );
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      const target = event.target as Element;
      if (event.button !== 2 || !target.closest(".react-flow__pane")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const { clientX: x, clientY: y } = event;
      setBox({ x0: x, y0: y, x1: x, y1: y });
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!box) return;
      const next = { ...box, x1: event.clientX, y1: event.clientY };
      setBox(next);
      select(next, event.currentTarget);
    },
    onPointerUp() {
      setBox(null);
    },
    // Right-drag is selection on the canvas, so no browser menu there.
    onContextMenu(event: MouseEvent<HTMLElement>) {
      if ((event.target as Element).closest(".react-flow__pane"))
        event.preventDefault();
    },
  };

  return { box, handlers };
}
