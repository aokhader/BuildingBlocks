"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { ProjectSummary } from "@/lib/projects";

interface EditorShellProps {
  owned: ProjectSummary[];
  shared: ProjectSummary[];
  // Set inside a workspace; the home page shows the create prompt instead.
  activeProject?: ProjectSummary;
}

export function EditorShell({ owned, shared, activeProject }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const actions = useProjectActions();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        owned={owned}
        shared={shared}
        onCreateProject={actions.openCreate}
        onRenameProject={actions.openRename}
        onDeleteProject={actions.openDelete}
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {activeProject ? (
          // shortcut: placeholder until the canvas feature lands.
          <h1 className="text-2xl font-semibold text-copy-primary">{activeProject.name}</h1>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-copy-primary">
              Create a project or open an existing one
            </h1>
            <p className="text-copy-muted">
              Start a new architecture workspace, or choose a project from the sidebar.
            </p>
            <Button onClick={actions.openCreate}>
              <Plus />
              New Project
            </Button>
          </>
        )}
      </main>

      <ProjectDialogs {...actions} />
    </div>
  );
}
