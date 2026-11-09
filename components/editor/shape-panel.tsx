"use client";

import { Panel } from "@xyflow/react";
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { DragEvent } from "react";

import {
  SHAPE_DRAG_TYPE,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas";

const SHAPES: {
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

function onDragStart(event: DragEvent, payload: ShapeDragPayload) {
  event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = "move";
}

export function ShapePanel() {
  return (
    <Panel
      position="bottom-center"
      className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 backdrop-blur"
    >
      {SHAPES.map(({ shape, label, icon: Icon, width, height }) => (
        <button
          key={shape}
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, { shape, width, height })}
          title={`Drag to add ${label.toLowerCase()}`}
          aria-label={`Add ${label.toLowerCase()}`}
          className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </Panel>
  );
}
