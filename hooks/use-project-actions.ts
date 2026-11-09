"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import type { ProjectSummary } from "@/lib/projects";
import { toSlug } from "@/lib/slug";

export type ProjectDialog =
  | { type: "create" }
  | { type: "rename"; project: ProjectSummary }
  | { type: "delete"; project: ProjectSummary };

// Project ID == Liveblocks room ID: slug of the name plus a short random suffix.
export function toRoomId(name: string, suffix: string) {
  const slug = toSlug(name).slice(0, 48).replace(/-+$/, "");
  return slug ? `${slug}-${suffix}` : suffix;
}

async function request(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
}

export function useProjectActions() {
  const router = useRouter();
  const { roomId: activeProjectId } = useParams<{ roomId?: string }>();
  // `dialog` is kept after closing so content doesn't vanish during the close animation.
  const [dialog, setDialog] = useState<ProjectDialog>({ type: "create" });
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function open(next: ProjectDialog) {
    setDialog(next);
    setName(next.type === "rename" ? next.project.name : "");
    if (next.type === "create") setSuffix(crypto.randomUUID().slice(0, 8));
    setError(null);
    setIsOpen(true);
  }

  function onOpenChange(next: boolean) {
    if (!isSubmitting) setIsOpen(next);
  }

  async function submit() {
    const trimmed = name.trim();
    if (dialog.type !== "delete" && !trimmed) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (dialog.type === "create") {
        const id = toRoomId(trimmed, suffix);
        await request("/api/projects", { method: "POST", body: JSON.stringify({ id, name: trimmed }) });
        setIsOpen(false);
        router.push(`/editor/${id}`);
      } else if (dialog.type === "rename") {
        await request(`/api/projects/${dialog.project.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        });
        setIsOpen(false);
        router.refresh();
      } else {
        await request(`/api/projects/${dialog.project.id}`, { method: "DELETE" });
        setIsOpen(false);
        if (dialog.project.id === activeProjectId) router.push("/editor");
        else router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    dialog,
    isOpen,
    name,
    roomId: toRoomId(name, suffix),
    error,
    isSubmitting,
    setName,
    onOpenChange,
    submit,
    openCreate: () => open({ type: "create" }),
    openRename: (project: ProjectSummary) => open({ type: "rename", project }),
    openDelete: (project: ProjectSummary) => open({ type: "delete", project }),
  };
}

export type ProjectActionsState = ReturnType<typeof useProjectActions>;
