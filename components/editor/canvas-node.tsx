import type { NodeProps } from "@xyflow/react";

import type { CanvasNode as CanvasNodeType, NodeShape } from "@/types/canvas";

// SVG outlines in a 100x100 viewBox, stretched to the node size.
const SVG_SHAPES: Partial<Record<NodeShape, string>> = {
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

export function CanvasNode({ data, selected }: NodeProps<CanvasNodeType>) {
  const stroke = selected ? "var(--accent-primary)" : "var(--border-subtle)";
  const path = SVG_SHAPES[data.shape];

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center px-3 text-center text-sm ${
        path ? "" : `border ${CSS_RADIUS[data.shape]}`
      }`}
      style={{
        color: "#EDEDED",
        ...(!path && { backgroundColor: data.color, borderColor: stroke }),
      }}
    >
      {path && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <path d={path} fill={data.color} stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <span className="relative">{data.label}</span>
    </div>
  );
}
