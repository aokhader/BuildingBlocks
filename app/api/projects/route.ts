import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_NAME = "Untitled Project";
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ projects });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // An empty or missing body is allowed: the name falls back to the default.
  const body: unknown = await req.json().catch(() => ({}));
  const name = body && typeof body === "object" && "name" in body ? body.name : undefined;
  if (name !== undefined && name !== null && typeof name !== "string") {
    return Response.json({ error: "name must be a string" }, { status: 400 });
  }

  // Optional client-chosen ID (the Liveblocks room ID); omitted falls back to the schema cuid.
  const id = body && typeof body === "object" && "id" in body ? body.id : undefined;
  if (id !== undefined && (typeof id !== "string" || id.length > 64 || !ID_PATTERN.test(id))) {
    return Response.json(
      { error: "id must be at most 64 lowercase letters, digits, and dashes" },
      { status: 400 }
    );
  }

  try {
    const project = await prisma.project.create({
      data: { id, ownerId: userId, name: name?.trim() || DEFAULT_NAME },
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "id already exists" }, { status: 409 });
    }
    throw error;
  }
}
