import type { FormEvent } from "react";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectDialogsState } from "@/hooks/use-project-dialogs";
import { toSlug } from "@/lib/slug";

const FORM_ID = "project-dialog-form";

export function ProjectDialogs({
  dialog,
  isOpen,
  name,
  isSubmitting,
  setName,
  onOpenChange,
  submit,
}: ProjectDialogsState) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  const copy = {
    create: {
      title: "Create project",
      description: "Name your new architecture workspace.",
      action: "Create",
    },
    rename: {
      title: "Rename project",
      description: dialog.type === "rename" ? `Current name: ${dialog.project.name}` : "",
      action: "Rename",
    },
    delete: {
      title: "Delete project",
      description:
        dialog.type === "delete"
          ? `"${dialog.project.name}" will be permanently deleted. This cannot be undone.`
          : "",
      action: "Delete",
    },
  }[dialog.type];

  return (
    <EditorDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant={dialog.type === "delete" ? "destructive" : "default"}
            disabled={isSubmitting || (dialog.type !== "delete" && !name.trim())}
          >
            {isSubmitting ? `${copy.action}…` : copy.action}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-2">
        {dialog.type !== "delete" && (
          <>
            <Input
              aria-label="Project name"
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              disabled={isSubmitting}
              className="rounded-xl"
            />
            <p className="text-xs text-copy-muted">
              Slug:{" "}
              {dialog.type === "rename" && dialog.project.slug !== toSlug(name) && (
                <span className="font-mono text-copy-faint line-through">
                  {dialog.project.slug}
                </span>
              )}{" "}
              <span className="font-mono text-copy-secondary">{toSlug(name) || "—"}</span>
            </p>
          </>
        )}
      </form>
    </EditorDialog>
  );
}
