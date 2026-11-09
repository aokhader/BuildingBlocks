import Link from "next/link";
import { FolderOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProjectSummary } from "@/lib/projects";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  owned: ProjectSummary[];
  shared: ProjectSummary[];
  activeProjectId?: string;
  onCreateProject: () => void;
  onRenameProject: (project: ProjectSummary) => void;
  onDeleteProject: (project: ProjectSummary) => void;
}

export function ProjectSidebar({
  isOpen,
  onClose,
  owned,
  shared,
  activeProjectId,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const itemProps = { onRename: onRenameProject, onDelete: onDeleteProject };

  return (
    <>
      {isOpen && (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-base/60 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        aria-label="Projects"
        inert={!isOpen}
        className={cn(
          "fixed top-14 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-surface-border bg-surface/90 backdrop-blur-md transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close sidebar">
            <X />
          </Button>
        </div>

        <Tabs defaultValue="mine" className="min-h-0 flex-1 px-4">
          <TabsList className="w-full">
            <TabsTrigger value="mine">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="overflow-y-auto">
            {owned.length ? (
              <ProjectList projects={owned} activeId={activeProjectId} {...itemProps} />
            ) : (
              <EmptyState icon={FolderOpen} message="No projects yet" />
            )}
          </TabsContent>
          <TabsContent value="shared" className="overflow-y-auto">
            {shared.length ? (
              <ProjectList projects={shared} activeId={activeProjectId} />
            ) : (
              <EmptyState icon={Users} message="No shared projects" />
            )}
          </TabsContent>
        </Tabs>

        <div className="p-4">
          <Button className="w-full" onClick={onCreateProject}>
            <Plus className="size-5" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}

interface ProjectListProps {
  projects: ProjectSummary[];
  activeId?: string;
  // Actions only for owned projects.
  onRename?: (project: ProjectSummary) => void;
  onDelete?: (project: ProjectSummary) => void;
}

function ProjectList({ projects, activeId, onRename, onDelete }: ProjectListProps) {
  return (
    <ul className="flex flex-col gap-1 py-2">
      {projects.map((project) => (
        <li
          key={project.id}
          className={cn(
            "flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-copy-secondary hover:bg-subtle",
            project.id === activeId && "bg-accent-dim text-brand hover:bg-accent-dim"
          )}
        >
          <Link
            href={`/editor/${project.id}`}
            aria-current={project.id === activeId ? "page" : undefined}
            className="flex-1 truncate hover:text-copy-primary"
          >
            {project.name}
          </Link>
          {onRename && onDelete && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRename(project)}
                aria-label={`Rename ${project.name}`}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onDelete(project)}
                aria-label={`Delete ${project.name}`}
                className="hover:text-error"
              >
                <Trash2 />
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof FolderOpen; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-copy-muted">
      <Icon className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
