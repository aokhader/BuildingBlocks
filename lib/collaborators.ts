import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface Collaborator {
  email: string;
  name: string | null;
  imageUrl: string | null;
}

// Emails are stored lowercase; display data comes from Clerk (no local user table).
export async function listCollaborators(projectId: string): Promise<Collaborator[]> {
  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });
  if (!rows.length) return [];

  const emails = rows.map((r) => r.email);
  const byEmail = new Map<string, { name: string | null; imageUrl: string }>();
  try {
    const client = await clerkClient();
    // shortcut: one page of 100 users; fine while projects have fewer collaborators than that.
    const { data } = await client.users.getUserList({ emailAddress: emails, limit: 100 });
    for (const user of data) {
      for (const address of user.emailAddresses) {
        byEmail.set(address.emailAddress.toLowerCase(), {
          name: user.fullName ?? user.username,
          imageUrl: user.imageUrl,
        });
      }
    }
  } catch (err) {
    // Clerk outage shouldn't hide the list; fall back to emails only.
    console.error("Clerk user lookup failed", err);
  }

  return emails.map((email) => {
    const user = byEmail.get(email.toLowerCase());
    return { email, name: user?.name ?? null, imageUrl: user?.imageUrl ?? null };
  });
}

// Owner comes from Clerk by user ID; null when the project or Clerk user is missing.
export async function getProjectOwner(projectId: string): Promise<Collaborator | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return null;
  try {
    const user = await (await clerkClient()).users.getUser(project.ownerId);
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) return null;
    return { email, name: user.fullName ?? user.username, imageUrl: user.imageUrl };
  } catch (err) {
    console.error("Clerk owner lookup failed", err);
    return null;
  }
}

// Returns false when the email is already a collaborator.
export async function addCollaborator(projectId: string, email: string): Promise<boolean> {
  const existing = await prisma.projectCollaborator.findFirst({
    where: { projectId, email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return false;
  await prisma.projectCollaborator.create({ data: { projectId, email } });
  return true;
}

export async function removeCollaborator(projectId: string, email: string) {
  await prisma.projectCollaborator.deleteMany({
    where: { projectId, email: { equals: email, mode: "insensitive" } },
  });
}
