"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
} from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Component, useState, type DragEvent, type ReactNode } from "react";

import { CanvasNode as CanvasNodeView } from "@/components/editor/canvas-node";
import { ShapePanel } from "@/components/editor/shape-panel";
import {
  DEFAULT_NODE_COLOR,
  NODE_SHAPES,
  SHAPE_DRAG_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas";

const nodeTypes: NodeTypes = { canvasNode: CanvasNodeView };

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

export function CollaborativeCanvas({ roomId }: { roomId: string }) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <CanvasErrorBoundary>
          <ThrowOnConnectionError>
            <ClientSideSuspense
              fallback={<CanvasMessage>Loading canvas…</CanvasMessage>}
            >
              <ReactFlowProvider>
                <Canvas />
              </ReactFlowProvider>
            </ClientSideSuspense>
          </ThrowOnConnectionError>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { screenToFlowPosition } = useReactFlow();

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
          data: { label: "", color: DEFAULT_NODE_COLOR, shape },
        },
      },
    ]);
  }

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        colorMode="dark"
        // React Flow's dark mode paints #141414 over the page; keep the canvas flush with --bg-base.
        className="[--xy-background-color:var(--bg-base)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="var(--border-subtle)" />
        <MiniMap
          bgColor="var(--bg-surface)"
          maskColor="rgba(8, 8, 9, 0.6)"
          nodeColor="var(--bg-subtle)"
          className="overflow-hidden rounded-xl border border-surface-border"
        />
        <ShapePanel />
      </ReactFlow>
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
