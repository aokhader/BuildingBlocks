"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { CollaborativeCanvas } from "@/components/editor/collaborative-canvas";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { ProjectSummary } from "@/lib/projects";
import { cn } from "@/lib/utils";

interface EditorShellProps {
  owned: ProjectSummary[];
  shared: ProjectSummary[];
  // Set inside a workspace; the home page shows the create prompt instead.
  activeProject?: ProjectSummary;
}

export function EditorShell({ owned, shared, activeProject }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const actions = useProjectActions();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        {...(activeProject && {
          projectName: activeProject.name,
          isAiSidebarOpen,
          onToggleAiSidebar: () => setIsAiSidebarOpen((open) => !open),
          onShare: () => setIsShareOpen(true),
        })}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        owned={owned}
        shared={shared}
        activeProjectId={activeProject?.id}
        onCreateProject={actions.openCreate}
        onRenameProject={actions.openRename}
        onDeleteProject={actions.openDelete}
      />

      {activeProject ? (
        <>
          <main className="min-h-0 flex-1 bg-base">
            <CollaborativeCanvas key={activeProject.id} roomId={activeProject.id} />
          </main>
          <aside
            aria-label="AI assistant"
            inert={!isAiSidebarOpen}
            className={cn(
              "fixed top-14 right-0 bottom-0 z-40 flex w-80 flex-col items-center justify-center gap-3 border-l border-surface-border bg-surface/90 px-6 text-center backdrop-blur-md transition-[translate,visibility,box-shadow] duration-200",
              isAiSidebarOpen
                ? "translate-x-0 shadow-2xl shadow-black/50"
                : "invisible translate-x-full"
            )}
          >
            <Sparkles className="h-8 w-8 text-ai-text" />
            <p className="text-sm text-copy-muted">AI chat coming soon</p>
          </aside>
          <ShareDialog
            key={activeProject.id}
            projectId={activeProject.id}
            open={isShareOpen}
            onOpenChange={setIsShareOpen}
          />
        </>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
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
        </main>
      )}

      <ProjectDialogs {...actions} />
    </div>
  );
}
