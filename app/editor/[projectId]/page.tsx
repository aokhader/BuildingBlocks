import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { getProjects } from "@/lib/projects";

export default async function WorkspacePage({ params }: PageProps<"/editor/[projectId]">) {
  const user = await currentUser();
  if (!user) return (await auth()).redirectToSignIn();

  const [{ projectId }, { owned, shared }] = await Promise.all([
    params,
    getProjects(user.id, user.primaryEmailAddress?.emailAddress),
  ]);
  // Only owners and collaborators can open a workspace.
  const activeProject = [...owned, ...shared].find((p) => p.id === projectId);
  if (!activeProject) notFound();

  return <EditorShell owned={owned} shared={shared} activeProject={activeProject} />;
}
