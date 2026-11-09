import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorShell } from "@/components/editor/editor-shell";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { getProjects } from "@/lib/projects";

export default async function WorkspacePage({ params }: PageProps<"/editor/[roomId]">) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");

  const { roomId } = await params;
  const [activeProject, { owned, shared }] = await Promise.all([
    getAccessibleProject(roomId, identity),
    getProjects(identity.userId, identity.email),
  ]);
  // Missing and forbidden look the same so project IDs can't be probed.
  if (!activeProject) return <AccessDenied />;

  return <EditorShell owned={owned} shared={shared} activeProject={activeProject} />;
}
