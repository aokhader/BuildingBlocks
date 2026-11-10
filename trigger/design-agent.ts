import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { logger, task } from "@trigger.dev/sdk";
import { generateText, jsonSchema, Output } from "ai";

import { getLiveblocks } from "../lib/liveblocks";
import {
  EDGE_COLOR,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "../types/canvas";
import { AI_STATUS_FEED_ID, type AiStatusMessage } from "../types/tasks";

export type DesignAgentPayload = { prompt: string; roomId: string };

const AI_USER_ID = "buildingblocks-ai";
const AI_USER_INFO = { name: "BuildingBlocks AI", avatar: "", color: "#6457f9" }; // --accent-ai

// Same defaults as the shape panel (`SHAPES` in shape-panel.tsx, a client module).
const SHAPE_SIZES: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 160, height: 160 },
  circle: { width: 100, height: 100 },
  pill: { width: 160, height: 64 },
  cylinder: { width: 120, height: 100 },
  hexagon: { width: 150, height: 100 },
};
const SIDES = ["top", "right", "bottom", "left"] as const;
type Side = (typeof SIDES)[number];
const COLOR_NAMES = NODE_COLORS.map((c) => c.name);

// Same as `defaultEdgeOptions` in canvas-edge.tsx (a client module).
const EDGE_DEFAULTS = {
  type: "canvasEdge",
  markerEnd: { type: "arrowclosed", color: EDGE_COLOR },
  style: { stroke: EDGE_COLOR, strokeWidth: 1.5, strokeLinecap: "round" },
} as const;

type Action = {
  type:
    | "addNode"
    | "moveNode"
    | "resizeNode"
    | "updateNode"
    | "deleteNode"
    | "addEdge"
    | "deleteEdge";
  id?: string;
  label?: string;
  shape?: NodeShape;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  source?: string;
  target?: string;
  sourceHandle?: Side;
  targetHandle?: Side;
};
type Plan = { summary: string; actions: Action[] };

// Flat action object: simpler for Gemini structured output than a union.
const planSchema = jsonSchema<Plan>({
  type: "object",
  properties: {
    summary: { type: "string", description: "One sentence describing what changed." },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["addNode", "moveNode", "resizeNode", "updateNode", "deleteNode", "addEdge", "deleteEdge"],
          },
          id: { type: "string", description: "Node or edge ID. For addNode, a new short ID like 'api'." },
          label: { type: "string" },
          shape: { type: "string", enum: [...NODE_SHAPES] },
          color: { type: "string", enum: COLOR_NAMES },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          source: { type: "string", description: "Source node ID (addEdge)." },
          target: { type: "string", description: "Target node ID (addEdge)." },
          sourceHandle: { type: "string", enum: [...SIDES] },
          targetHandle: { type: "string", enum: [...SIDES] },
        },
        required: ["type"],
      },
    },
  },
  required: ["summary", "actions"],
});

const SYSTEM = `You are BuildingBlocks AI, a system design assistant editing a shared architecture canvas.
Return a plan of canvas actions that fulfils the user's request, given the current canvas.

Actions:
- addNode: id, label, shape, color, x, y (top-left), optional width/height
- moveNode: id, x, y
- resizeNode: id, width, height
- updateNode: id, and any of label, shape, color
- deleteNode: id (its edges are removed too)
- addEdge: source, target, optional label, sourceHandle, targetHandle
- deleteEdge: id

Shapes and their meaning (default size in px):
- rectangle (160x80): services, apps, generic components
- cylinder (120x100): databases, storage
- hexagon (150x100): queues, event buses, brokers
- diamond (160x160): decisions, routers, gateways
- pill (160x64): clients, users, external actors
- circle (100x100): start/end points, small utilities
Omit width/height to use the default size.

Colors (use them consistently by role): ${COLOR_NAMES.join(", ")}.
Neutral = generic, Blue = services/apps, Purple = data stores, Orange = queues/async, Green = clients/entry points, Red = security/auth, Teal = infra/networking, Pink = third-party.

Layout and spacing:
- Flow left to right (or top to bottom for pipelines); place nodes on a grid.
- Keep at least 80px horizontal and 60px vertical gap between nodes; never overlap nodes.
- Align nodes in the same tier on the same x (columns) or y (rows).
- New content must not overlap existing nodes: place it beside them.
- Prefer sourceHandle "right" / targetHandle "left" for left-to-right flows, "bottom"/"top" for vertical.

Rules:
- Only reference IDs that exist on the canvas or that you add earlier in the same plan.
- Labels are short (1-4 words). Edge labels describe the interaction (e.g. "REST", "publishes").
- Change only what the request needs; keep existing content otherwise.`;

