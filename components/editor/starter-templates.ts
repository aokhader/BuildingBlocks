import { defaultEdgeOptions } from "@/components/editor/canvas-edge";
import { SHAPES } from "@/components/editor/shape-panel";
import {
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas";

export type CanvasTemplate = {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

type ColorName = (typeof NODE_COLORS)[number]["name"];
type Side = "top" | "right" | "bottom" | "left";

// Same default size per shape as a node dropped from the shape panel.
function node(
  id: string,
  label: string,
  shape: NodeShape,
  x: number,
  y: number,
  colorName: ColorName = "Neutral",
): CanvasNode {
  const { width, height } = SHAPES.find((s) => s.shape === shape)!;
  const color = NODE_COLORS.find((c) => c.name === colorName)!;
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width,
    height,
    data: { label, shape, color: color.fill, textColor: color.text },
  };
}

// Matches what a user-drawn connection gets from defaultEdgeOptions.
function edge(
  source: string,
  target: string,
  label?: string,
  sourceHandle: Side = "right",
  targetHandle: Side = "left",
): CanvasEdge {
  return {
    ...defaultEdgeOptions,
    id: `${source}-${target}`,
    type: "canvasEdge",
    source,
    target,
    sourceHandle,
    targetHandle,
    data: label ? { label } : {},
  };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description:
      "Clients reach services through an API gateway; each service owns its data.",
    nodes: [
      node("client", "Client", "pill", 0, 160, "Blue"),
      node("gateway", "API Gateway", "rectangle", 240, 152, "Purple"),
      node("auth", "Auth Service", "rectangle", 480, 0, "Teal"),
      node("orders", "Orders Service", "rectangle", 480, 152, "Orange"),
      node("payments", "Payments Service", "rectangle", 480, 304, "Green"),
      node("auth-db", "Users DB", "cylinder", 720, -10),
      node("orders-db", "Orders DB", "cylinder", 720, 142),
      node("queue", "Message Queue", "hexagon", 705, 294, "Pink"),
    ],
    edges: [
      edge("client", "gateway", "HTTPS"),
      edge("gateway", "auth"),
      edge("gateway", "orders"),
      edge("gateway", "payments"),
      edge("auth", "auth-db"),
      edge("orders", "orders-db"),
      edge("payments", "queue", "events"),
    ],
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "A commit is built and tested, then promoted to staging and production.",
    nodes: [
      node("commit", "Commit", "circle", 0, 30),
      node("build", "Build", "rectangle", 160, 40, "Blue"),
      node("test", "Run Tests", "rectangle", 380, 40, "Purple"),
      node("gate", "Tests pass?", "diamond", 600, 0),
      node("staging", "Deploy Staging", "rectangle", 820, 40, "Orange"),
      node("production", "Production", "hexagon", 1040, 30, "Green"),
      node("notify", "Notify Team", "pill", 600, 240, "Red"),
    ],
    edges: [
      edge("commit", "build"),
      edge("build", "test"),
      edge("test", "gate"),
      edge("gate", "staging", "pass"),
      edge("staging", "production", "approve"),
      edge("gate", "notify", "fail", "bottom", "top"),
    ],
  },
  {
    id: "event-driven",
    name: "Event-Driven System",
    description:
      "Producers publish to an event bus; independent consumers react to events.",
    nodes: [
      node("order-svc", "Order Service", "rectangle", 0, 0, "Blue"),
      node("inventory-svc", "Inventory Service", "rectangle", 0, 160, "Blue"),
      node("bus", "Event Bus", "hexagon", 260, 70, "Purple"),
      node("store", "Event Store", "cylinder", 275, 260),
      node("email", "Email Worker", "rectangle", 500, -40, "Orange"),
      node("analytics", "Analytics", "rectangle", 500, 80, "Teal"),
      node("search", "Search Indexer", "rectangle", 500, 200, "Green"),
    ],
    edges: [
      edge("order-svc", "bus", "order.created"),
      edge("inventory-svc", "bus", "stock.updated"),
      edge("bus", "store", undefined, "bottom", "top"),
      edge("bus", "email"),
      edge("bus", "analytics"),
      edge("bus", "search"),
    ],
  },
];
