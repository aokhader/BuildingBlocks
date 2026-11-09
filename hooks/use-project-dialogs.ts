"use client";

import { useState } from "react";

import { MOCK_PROJECTS, type Project } from "@/lib/mock-projects";
import { toSlug } from "@/lib/slug";

export type ProjectDialog =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project };

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  // `dialog` is kept after closing so content doesn't vanish during the close animation.
  const [dialog, setDialog] = useState<ProjectDialog>({ type: "create" });
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function open(next: ProjectDialog) {
    setDialog(next);
    setName(next.type === "rename" ? next.project.name : "");
    setIsOpen(true);
  }

  function onOpenChange(next: boolean) {
    if (!isSubmitting) setIsOpen(next);
  }

  async function submit() {
    const trimmed = name.trim();
    if (dialog.type !== "delete" && !trimmed) return;

    setIsSubmitting(true);
    // shortcut: simulated latency with local state only, replace with API calls when persistence lands.
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (dialog.type === "create") {
      const project = { id: crypto.randomUUID(), name: trimmed, slug: toSlug(trimmed), isOwner: true };
      setProjects((prev) => [project, ...prev]);
    } else if (dialog.type === "rename") {
      const { id } = dialog.project;
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: trimmed, slug: toSlug(trimmed) } : p))
      );
    } else {
      const { id } = dialog.project;
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }

    setIsSubmitting(false);
    setIsOpen(false);
  }

  return {
    projects,
    dialog,
    isOpen,
    name,
    isSubmitting,
    setName,
    onOpenChange,
    submit,
    openCreate: () => open({ type: "create" }),
    openRename: (project: Project) => open({ type: "rename", project }),
    openDelete: (project: Project) => open({ type: "delete", project }),
  };
}

export type ProjectDialogsState = ReturnType<typeof useProjectDialogs>;
