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
  shape: NodeShape;
};

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

export type CanvasEdge = Edge<Record<string, never>, "canvasEdge">;

// Neutral dark fill from the node palette in ui-context.md.
export const DEFAULT_NODE_COLOR = "#1F1F1F";

export const SHAPE_DRAG_TYPE = "application/x-buildingblocks-shape";

export type ShapeDragPayload = {
  shape: NodeShape;
  width: number;
  height: number;
};
