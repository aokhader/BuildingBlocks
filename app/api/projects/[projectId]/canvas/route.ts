import { get, put } from "@vercel/blob";

import { getCurrentIdentity, getProjectRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

type Context = RouteContext<"/api/projects/[projectId]/canvas">;

// Owner or collaborator: both edit the canvas.
async function checkAccess(ctx: Context): Promise<{ id: string } | { error: Response }> {
  const identity = await getCurrentIdentity();
  if (!identity) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };

  const { projectId } = await ctx.params;
  if (!(await getProjectRole(projectId, identity))) {
    return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  }
  return { id: projectId };
}

export async function GET(_req: Request, ctx: Context) {
  const access = await checkAccess(ctx);
  if ("error" in access) return access.error;

  const project = await prisma.project.findUnique({
    where: { id: access.id },
    select: { canvasJsonPath: true },
  });
  if (!project?.canvasJsonPath) return Response.json({ canvas: null });

  // The blob is overwritten in place, so skip the CDN cache to read the latest save.
  const blob = await get(project.canvasJsonPath, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200) return Response.json({ canvas: null });
  const canvas: unknown = await new Response(blob.stream).json();
  return Response.json({ canvas });
}

export async function PUT(req: Request, ctx: Context) {
  const access = await checkAccess(ctx);
  if ("error" in access) return access.error;

  const body: unknown = await req.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("nodes" in body) ||
    !("edges" in body) ||
    !Array.isArray(body.nodes) ||
    !Array.isArray(body.edges)
  ) {
    return Response.json({ error: "nodes and edges arrays are required" }, { status: 400 });
  }

  // Private store: one blob per project, overwritten on every save.
  const blob = await put(
    `canvas/${access.id}.json`,
    JSON.stringify({ nodes: body.nodes, edges: body.edges }),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    }
  );
  await prisma.project.update({
    where: { id: access.id },
    data: { canvasJsonPath: blob.url },
  });
  return Response.json({ url: blob.url });
}
