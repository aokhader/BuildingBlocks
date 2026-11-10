import { get } from "@vercel/blob";

import { getCurrentIdentity, getProjectRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

type Context = RouteContext<"/api/projects/[projectId]/specs/[specId]/download">;

// Streams the private blob through this route so the Blob URL is never exposed to the client.
export async function GET(_req: Request, ctx: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, specId } = await ctx.params;
  // Missing project and no access both 404, like the other project routes, so IDs can't be probed.
  if (!(await getProjectRole(projectId, identity))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const spec = await prisma.projectSpec.findFirst({
    where: { id: specId, projectId },
    select: { filePath: true },
  });
  if (!spec) return Response.json({ error: "Not found" }, { status: 404 });

  const blob = await get(spec.filePath, { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${projectId}-spec.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}
