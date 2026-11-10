import { getCurrentIdentity, getProjectRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

type Context = RouteContext<"/api/projects/[projectId]/specs">;

// Metadata only (newest first); filePath stays server-side, content comes from the download route.
export async function GET(_req: Request, ctx: Context) {
  const identity = await getCurrentIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await ctx.params;
  if (!(await getProjectRole(projectId, identity))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  return Response.json({ specs });
}
