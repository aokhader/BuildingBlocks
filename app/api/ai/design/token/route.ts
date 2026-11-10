import { auth } from "@trigger.dev/sdk";

import { getCurrentIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const { runId } = (body ?? {}) as Record<string, unknown>;
  if (typeof runId !== "string" || !runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  // Only the user who started the run gets a token for it.
  const run = await prisma.taskRun.findFirst({
    where: { runId, userId: identity.userId },
    select: { id: true },
  });
  if (!run) return Response.json({ error: "Not found" }, { status: 404 });

  const token = await auth.createPublicToken({ scopes: { read: { runs: [runId] } } });
  return Response.json({ token });
}
