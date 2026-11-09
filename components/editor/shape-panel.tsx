"use client";

import { Panel, useStore } from "@xyflow/react";
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useRef, type DragEvent } from "react";

import { ShapeView } from "@/components/editor/canvas-node";
import type { SaveStatus } from "@/hooks/use-canvas-autosave";

const SAVE_STATUS_TEXT: Record<SaveStatus, string> = {
  saving: "Saving…",
  saved: "All changes saved",
  error: "Autosave failed",
};

import {
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_TYPE,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas";

export const SHAPES: {
  shape: NodeShape;
  label: string;
  icon: LucideIcon;
  width: number;
  height: number;
}[] = [
  {
    shape: "rectangle",
    label: "Rectangle",
    icon: RectangleHorizontal,
    width: 160,
    height: 80,
  },
  {
    shape: "diamond",
    label: "Diamond",
    icon: Diamond,
    width: 160,
    height: 160,
  },
  { shape: "circle", label: "Circle", icon: Circle, width: 100, height: 100 },
  { shape: "pill", label: "Pill", icon: Pill, width: 160, height: 64 },
  {
    shape: "cylinder",
    label: "Cylinder",
    icon: Cylinder,
    width: 120,
    height: 100,
  },
  {
    shape: "hexagon",
    label: "Hexagon",
    icon: Hexagon,
    width: 150,
    height: 100,
  },
];

export function ShapePanel({ saveStatus }: { saveStatus?: SaveStatus }) {
  // Ghost matches the on-screen size of the node that the drop will create.
  const zoom = useStore((state) => state.transform[2]);
  const ghosts = useRef<Partial<Record<NodeShape, HTMLDivElement | null>>>({});

  function onDragStart(event: DragEvent, payload: ShapeDragPayload) {
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";
    const ghost = ghosts.current[payload.shape];
    if (ghost) {
      // Native drag image: follows the cursor, removed by the browser on drop or cancel.
      event.dataTransfer.setDragImage(
        ghost,
        (payload.width * zoom) / 2,
        (payload.height * zoom) / 2,
      );
    }
  }

  return (
    <>
      <Panel
        position="bottom-center"
        className="flex flex-col items-center gap-1.5"
      >
        {saveStatus && (
          <p
            role="status"
            className={`text-xs ${saveStatus === "error" ? "text-error" : "text-copy-muted"}`}
          >
            {SAVE_STATUS_TEXT[saveStatus]}
          </p>
        )}
        <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 backdrop-blur">
          {SHAPES.map(({ shape, label, icon: Icon, width, height }) => (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) =>
                onDragStart(event, { shape, width, height })
              }
              title={`Drag to add ${label.toLowerCase()}`}
              aria-label={`Add ${label.toLowerCase()}`}
              className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </Panel>
      {/* Off-screen but rendered: setDragImage needs a painted element. */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[9999px]"
      >
        {SHAPES.map(({ shape, width, height }) => (
          <div
            key={shape}
            ref={(el) => {
              ghosts.current[shape] = el;
            }}
            style={{ width: width * zoom, height: height * zoom }}
          >
            <ShapeView shape={shape} color={DEFAULT_NODE_COLOR} />
          </div>
        ))}
      </div>
    </>
  );
}