const clampSize = (n: number | undefined, fallback: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 40), 800) : fallback;
const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const colorPair = (name?: string) => NODE_COLORS.find((c) => c.name === name);

export const designAgent = task({
  id: "design-agent",
  // Canvas edits are not idempotent; a retry would apply the plan twice.
  retry: { maxAttempts: 1 },
  maxDuration: 300,
  run: async (payload: DesignAgentPayload, { ctx }) => {
    const { prompt, roomId } = payload;
    // Payloads can come from the dashboard/API untyped; a missing roomId otherwise becomes a Liveblocks 404 on "rooms/undefined".
    if (typeof roomId !== "string" || !roomId || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error(`Invalid payload: expected { prompt: string, roomId: string }, got keys [${Object.keys(payload ?? {}).join(", ")}]`);
    }
    const runId = ctx.run.id;
    const liveblocks = getLiveblocks();
    const flowOptions = { client: liveblocks, roomId };

    const setPresence = (
      cursor: { x: number; y: number } | null,
      thinking: boolean,
      ttl = 120,
    ) =>
      liveblocks.setPresence(roomId, {
        userId: AI_USER_ID,
        userInfo: AI_USER_INFO,
        data: { cursor, thinking },
        ttl,
      });

    // Status/presence updates are best-effort: they must never fail the canvas work.
    const status = async (s: AiStatusMessage["status"], text: string) => {
      try {
        await liveblocks.createFeedMessage<AiStatusMessage>({
          roomId,
          feedId: AI_STATUS_FEED_ID,
          data: { runId, status: s, text },
        });
      } catch (error) {
        logger.warn("Status feed update failed", { error: String(error) });
      }
    };
    const presence = (cursor: { x: number; y: number } | null, thinking: boolean) =>
      setPresence(cursor, thinking).catch((error) =>
        logger.warn("Presence update failed", { error: String(error) }),
      );

    // The feed must exist before messages can be added; an existing one is fine.
    await liveblocks
      .createFeed({ roomId, feedId: AI_STATUS_FEED_ID })
      .catch(() => undefined);

    try {
      await status("start", `Working on: "${prompt}"`);

      let nodes: readonly CanvasNode[] = [];
      let edges: readonly CanvasEdge[] = [];
      await mutateFlow<CanvasNode, CanvasEdge>(flowOptions, (flow) => {
        ({ nodes, edges } = flow.toJSON());
      });

      const center = nodes.length
        ? {
            x: nodes.reduce((s, n) => s + n.position.x, 0) / nodes.length,
            y: nodes.reduce((s, n) => s + n.position.y, 0) / nodes.length,
          }
        : { x: 0, y: 0 };
      await presence(center, true);
      await status("processing", "Planning the design…");

      const canvas = {
        nodes: nodes.map((n) => ({
          id: n.id,
          label: n.data.label,
          shape: n.data.shape,
          color: NODE_COLORS.find((c) => c.fill === n.data.color)?.name ?? "Neutral",
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          width: n.width ?? n.measured?.width,
          height: n.height ?? n.measured?.height,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.data?.label })),
      };

      // .env.local names the key GOOGLE_AI_API_KEY; the spec calls it GEMINI_API_KEY.
      const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY (or GOOGLE_AI_API_KEY) is not set");
      const google = createGoogleGenerativeAI({ apiKey });
      const { output: plan } = await generateText({
        model: google("gemini-3.5-flash"),
        system: SYSTEM,
        prompt: `Current canvas:\n${JSON.stringify(canvas)}\n\nRequest: ${prompt}`,
        output: Output.object({ schema: planSchema }),
      });

      const actions = Array.isArray(plan?.actions) ? plan.actions : [];
      logger.log("Plan", { summary: plan?.summary, count: actions.length });
      if (!actions.length) {
        await status("complete", plan?.summary || "No changes were needed.");
        return { applied: 0, skipped: 0 };
      }
      await status("processing", `Applying ${actions.length} change${actions.length === 1 ? "" : "s"}…`);

      // Model IDs for new nodes map to unique canvas IDs.
      const stamp = Date.now().toString(36);
      const nodeIds = new Map<string, string>();
      const resolve = (id?: string) => (id ? (nodeIds.get(id) ?? id) : undefined);
      let applied = 0;
      let skipped = 0;
      let edgeCount = 0;

      for (const action of actions) {
        let cursor: { x: number; y: number } | null = null;
        let ok = false;
        // Each action is its own mutation so collaborators see the design build up.
        await mutateFlow<CanvasNode, CanvasEdge>(flowOptions, (flow) => {
          const id = resolve(action.id);
          const node = id ? flow.getNode(id) : undefined;
          switch (action.type) {
            case "addNode": {
              const shape = NODE_SHAPES.includes(action.shape!) ? action.shape! : "rectangle";
              if (!action.id || !isNum(action.x) || !isNum(action.y)) return;
              const size = SHAPE_SIZES[shape];
              const color = colorPair(action.color) ?? NODE_COLORS[0];
              const newId = `ai-${stamp}-${action.id}`.slice(0, 64);
              nodeIds.set(action.id, newId);
              const width = clampSize(action.width, size.width);
              const height = clampSize(action.height, size.height);
              flow.addNode({
                id: newId,
                type: "canvasNode",
                position: { x: action.x, y: action.y },
                width,
                height,
                data: { label: action.label ?? "", shape, color: color.fill, textColor: color.text },
              });
              cursor = { x: action.x + width / 2, y: action.y + height / 2 };
              ok = true;
              return;
            }
            case "moveNode": {
              if (!node || !isNum(action.x) || !isNum(action.y)) return;
              flow.updateNode(node.id, { position: { x: action.x, y: action.y } });
              cursor = { x: action.x, y: action.y };
              ok = true;
              return;
            }
            case "resizeNode": {
              if (!node) return;
              flow.updateNode(node.id, {
                width: clampSize(action.width, node.width ?? 160),
                height: clampSize(action.height, node.height ?? 80),
              });
              cursor = node.position;
              ok = true;
              return;
            }
            case "updateNode": {
              if (!node) return;
              const color = colorPair(action.color);
              flow.updateNodeData(node.id, {
                ...(typeof action.label === "string" && { label: action.label }),
                ...(action.shape && NODE_SHAPES.includes(action.shape) && { shape: action.shape }),
                ...(color && { color: color.fill, textColor: color.text }),
              });
              cursor = node.position;
              ok = true;
              return;
            }
            case "deleteNode": {
              if (!node) return;
              // Liveblocks doesn't cascade node removal to edges.
              flow.removeEdges(
                flow.edges.filter((e) => e.source === node.id || e.target === node.id).map((e) => e.id),
              );
              flow.removeNode(node.id);
              cursor = node.position;
              ok = true;
              return;
            }
            case "addEdge": {
              const source = flow.getNode(resolve(action.source) ?? "");
              const target = flow.getNode(resolve(action.target) ?? "");
              if (!source || !target || source.id === target.id) return;
              const sourceHandle = SIDES.includes(action.sourceHandle!) ? action.sourceHandle! : "right";
              const targetHandle = SIDES.includes(action.targetHandle!) ? action.targetHandle! : "left";
              flow.addEdge({
                ...EDGE_DEFAULTS,
                id: `ai-${stamp}-e${edgeCount++}`,
                source: source.id,
                target: target.id,
                sourceHandle,
                targetHandle,
                data: action.label ? { label: action.label } : {},
              });
              cursor = target.position;
              ok = true;
              return;
            }
            case "deleteEdge": {
              const edge = action.id ? flow.getEdge(action.id) : undefined;
              if (!edge) return;
              flow.removeEdge(edge.id);
              cursor = flow.getNode(edge.target)?.position ?? null;
              ok = true;
              return;
            }
          }
        });
        if (ok) {
          applied++;
          if (cursor) await presence(cursor, true);
        } else {
          skipped++;
          logger.warn("Skipped invalid action", { action });
        }
      }

      await status(
        "complete",
        `${plan?.summary || "Design updated."}${skipped ? ` (${skipped} invalid change${skipped === 1 ? "" : "s"} skipped)` : ""}`,
      );
      return { applied, skipped };
    } catch (error) {
      logger.error("Design agent failed", { error: String(error) });
      await status("error", "The AI couldn't finish this design. Please try again.");
      throw error;
    } finally {
      // No delete API for server presence: reset it and let the minimum TTL expire it.
      await setPresence(null, false, 2).catch(() => undefined);
    }
  },
});
