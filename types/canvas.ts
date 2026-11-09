import type { Edge, Node } from "@xyflow/react";

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const;

export type NodeShape = (typeof NODE_SHAPES)[number];

export type CanvasNodeData = {
  label: string;
  color: string;
  // Optional: nodes created before feature 15 have no stored text color.
  textColor?: string;
  shape: NodeShape;
};

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

export type CanvasEdgeData = { label?: string };

export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">;

// Default edge color from ui-context.md.
export const EDGE_COLOR = "#f8fafc";

// Node fill/text pairs from ui-context.md; the first is the default.
export const NODE_COLORS = [
  { name: "Neutral", fill: "#1F1F1F", text: "#EDEDED" },
  { name: "Blue", fill: "#10233D", text: "#52A8FF" },
  { name: "Purple", fill: "#2E1938", text: "#BF7AF0" },
  { name: "Orange", fill: "#331B00", text: "#FF990A" },
  { name: "Red", fill: "#3C1618", text: "#FF6166" },
  { name: "Pink", fill: "#3A1726", text: "#F75F8F" },
  { name: "Green", fill: "#0F2E18", text: "#62C073" },
  { name: "Teal", fill: "#062822", text: "#0AC7B4" },
] as const;

export const DEFAULT_NODE_COLOR = NODE_COLORS[0].fill;
export const DEFAULT_NODE_TEXT_COLOR = NODE_COLORS[0].text;

export const SHAPE_DRAG_TYPE = "application/x-buildingblocks-shape";

export type ShapeDragPayload = {
  shape: NodeShape;
  width: number;
  height: number;
};
