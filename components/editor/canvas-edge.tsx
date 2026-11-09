"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MarkerType,
  useReactFlow,
  type DefaultEdgeOptions,
  type EdgeProps,
} from "@xyflow/react";
import { useState } from "react";

import { EDGE_COLOR, type CanvasEdge as CanvasEdgeType } from "@/types/canvas";

// Applied to every new connection before it reaches onConnect.
export const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  style: { stroke: EDGE_COLOR, strokeWidth: 1.5, strokeLinecap: "round" },
};

export function CanvasEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps<CanvasEdgeType>) {
  const { updateEdgeData } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  // Right-angle routing; labelX/labelY are the path midpoint.
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const label = data?.label ?? "";
  const active = hovered || selected;
  const hover = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  function startEditing() {
    setDraft(label);
  }

  function save() {
    if (draft === null) return;
    // updateEdgeData emits a replace change through onEdgesChange, synced by Liveblocks.
    updateEdgeData(id, { label: draft.trim() });
    setDraft(null);
  }

  return (
    <>
      <g className="nopan" onDoubleClick={startEditing} {...hover}>
        <BaseEdge
          path={path}
          markerEnd={markerEnd}
          // Wide invisible hit area; the visible stroke stays thin.
          interactionWidth={24}
          style={{
            ...style,
            opacity: active ? 1 : 0.5,
            transition: "opacity 150ms",
          }}
        />
      </g>
      <EdgeLabelRenderer>
        {(draft !== null || label || active) && (
          <div
            // nodrag/nopan keep label clicks and typing from moving the canvas.
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            onDoubleClick={startEditing}
            {...hover}
          >
            {draft !== null ? (
              <input
                autoFocus
                value={draft}
                // Grows with the text.
                size={Math.max(draft.length, 5)}
                placeholder="Label"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape")
                    e.currentTarget.blur();
                }}
                aria-label="Edge label"
                className="nowheel rounded-full border border-brand bg-surface px-2 py-0.5 text-center text-xs text-copy-primary outline-none placeholder:text-copy-faint"
              />
            ) : label ? (
              <span className="block rounded-full border border-surface-border bg-surface px-2 py-0.5 text-xs whitespace-nowrap text-copy-primary">
                {label}
              </span>
            ) : (
              <span className="block text-xs whitespace-nowrap text-copy-faint">
                Double-click to label
              </span>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
