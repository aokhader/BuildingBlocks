import { z } from "zod";

// Shared AI status feed: background tasks (design, later spec generation) post here,
// and every participant's sidebar shows the latest message.
export const AI_STATUS_FEED_ID = "ai-status-feed";

export const AI_STATUS_VALUES = ["start", "processing", "complete", "error"] as const;

export type AiStatusMessage = {
  text?: string;
  status?: (typeof AI_STATUS_VALUES)[number];
  runId?: string;
};

// Feed data is arbitrary JSON from the room, so check it before rendering.
export function parseAiStatusMessage(data: unknown): AiStatusMessage | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const { text, status, runId } = data as Record<string, unknown>;
  if (text !== undefined && typeof text !== "string") return null;
  if (status !== undefined && !AI_STATUS_VALUES.includes(status as never)) return null;
  if (runId !== undefined && typeof runId !== "string") return null;
  return { text, status: status as AiStatusMessage["status"], runId };
}

// Room chat feed: human (and later AI) chat messages only. Kept separate from the status feed.
export const AI_CHAT_FEED_ID = "ai-chat";

export const aiChatMessageSchema = z.object({
  sender: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1),
  timestamp: z.number(),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

// Spec generation input. Nodes/edges are the client's React Flow JSON; only the fields the
// prompt reads are typed, the rest passes through.
const specNodeSchema = z.looseObject({
  id: z.string(),
  data: z.looseObject({ label: z.string().optional(), shape: z.string().optional() }).optional(),
});
const specEdgeSchema = z.looseObject({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  data: z.looseObject({ label: z.string().optional() }).optional(),
});

export const specRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(aiChatMessageSchema),
  nodes: z.array(specNodeSchema),
  edges: z.array(specEdgeSchema),
});

export const generateSpecPayloadSchema = specRequestSchema.extend({ projectId: z.string().min(1) });

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;
