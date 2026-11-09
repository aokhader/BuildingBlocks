"use client";

import {
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  useConnection,
  useReactFlow,
  useStoreApi,
  type NodeChange,
  type NodeProps,
  type ResizeParams,
} from "@xyflow/react";
import { useRef, useState, type ReactNode } from "react";

import {
  DEFAULT_NODE_TEXT_COLOR,
  NODE_COLORS,
  type CanvasNode as CanvasNodeType,
  type NodeShape,
} from "@/types/canvas";

// SVG outlines in a 100x100 viewBox, stretched to the node size.
export const SVG_SHAPES: Partial<Record<NodeShape, string>> = {
  diamond: "M50 1 L99 50 L50 99 L1 50 Z",
  hexagon: "M25 1 L75 1 L99 50 L75 99 L25 99 L1 50 Z",
  // Inner arc winds the same way as the body; reversed, nonzero fill would cut a hole in the lid.
  cylinder:
    "M1 12 A49 11 0 0 1 99 12 L99 88 A49 11 0 0 1 1 88 Z M99 12 A49 11 0 0 1 1 12",
};

const CSS_RADIUS: Partial<Record<NodeShape, string>> = {
  rectangle: "rounded-xl",
  circle: "rounded-full",
  pill: "rounded-full",
};

type ShapeViewProps = {
  shape: NodeShape;
  color: string;
  textColor?: string;
  label?: ReactNode;
  selected?: boolean;
};

