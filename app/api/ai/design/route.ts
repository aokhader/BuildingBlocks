import { tasks } from "@trigger.dev/sdk";

import { getCurrentIdentity, getProjectRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { designAgent } from "@/trigger/design-agent";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const { prompt, roomId, projectId } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    typeof roomId !== "string" ||
    typeof projectId !== "string"
  ) {
    return Response.json({ error: "prompt, roomId and projectId are required" }, { status: 400 });
  }
  // Room ID == project ID; checking it stops a run targeting a room the user can't access.
  if (roomId !== projectId) {
    return Response.json({ error: "roomId must match projectId" }, { status: 400 });
  }
  if (!(await getProjectRole(projectId, identity))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", {
    prompt: prompt.trim(),
    roomId,
  });
  await prisma.taskRun.create({
    data: { runId: handle.id, projectId, userId: identity.userId },
  });
  return Response.json({ runId: handle.id });
}
