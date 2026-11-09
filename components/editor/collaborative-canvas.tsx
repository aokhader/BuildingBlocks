"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
  useRoom,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  useEdges,
  useNodes,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Component,
  useEffect,
  useRef,
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
import {
  StarterTemplatesModal,
  type TemplateImportMode,
} from "@/components/editor/starter-templates-modal";
import {
  useCanvasAutosave,
  type SaveStatus,
  type SavedCanvas,
} from "@/hooks/use-canvas-autosave";
import { isEditable } from "@/hooks/use-keyboard-shortcuts";
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

export interface CanvasSave {
  status: SaveStatus;
  saveNow: () => Promise<boolean>;
}

interface CanvasProps {
  roomId: string;
  isTemplatesOpen: boolean;
  onTemplatesOpenChange: (open: boolean) => void;
  onSaveChange: (save: CanvasSave | undefined) => void;
}

export function CollaborativeCanvas(props: CanvasProps) {
  const { roomId } = props;
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
                <Canvas {...props} />
              </ReactFlowProvider>
            </ClientSideSuspense>
          </ThrowOnConnectionError>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function Canvas({
  roomId,
  isTemplatesOpen,
  onTemplatesOpenChange,
  onSaveChange,
}: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { screenToFlowPosition, fitView } = useReactFlow();
  const updateMyPresence = useUpdateMyPresence();
  const selection = useSelectionBox();
  const room = useRoom();
  const wrapperRef = useRef<HTMLDivElement>(null);
  // React Flow keeps a fitView queued until it has nodes, so on an empty canvas the first
  // drop would trigger it. Only fit on mount when the room already has nodes.
  const [fitOnMount] = useState(nodes.length > 0);

  function loadSaved(canvas: SavedCanvas) {
    onNodesChange(canvas.nodes.map((item) => ({ type: "add", item })));
    onEdgesChange(canvas.edges.map((item) => ({ type: "add", item })));
    // Same queueing: fitting an empty saved canvas would fire on the first drop.
    if (canvas.nodes.length) fitView();
  }

  // Delete/Backspace removes the selection through Liveblocks (React Flow's deleteKeyCode is off).
  // On window, not the wrapper div: after a pane click or box selection nothing inside has focus.
  const flowNodes = useNodes<CanvasNode>();
  const flowEdges = useEdges<CanvasEdge>();
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (isEditable(event.target)) return;
      const doomedNodes = flowNodes.filter((n) => n.selected);
      const ids = new Set(doomedNodes.map((n) => n.id));
      // Liveblocks' onDelete doesn't cascade, so include edges attached to deleted nodes.
      const doomedEdges = flowEdges.filter(
        (e) => e.selected || ids.has(e.source) || ids.has(e.target),
      );
      if (!doomedNodes.length && !doomedEdges.length) return;
      event.preventDefault();
      onDelete({ nodes: doomedNodes, edges: doomedEdges });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flowNodes, flowEdges, onDelete]);

  // Room ID == project ID.
  const { status, saveNow } = useCanvasAutosave(roomId, nodes, edges, loadSaved);
  useEffect(() => {
    onSaveChange({ status, saveNow });
    return () => onSaveChange(undefined);
  }, [status, saveNow, onSaveChange]);

  function onMouseMove(event: MouseEvent) {
    updateMyPresence({
      cursor: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    });
  }

  function importTemplate(template: CanvasTemplate, mode: TemplateImportMode) {
    // Fresh IDs per import, so importing the same template twice never collides.
    const suffix = Date.now().toString(36);
    const id = (base: string) => `${base}-${suffix}`;

    // "add": shift the template so its bounds are centered in the current view.
    let dx = 0;
    let dy = 0;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (mode === "add" && rect) {
      const target = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      const bounds = getNodesBounds(template.nodes);
      dx = Math.round(target.x - (bounds.x + bounds.width / 2));
      dy = Math.round(target.y - (bounds.y + bounds.height / 2));
    }
    const newNodes = template.nodes.map((n) => ({
      ...n,
      id: id(n.id),
      position: { x: n.position.x + dx, y: n.position.y + dy },
    }));
    const newEdges = template.edges.map((e) => ({
      ...e,
      id: id(e.id),
      source: id(e.source),
      target: id(e.target),
    }));

    // One batch = one undo step. Liveblocks ignores "remove" changes, so clearing uses onDelete.
    room.batch(() => {
      if (mode === "replace") {
        onDelete({ nodes, edges });
      } else {
        onNodesChange(
          flowNodes
            .filter((n) => n.selected)
            .map((n) => ({ type: "select", id: n.id, selected: false })),
        );
        onEdgesChange(
          flowEdges
            .filter((e) => e.selected)
            .map((e) => ({ type: "select", id: e.id, selected: false })),
        );
      }
      onNodesChange(newNodes.map((item) => ({ type: "add", item })));
      onEdgesChange(newEdges.map((item) => ({ type: "add", item })));
      // Pre-select the import so it can be dragged as a group (selection is local to this user).
      onNodesChange(
        newNodes.map((n) => ({ type: "select", id: n.id, selected: true })),
      );
      onEdgesChange(
        newEdges.map((e) => ({ type: "select", id: e.id, selected: true })),
      );
    });
    // React Flow queues this until the new nodes are measured.
    if (mode === "replace") fitView({ duration: 200 });
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
      ref={wrapperRef}
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
        // Keyboard deletion is handled above so it always goes through Liveblocks.
        deleteKeyCode={null}
        onMouseMove={onMouseMove}
        onMouseLeave={() => updateMyPresence({ cursor: null })}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        // Double-click edits node and edge labels. React Flow binds dblclick zoom directly on the pane, so nopan can't block it.
        zoomOnDoubleClick={false}
        fitView={fitOnMount}
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
        <ShapePanel saveStatus={status} />
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
