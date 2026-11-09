import { prisma } from "@/lib/prisma";

const summary = { id: true, name: true } as const;

export type ProjectSummary = { id: string; name: string };

// Owned = ownerId matches the Clerk user; shared = the user's email is a collaborator.
export async function getProjects(userId: string, email: string | undefined) {
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      select: summary,
    }),
    email
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: { some: { email: { equals: email, mode: "insensitive" } } },
          },
          orderBy: { createdAt: "desc" },
          select: summary,
        })
      : [],
  ]);
  return { owned, shared };
}
