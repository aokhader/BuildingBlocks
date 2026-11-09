"use client";

import type { ReactFlowInstance } from "@xyflow/react";
import { useEffect } from "react";

const ZOOM_DURATION = 200;

export function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

export function useKeyboardShortcuts(
  flow: Pick<ReactFlowInstance, "zoomIn" | "zoomOut">,
  undo: () => void,
  redo: () => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditable(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        redo();
      } else if (!mod && (key === "+" || key === "=")) {
        // Without a modifier only: Ctrl/Cmd +/- is the browser's page zoom.
        flow.zoomIn({ duration: ZOOM_DURATION });
      } else if (!mod && key === "-") {
        flow.zoomOut({ duration: ZOOM_DURATION });
      } else {
        return;
      }
      event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flow, undo, redo]);
}
