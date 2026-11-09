import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { ProjectSummary } from "@/lib/projects";

export type Identity = { userId: string; email: string | undefined };

export async function getCurrentIdentity(): Promise<Identity | null> {
  const user = await currentUser();
  return user ? { userId: user.id, email: user.primaryEmailAddress?.emailAddress } : null;
}

export type ProjectRole = "owner" | "collaborator";

// null when the project is missing or the user has no access.
export async function getProjectRole(
  projectId: string,
  identity: Identity
): Promise<ProjectRole | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessFilter(identity) },
    select: { ownerId: true },
  });
  if (!project) return null;
  return project.ownerId === identity.userId ? "owner" : "collaborator";
}

function accessFilter({ userId, email }: Identity) {
  return {
    OR: [
      { ownerId: userId },
      ...(email
        ? [{ collaborators: { some: { email: { equals: email, mode: "insensitive" as const } } } }]
        : []),
    ],
  };
}

// Returns the project if the user owns it or is a collaborator; null when missing or forbidden.
export function getAccessibleProject(
  projectId: string,
  identity: Identity
): Promise<ProjectSummary | null> {
  return prisma.project.findFirst({
    where: { id: projectId, ...accessFilter(identity) },
    select: { id: true, name: true },
  });
}
