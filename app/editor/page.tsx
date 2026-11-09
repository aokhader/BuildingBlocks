import { auth, currentUser } from "@clerk/nextjs/server";

import { EditorShell } from "@/components/editor/editor-shell";
import { getProjects } from "@/lib/projects";

export default async function EditorPage() {
  const user = await currentUser();
  if (!user) return (await auth()).redirectToSignIn();

  const { owned, shared } = await getProjects(user.id, user.primaryEmailAddress?.emailAddress);
  return <EditorShell owned={owned} shared={shared} />;
}
