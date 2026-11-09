"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Component,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { CanvasControls } from "@/components/editor/canvas-controls";
import {
  CanvasEdge as CanvasEdgeView,
  defaultEdgeOptions,
} from "@/components/editor/canvas-edge";
import { CanvasNode as CanvasNodeView } from "@/components/editor/canvas-node";
import { LiveCursors, PresenceAvatars } from "@/components/editor/presence";
import { ShapePanel } from "@/components/editor/shape-panel";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { useSelectionBox } from "@/hooks/use-selection-box";
import {
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  NODE_SHAPES,
  SHAPE_DRAG_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas";

const nodeTypes: NodeTypes = { canvasNode: CanvasNodeView };
const edgeTypes: EdgeTypes = { canvasEdge: CanvasEdgeView };

let nodeCounter = 0;

// Drag data can come from outside the app, so validate before trusting it.
function readShapePayload(event: DragEvent): ShapeDragPayload | null {
  try {
    const value = JSON.parse(
      event.dataTransfer.getData(SHAPE_DRAG_TYPE),
    ) as ShapeDragPayload;
    const validSize = (n: unknown) =>
      typeof n === "number" && n > 0 && n <= 2000;
    if (
      NODE_SHAPES.includes(value.shape) &&
      validSize(value.width) &&
      validSize(value.height)
    )
      return value;
  } catch {}
  return null;
}

interface TemplatesModalProps {
  isTemplatesOpen: boolean;
  onTemplatesOpenChange: (open: boolean) => void;
}

export function CollaborativeCanvas({
  roomId,
  ...templatesModal
}: { roomId: string } & TemplatesModalProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <CanvasErrorBoundary>
          <ThrowOnConnectionError>
            <ClientSideSuspense
              fallback={<CanvasMessage>Loading canvas…</CanvasMessage>}
            >
              <ReactFlowProvider>
                <Canvas {...templatesModal} />
              </ReactFlowProvider>
            </ClientSideSuspense>
          </ThrowOnConnectionError>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function Canvas({
  isTemplatesOpen,
  onTemplatesOpenChange,
}: TemplatesModalProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { screenToFlowPosition, fitView } = useReactFlow();
  const updateMyPresence = useUpdateMyPresence();
  const selection = useSelectionBox();

  function onMouseMove(event: MouseEvent) {
    updateMyPresence({
      cursor: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    });
  }

  function importTemplate(template: CanvasTemplate) {
    // Fresh IDs per import, so re-importing never collides with nodes still being removed.
    const suffix = Date.now().toString(36);
    const id = (base: string) => `${base}-${suffix}`;
    // Clear first: the template replaces the canvas instead of landing on top of it.
    onEdgesChange(edges.map((e) => ({ type: "remove", id: e.id })));
    onNodesChange(nodes.map((n) => ({ type: "remove", id: n.id })));
    onNodesChange(
      template.nodes.map((n) => ({
        type: "add",
        item: { ...n, id: id(n.id) },
      })),
    );
    onEdgesChange(
      template.edges.map((e) => ({
        type: "add",
        item: {
          ...e,
          id: id(e.id),
          source: id(e.source),
          target: id(e.target),
        },
      })),
    );
    // React Flow queues this until the new nodes are measured.
    fitView({ duration: 200 });
  }

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onDrop(event: DragEvent) {
    const payload = readShapePayload(event);
    if (!payload) return;
    event.preventDefault();
    const { shape, width, height } = payload;
    const center = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onNodesChange([
      {
        type: "add",
        item: {
          id: `${shape}-${Date.now()}-${nodeCounter++}`,
          type: "canvasNode",
          // Center the node on the cursor.
          position: { x: center.x - width / 2, y: center.y - height / 2 },
          width,
          height,
          data: {
            label: "",
            color: DEFAULT_NODE_COLOR,
            textColor: DEFAULT_NODE_TEXT_COLOR,
            shape,
          },
        },
      },
    ]);
  }

  return (
    <div
      className="h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
      {...selection.handlers}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        // Removing a node also removes its connected edges (React Flow passes both to onDelete).
        deleteKeyCode={["Delete", "Backspace"]}
        onMouseMove={onMouseMove}
        onMouseLeave={() => updateMyPresence({ cursor: null })}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        // Double-click edits node and edge labels. React Flow binds dblclick zoom directly on the pane, so nopan can't block it.
        zoomOnDoubleClick={false}
        fitView
        colorMode="dark"
        // React Flow's dark mode paints #141414 over the page; keep the canvas flush with --bg-base.
        className="[--xy-background-color:var(--bg-base)]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--border-subtle)"
        />
        <ShapePanel />
        <CanvasControls />
        <PresenceAvatars />
        <LiveCursors />
      </ReactFlow>
      {selection.box && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 border border-[#0078d7] bg-[#0078d7]/15"
          style={{
            left: Math.min(selection.box.x0, selection.box.x1),
            top: Math.min(selection.box.y0, selection.box.y1),
            width: Math.abs(selection.box.x1 - selection.box.x0),
            height: Math.abs(selection.box.y1 - selection.box.y0),
          }}
        />
      )}
      <StarterTemplatesModal
        open={isTemplatesOpen}
        onOpenChange={onTemplatesOpenChange}
        onImport={importTemplate}
      />
    </div>
  );
}

// A failed connection (e.g. auth 403) never resolves Storage, so suspense would wait forever;
// rethrow it during render so the error boundary shows instead.
function ThrowOnConnectionError({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  useErrorListener((err) => {
    if (err.context.type === "ROOM_CONNECTION_ERROR") setError(err);
  });
  if (error) throw error;
  return children;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasMessage>
          Couldn&apos;t connect to the canvas. Refresh to try again.
        </CanvasMessage>
      );
    }
    return this.props.children;
  }
}

function CanvasMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="text-copy-muted">{children}</p>
    </div>
  );
}
