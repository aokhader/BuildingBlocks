import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Context = RouteContext<"/api/projects/[projectId]">;

// Returns an error response unless the signed-in user owns the project.
async function checkOwner(ctx: Context): Promise<{ id: string } | { error: Response }> {
  const { userId } = await auth();
  if (!userId) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };

  const { projectId } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  if (project.ownerId !== userId) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { id: projectId };
}

export async function PATCH(req: Request, ctx: Context) {
  const owner = await checkOwner(ctx);
  if ("error" in owner) return owner.error;

  const body: unknown = await req.json().catch(() => null);
  const name =
    body && typeof body === "object" && "name" in body && typeof body.name === "string"
      ? body.name.trim()
      : "";
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const project = await prisma.project.update({ where: { id: owner.id }, data: { name } });
  return Response.json({ project });
}

export async function DELETE(_req: Request, ctx: Context) {
  const owner = await checkOwner(ctx);
  if ("error" in owner) return owner.error;

  await prisma.project.delete({ where: { id: owner.id } });
  return new Response(null, { status: 204 });
}