// Shared by canvas nodes and the shape panel's drag ghost.
export function ShapeView({
  shape,
  color,
  textColor = DEFAULT_NODE_TEXT_COLOR,
  label,
  selected,
}: ShapeViewProps) {
  const stroke = selected ? "var(--accent-primary)" : "var(--border-subtle)";
  const path = SVG_SHAPES[shape];

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center px-3 text-center text-sm ${
        path ? "" : `border ${CSS_RADIUS[shape]}`
      }`}
      style={{
        color: textColor,
        ...(!path && { backgroundColor: color, borderColor: stroke }),
      }}
    >
      {path && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <path
            d={path}
            fill={color}
            stroke={stroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <span className="relative">{label}</span>
    </div>
  );
}

const MIN_NODE_SIZE = 40;
const HANDLE_SIDES = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
];
const LABEL_PLACEHOLDER = "Label";

export function CanvasNode({ id, data, selected }: NodeProps<CanvasNodeType>) {
  const { updateNodeData } = useReactFlow<CanvasNodeType>();
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // toNode is set when a dragged connection snaps to one of this node's handles.
  const isConnectionTarget = useConnection(
    (c) => c.inProgress && c.toNode?.id === id,
  );
  const showHandles = selected || isHovered || isConnectionTarget;
  const store = useStoreApi<CanvasNodeType>();
  // Start rects of this node and the other selected nodes, for group scaling.
  const resizeStart = useRef<{
    self: ResizeParams;
    others: { id: string; x: number; y: number; w: number; h: number }[];
  } | null>(null);

  function onResizeStart(_: unknown, params: ResizeParams) {
    const others = store
      .getState()
      .nodes.filter((n) => n.selected && n.id !== id)
      .map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        w: n.width ?? n.measured?.width ?? 0,
        h: n.height ?? n.measured?.height ?? 0,
      }));
    resizeStart.current = { self: params, others };
  }

  // Map the other selected nodes through the same scale as this node's rect, so the
  // group scales as one. resizing:true pauses history, so the whole resize is one undo step.
  function onResize(_: unknown, params: ResizeParams) {
    const start = resizeStart.current;
    if (!start?.others.length) return;
    const sx = params.width / start.self.width;
    const sy = params.height / start.self.height;
    store.getState().triggerNodeChanges(
      start.others.flatMap((n): NodeChange<CanvasNodeType>[] => [
        {
          id: n.id,
          type: "dimensions",
          resizing: true,
          setAttributes: true,
          dimensions: {
            width: Math.max(MIN_NODE_SIZE, n.w * sx),
            height: Math.max(MIN_NODE_SIZE, n.h * sy),
          },
        },
        {
          id: n.id,
          type: "position",
          position: {
            x: params.x + (n.x - start.self.x) * sx,
            y: params.y + (n.y - start.self.y) * sy,
          },
        },
      ]),
    );
  }

  function onResizeEnd() {
    const others = resizeStart.current?.others ?? [];
    resizeStart.current = null;
    if (!others.length) return;
    store
      .getState()
      .triggerNodeChanges(
        others.map((n) => ({ id: n.id, type: "dimensions", resizing: false })),
      );
  }
  const text = data.label || LABEL_PLACEHOLDER;

  // Textarea overlays a hidden copy of the text in one grid cell, so the box
  // sizes from the text itself and nothing shifts when editing starts or ends.
  const label = (
    <span className="inline-grid max-w-full align-middle">
      <span
        className={`col-start-1 row-start-1 wrap-break-word whitespace-pre-wrap ${
          isEditing ? "invisible" : data.label ? "" : "text-copy-faint"
        }`}
      >
        {/* A trailing newline collapses unless something follows it. */}
        {text.endsWith("\n") ? `${text} ` : text}
      </span>
      {isEditing && (
        <textarea
          autoFocus
          // Default rows=2 would make the cell a line taller than the text and push it up.
          rows={1}
          value={data.label}
          placeholder={LABEL_PLACEHOLDER}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          onFocus={(e) =>
            e.currentTarget.setSelectionRange(
              e.currentTarget.value.length,
              e.currentTarget.value.length,
            )
          }
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
          aria-label="Node label"
          className="nodrag nopan nowheel col-start-1 row-start-1 h-full min-w-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-center [font:inherit] text-inherit outline-none placeholder:text-copy-faint"
        />
      )}
    </span>
  );

  return (
    <>
      {/* nodrag/nopan keep toolbar clicks from moving the node or the canvas. */}
      <NodeToolbar
        position={Position.Top}
        offset={10}
        className="nodrag nopan flex gap-1.5 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg"
      >
        {NODE_COLORS.map((c) => {
          const active = data.color === c.fill;
          return (
            <button
              key={c.fill}
              type="button"
              title={c.name}
              aria-label={`${c.name} color`}
              aria-pressed={active}
              onClick={() =>
                updateNodeData(id, { color: c.fill, textColor: c.text })
              }
              style={{
                backgroundColor: c.fill,
                borderColor: c.text,
                ["--swatch-glow" as string]: c.text,
              }}
              className={`size-5 rounded-full border transition-shadow hover:shadow-[0_0_6px_1px_var(--swatch-glow)] ${
                active
                  ? "ring-2 ring-copy-primary ring-offset-2 ring-offset-surface"
                  : ""
              }`}
            />
          );
        })}
      </NodeToolbar>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_SIZE}
        minHeight={MIN_NODE_SIZE}
        onResizeStart={onResizeStart}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
        color="var(--accent-primary)"
        lineStyle={{ borderColor: "var(--accent-primary)", opacity: 0.4 }}
        handleStyle={{
          width: 7,
          height: 7,
          borderRadius: 2,
          backgroundColor: "var(--bg-base)",
          borderColor: "var(--accent-primary)",
        }}
      />
      {/* Double-click anywhere on the node edits its label. */}
      <div
        className="nopan h-full w-full"
        onDoubleClick={() => setIsEditing(true)}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <ShapeView {...data} label={label} selected={selected} />
      </div>
      {/* Loose connection mode: every handle connects to any other. Shown when selected, hovered, or a connection target. */}
      {HANDLE_SIDES.map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={side}
          // Handles overhang the body, so they keep the hover state too.
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          className={`transition-opacity ${showHandles ? "opacity-100" : "opacity-0"}`}
          style={{
            width: 8,
            height: 8,
            backgroundColor: "#ffffff",
            border: "1.5px solid var(--bg-base)",
          }}
        />
      ))}
    </>
  );
}
