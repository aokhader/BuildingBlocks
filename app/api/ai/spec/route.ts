import { tasks } from "@trigger.dev/sdk";

import { getCurrentIdentity, getProjectRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { generateSpec } from "@/trigger/generate-spec";
import { specRequestSchema } from "@/types/tasks";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = specRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "roomId, chatHistory, nodes and edges are required" }, { status: 400 });
  }
  const { roomId, chatHistory, nodes, edges } = parsed.data;

  // Room ID == project ID, so access is resolved from the room, never a client projectId.
  const projectId = roomId;
  if (!(await getProjectRole(projectId, identity))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId,
    roomId,
    chatHistory,
    nodes,
    edges,
  });
  await prisma.taskRun.create({
    data: { runId: handle.id, projectId, userId: identity.userId },
  });
  return Response.json({ runId: handle.id });
}
