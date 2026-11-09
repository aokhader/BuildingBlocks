"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type SaveStatus = "saving" | "saved" | "error";

export interface SavedCanvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const SAVE_DELAY_MS = 1500;
const EMPTY = snapshot([], []);

// Selection and drag/resize flags are per-user UI state, not diagram content; leaving them out
// keeps clicks from triggering saves.
function snapshot(nodes: CanvasNode[], edges: CanvasEdge[]) {
  return JSON.stringify({ nodes, edges }, (key, value) =>
    key === "selected" || key === "dragging" || key === "resizing" ? undefined : value
  );
}

/**
 * Loads the saved canvas into an empty room, then saves nodes and edges (debounced) through
 * `/api/projects/[projectId]/canvas`.
 */
export function useCanvasAutosave(
  projectId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  applySaved: (canvas: SavedCanvas) => void
) {
  const json = snapshot(nodes, edges);
  // Last snapshot known to be in storage. A room that already has nodes or edges skips the load
  // (so active collaboration isn't overwritten). undefined until the load finishes: autosave stays
  // off so an empty room can't overwrite the saved canvas before it's loaded.
  const [savedJson, setSavedJson] = useState<string | undefined>(() =>
    nodes.length || edges.length ? json : undefined
  );
  const [failedJson, setFailedJson] = useState<string>();
  const [loadFailed, setLoadFailed] = useState(false);
  const latest = useRef(json);
  useEffect(() => {
    latest.current = json;
  });

  useEffect(() => {
    if (savedJson !== undefined) return;
    let cancelled = false;
    fetch(`/api/projects/${projectId}/canvas`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then(({ canvas }: { canvas: Partial<SavedCanvas> | null }) => {
        if (cancelled) return;
        if (Array.isArray(canvas?.nodes) && Array.isArray(canvas?.edges)) {
          applySaved({ nodes: canvas.nodes, edges: canvas.edges });
        }
        setSavedJson(EMPTY);
      })
      // Leave autosave off: saving now could replace the stored canvas with an empty one.
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
    // Runs once per mount; later renders must not reload over live edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (body: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) throw new Error(res.statusText);
        setSavedJson(body);
        setFailedJson(undefined);
        return true;
      } catch {
        setFailedJson(body);
        return false;
      }
    },
    [projectId]
  );

  // Debounce: each change restarts the timer, so a burst of edits is one write.
  useEffect(() => {
    if (savedJson === undefined || json === savedJson || json === failedJson) return;
    const timer = setTimeout(() => void save(json), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [json, savedJson, failedJson, save]);

  // Manual save, independent of the autosave timer. Resolves false before the saved canvas has
  // loaded, since saving then could overwrite it with an empty room.
  const saveNow = useCallback(
    async () => (savedJson === undefined ? false : save(latest.current)),
    [save, savedJson]
  );

  const status: SaveStatus =
    loadFailed || json === failedJson
      ? "error"
      : savedJson === undefined || json === savedJson
        ? "saved"
        : "saving";

  return { status, saveNow };
}
