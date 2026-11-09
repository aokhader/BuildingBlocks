"use client";

import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense";
import { Panel, useReactFlow } from "@xyflow/react";
import {
  Maximize,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const DURATION = 200;

export function CanvasControls() {
  const flow = useReactFlow();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  useKeyboardShortcuts(flow, undo, redo);

  return (
    <Panel
      position="bottom-left"
      className="z-10 flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 backdrop-blur"
    >
      <ControlButton
        icon={ZoomOut}
        label="Zoom out"
        onClick={() => flow.zoomOut({ duration: DURATION })}
      />
      <ControlButton
        icon={Maximize}
        label="Fit view"
        onClick={() => flow.fitView({ duration: DURATION })}
      />
      <ControlButton
        icon={ZoomIn}
        label="Zoom in"
        onClick={() => flow.zoomIn({ duration: DURATION })}
      />
      <div aria-hidden className="mx-1 h-5 w-px bg-surface-border" />
      <ControlButton
        icon={Undo2}
        label="Undo"
        onClick={undo}
        disabled={!canUndo}
      />
      <ControlButton
        icon={Redo2}
        label="Redo"
        onClick={redo}
        disabled={!canRedo}
      />
    </Panel>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
