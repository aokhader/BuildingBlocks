"use client";

import { Download } from "lucide-react";

import { SVG_SHAPES } from "@/components/editor/canvas-node";
import { EditorDialog } from "@/components/editor/editor-dialog";
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EDGE_COLOR, type CanvasNode } from "@/types/canvas";

interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (template: CanvasTemplate) => void;
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Starter templates"
      description="Start from a pre-built diagram. Importing replaces everything on the current canvas."
      className="sm:max-w-3xl"
    >
      <ScrollArea className="max-h-[60vh]">
        <div className="grid gap-3 sm:grid-cols-2">
          {CANVAS_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-3"
            >
              <TemplatePreview template={template} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-copy-primary">{template.name}</h3>
                <p className="mt-1 text-sm text-copy-muted">{template.description}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onImport(template);
                  onOpenChange(false);
                }}
              >
                <Download />
                Import
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </EditorDialog>
  );
}

const PREVIEW_PADDING = 24;

const center = (n: CanvasNode) => ({
  x: n.position.x + (n.width ?? 0) / 2,
  y: n.position.y + (n.height ?? 0) / 2,
});

// Plain SVG: the viewBox is the template's bounds, so the browser fits it to the fixed-size box.
function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const { nodes, edges } = template;
  const minX = Math.min(...nodes.map((n) => n.position.x)) - PREVIEW_PADDING;
  const minY = Math.min(...nodes.map((n) => n.position.y)) - PREVIEW_PADDING;
  const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width ?? 0))) + PREVIEW_PADDING;
  const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height ?? 0))) + PREVIEW_PADDING;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="h-40 w-full rounded-xl bg-base"
      aria-hidden
    >
      {edges.map((e) => {
        const source = byId.get(e.source);
        const target = byId.get(e.target);
        if (!source || !target) return null;
        const a = center(source);
        const b = center(target);
        return (
          <line
            key={e.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={EDGE_COLOR}
            strokeOpacity={0.5}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {nodes.map((n) => {
        const { x, y } = n.position;
        const w = n.width ?? 0;
        const h = n.height ?? 0;
        const path = SVG_SHAPES[n.data.shape];
        const shared = {
          fill: n.data.color,
          stroke: "var(--border-subtle)",
          strokeWidth: 1,
          vectorEffect: "non-scaling-stroke" as const,
        };
        if (path)
          return (
            <path
              key={n.id}
              d={path}
              transform={`translate(${x} ${y}) scale(${w / 100} ${h / 100})`}
              {...shared}
            />
          );
        // Same radii as the node's CSS: rounded-xl, or rounded-full (clamps to half the short side).
        const radius = n.data.shape === "rectangle" ? 12 : Math.min(w, h) / 2;
        return <rect key={n.id} x={x} y={y} width={w} height={h} rx={radius} {...shared} />;
      })}
    </svg>
  );
}
