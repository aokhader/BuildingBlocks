"use client";

import { Check, Link2, Loader2, Mail, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollaborators } from "@/hooks/use-collaborators";
import type { Collaborator } from "@/lib/collaborators";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ projectId, open, onOpenChange }: ShareDialogProps) {
  const { collaborators, owner, isOwner, isLoading, isSubmitting, error, invite, remove } =
    useCollaborators(projectId, open);

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share project"
      description={
        isOwner
          ? "Invite collaborators, copy the workspace link, and manage access."
          : "People with access to this project. Only the owner can manage access."
      }
    >
      <div className="-mx-6 border-t border-surface-border" />
      <div className="flex flex-col gap-4">
        <LinkSection projectId={projectId} />
        {isOwner && <InviteSection onInvite={invite} isSubmitting={isSubmitting} />}
        {error && (
          <p role="alert" className="text-xs text-error">
            {error}
          </p>
        )}
        <PeopleSection
          owner={owner}
          collaborators={collaborators}
          isLoading={isLoading}
          onRemove={isOwner ? (email) => void remove(email) : undefined}
          isSubmitting={isSubmitting}
        />
      </div>
    </EditorDialog>
  );
}

const card = "rounded-2xl border border-surface-border bg-surface p-4";

function LinkSection({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyLink() {
    try{
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${projectId}`);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  }

  return (
    <section className={cn(card, "flex items-center gap-4")}>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-copy-primary">Workspace link</h3>
        <p className="text-xs text-copy-muted">
          Share a direct link with teammates after you grant them access.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 rounded-xl">
        {copied ? <Check /> : <Link2 />}
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </section>
  );
}

interface InviteSectionProps {
  onInvite: (email: string) => Promise<boolean>;
  isSubmitting: boolean;
}

function InviteSection({ onInvite, isSubmitting }: InviteSectionProps) {
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (await onInvite(email.trim())) setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className={cn(card, "flex gap-2")}>
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-copy-muted" />
        <Input
          type="email"
          aria-label="Collaborator email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          className="rounded-xl pl-9"
        />
      </div>
      <Button type="submit" disabled={isSubmitting || !email.trim()} className="rounded-xl">
        Invite
      </Button>
    </form>
  );
}

interface PeopleSectionProps {
  owner: Collaborator | null;
  collaborators: Collaborator[];
  isLoading: boolean;
  onRemove?: (email: string) => void;
  isSubmitting: boolean;
}

function PeopleSection({
  owner,
  collaborators,
  isLoading,
  onRemove,
  isSubmitting,
}: PeopleSectionProps) {
  const total = collaborators.length + (owner ? 1 : 0);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-copy-primary">People with access</h3>
        {!isLoading && <span className="text-xs text-copy-muted">{total} total</span>}
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-copy-muted" />
      ) : (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {owner && <PersonRow person={owner} role="owner" />}
          {collaborators.map((c) => (
            <PersonRow
              key={c.email}
              person={c}
              role="collaborator"
              onRemove={onRemove && (() => onRemove(c.email))}
              disabled={isSubmitting}
            />
          ))}
          {!collaborators.length && (
            <li className="py-2 text-center text-sm text-copy-muted">No collaborators yet</li>
          )}
        </ul>
      )}
    </section>
  );
}

interface PersonRowProps {
  person: Collaborator;
  role: "owner" | "collaborator";
  onRemove?: () => void;
  disabled?: boolean;
}

function PersonRow({ person, role, onRemove, disabled }: PersonRowProps) {
  const { email, name, imageUrl } = person;
  return (
    <li className={cn(card, "flex items-center gap-3 py-3")}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, no remotePatterns config
        <img src={imageUrl} alt="" className="size-9 shrink-0 rounded-full" />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-medium text-copy-secondary uppercase">
          {email[0]}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-copy-primary">{name ?? email}</p>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase",
              role === "owner"
                ? "border-brand/40 bg-accent-dim text-brand"
                : "border-surface-border-subtle text-copy-muted"
            )}
          >
            {role}
          </span>
        </div>
        <p className="truncate text-xs text-copy-muted">{email}</p>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${email}`}
          className="text-error hover:text-error"
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}
