"use client";

import { useEffect, useState } from "react";

import type { Collaborator } from "@/lib/collaborators";

async function readError(res: Response) {
  const body = await res.json().catch(() => null);
  return body?.error ?? `Request failed (${res.status})`;
}

// Loads the collaborator list while the share dialog is open; owners can invite/remove.
export function useCollaborators(projectId: string, isOpen: boolean) {
  // null until the first load; refreshed (keeping the old list visible) on every open.
  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [owner, setOwner] = useState<Collaborator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = `/api/projects/${projectId}/collaborators`;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        const body: {
          isOwner: boolean;
          owner: Collaborator | null;
          collaborators: Collaborator[];
        } = await res.json();
        if (cancelled) return;
        setIsOwner(body.isOwner);
        setOwner(body.owner);
        setCollaborators(body.collaborators);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load collaborators");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, url]);

  async function mutate(run: () => Promise<Response>, onOk: (res: Response) => Promise<void>) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await run();
      if (!res.ok) throw new Error(await readError(res));
      await onOk(res);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  const invite = (email: string) =>
    mutate(
      () =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }),
      async (res) => setCollaborators((await res.json()).collaborators)
    );

  const remove = (email: string) =>
    mutate(
      () => fetch(`${url}?email=${encodeURIComponent(email)}`, { method: "DELETE" }),
      async () => setCollaborators((list) => list?.filter((c) => c.email !== email) ?? null)
    );

  return {
    collaborators: collaborators ?? [],
    owner,
    isOwner,
    isLoading: collaborators === null && !error,
    isSubmitting,
    error,
    invite,
    remove,
  };
}
