# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation

## Current Goal

- Feature 29: Spec UI integration (`context/feature-specs/29-spec-ui-integration.md`) — done

## Completed

- 01 Design system: shadcn/ui (Radix base) with Button/Card/Dialog/Input/Tabs/Textarea/ScrollArea, lucide-react, `lib/utils.ts` `cn()`, dark theme tokens in `globals.css`
- 02 Editor chrome:
  - [x] `components/editor/editor-navbar.tsx` — fixed-height navbar, left/center/right sections, sidebar toggle (`PanelLeftOpen`/`PanelLeftClose`)
  - [x] `components/editor/project-sidebar.tsx` — floating left overlay, slide-in, `isOpen` prop, header + close, My Projects/Shared tabs with empty states, full-width `New Project` button
  - [x] `components/editor/editor-dialog.tsx` — dialog pattern (title, description, footer actions) styled with project tokens; no concrete dialogs yet
  - [x] Typecheck and lint clean
- 03 Auth (Clerk):
  - [x] `@clerk/ui` installed; `ClerkProvider` wraps root layout with `dark` theme, appearance variables mapped to `globals.css` tokens
  - [x] `proxy.ts` at root: everything protected except paths under `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
  - [x] `app/(auth)/` two-panel layout (logo, tagline, text feature list | centered Clerk form); `sign-in/[[...sign-in]]`, `sign-up/[[...sign-up]]`
  - [x] `/` redirects to `/editor` (signed in) or the sign-in URL (signed out)
  - [x] `app/editor/page.tsx` mounts `EditorNavbar` + `ProjectSidebar`; `UserButton` in navbar right section
  - [x] `npm run build`, typecheck, lint clean; verified `/` and `/editor` redirect to sign-in when signed out
- 04 Project dialogs:
  - [x] `/editor` home: centered heading, description, `New Project` (`Plus`) button opens Create dialog
  - [x] `components/editor/project-dialogs.tsx` — Create (name + live slug preview), Rename (prefilled, current name in description, autofocus, Enter submits), Delete (confirm only, destructive button)
  - [x] `hooks/use-project-dialogs.ts` — dialog, form, and loading state; local mock mutations with simulated latency
  - [x] Sidebar lists mock projects; rename/delete actions only on owned projects; sidebar `New Project` opens Create; mobile scrim closes sidebar on tap outside
  - [x] `lib/slug.ts` `toSlug()`, `lib/mock-projects.ts` mock data
  - [x] `npm run build`, typecheck, lint clean
- 05 Prisma:
  - [x] `prisma/models/project.prisma` — `Project` (ownerId = Clerk user ID, name, description?, `ProjectStatus` DRAFT/ARCHIVED, canvasJsonPath?, timestamps; indexes on ownerId, createdAt) and `ProjectCollaborator` (project relation with cascade delete, email, createdAt; unique projectId+email; indexes on email, projectId+createdAt)
  - [x] `lib/prisma.ts` — cached singleton; `prisma+postgres://` URLs use `accelerateUrl`, others use `@prisma/adapter-pg`; cached on `global` outside production
  - [x] Migration `20261109040925_init` applied; client generated to `app/generated/prisma`
  - [x] `npm run build`, typecheck, lint clean
- 06 Project APIs (backend only, UI not wired):
  - [x] `app/api/projects/route.ts` — `GET` lists the caller's projects (newest first); `POST` creates with `ownerId` = Clerk user ID, name trimmed, missing/blank name defaults to `Untitled Project`, cuid IDs from the schema; `201`
  - [x] `app/api/projects/[projectId]/route.ts` — `PATCH` renames (`name` required, `400` otherwise); `DELETE` returns `204`; both check ownership: `401` signed out, `404` missing, `403` non-owner
  - [x] Responses: `{ projects }`, `{ project }`, errors `{ error }`
  - [x] `proxy.ts` returns JSON `401` for signed-out `/api/*` requests instead of Clerk's redirect/404
  - [x] `npm run build`, lint clean; verified signed-out GET/POST/PATCH/DELETE return `401`
- 07 Wire editor home:
  - [x] `lib/projects.ts` `getProjects(userId, email)` — owned (ownerId) + shared (collaborator email, case-insensitive, excluding owned), newest first, `{ id, name }` only
  - [x] `/editor` and new `/editor/[projectId]` are server components: fetch via `currentUser()` + `getProjects`, render client `components/editor/editor-shell.tsx`; workspace page `notFound()`s unless the user owns or collaborates on the project (canvas is a placeholder heading)
  - [x] `hooks/use-project-actions.ts` (replaces `use-project-dialogs.ts`) — dialog state, name input, 8-char random suffix per create, `toRoomId(name, suffix)` = slug (≤48 chars) + suffix; create `POST`s `{ id, name }` then navigates to `/editor/[id]`; rename `PATCH` + `router.refresh()`; delete `DELETE` then `/editor` if active workspace, else refresh; API errors shown in the dialog
  - [x] `POST /api/projects` accepts optional `id` (≤64 chars, lowercase/digits/dashes; `400` otherwise, `409` on duplicate) so project ID == Liveblocks room ID
  - [x] Sidebar takes `owned`/`shared` lists; items link to `/editor/[id]`; rename/delete only on owned. Create dialog shows room ID preview; rename pre-fills name (no slug preview: room ID never changes on rename); delete names the project
  - [x] Removed `lib/mock-projects.ts`
  - [x] `npm run build`, typecheck, lint clean
- 08 Editor workspace shell:
  - [x] Route renamed `app/editor/[projectId]` → `app/editor/[roomId]` (URL unchanged; project ID == room ID). API routes keep `[projectId]`
  - [x] `lib/project-access.ts` — `getCurrentIdentity()` (Clerk `userId` + primary email, or `null`) and `getAccessibleProject(projectId, identity)` (owner or collaborator email, case-insensitive; `null` if missing or forbidden)
  - [x] `/editor/[roomId]` server page: signed out → `redirect("/sign-in")`; missing or unauthorized → `components/editor/access-denied.tsx` (centered, `Lock` icon, message, link to `/editor`)
  - [x] Full-viewport (`h-dvh`) workspace: navbar shows project name + Share button (no behavior) + AI sidebar toggle (`Sparkles`); `ProjectSidebar` highlights the current room (`activeProjectId`, `aria-current`); canvas placeholder fills remaining space; right AI sidebar placeholder is a fixed slide-over (`inert` when closed)
  - [x] `npm run build`, typecheck, lint clean
- 09 Share dialog:
  - [x] `lib/project-access.ts` `getProjectRole(projectId, identity)` → `"owner" | "collaborator" | null` (shares the access filter with `getAccessibleProject`)
  - [x] `lib/collaborators.ts` — `listCollaborators` (DB emails enriched via Clerk `users.getUserList({ emailAddress })` with `fullName ?? username` + `imageUrl`; email-only fallback when no Clerk user or Clerk fails), `addCollaborator` (case-insensitive duplicate check), `removeCollaborator`. No local user table
  - [x] `app/api/projects/[projectId]/collaborators/route.ts` — `GET` (owner or collaborator) `{ isOwner, collaborators }`; `POST { email }` (owner only, `201` + updated list, `400` invalid/own email, `409` duplicate); `DELETE ?email=` (owner only, `204`). `401` signed out, `404` missing or no access, `403` collaborator trying to manage. Emails stored trimmed + lowercase
  - [x] `hooks/use-collaborators.ts` — loads on dialog open, invite/remove with inline API errors
  - [x] `components/editor/share-dialog.tsx` — owner: invite form, list with remove buttons; collaborator: read-only list; avatar (Clerk image or initial), name + email; `Copy link` → `Copied!` for 2s. Opened from the navbar `Share` button
  - [x] Dialog split into bordered `rounded-2xl` cards (header divider, Workspace link card, invite card with `Mail` icon, "People with access" + total count, one card per person with `OWNER`/`COLLABORATOR` badge and `Trash2` remove). `GET` also returns `owner` (Clerk lookup by `ownerId` via `getProjectOwner`; `null` hides the row)
  - [x] Fixed `use-project-actions` still reading the old `projectId` route param (now `roomId`), which broke the redirect after deleting the open project
  - [x] `npm run build`, typecheck, lint clean
- 10 Liveblocks setup:
  - [x] `liveblocks.config.ts` — Presence `{ cursor: { x, y } | null, isThinking }`; UserMeta `{ id, info: { name, avatar, color } }`. Unused type slots (Storage, RoomEvent, ...) omitted: empty `{}` fails lint
  - [x] `@liveblocks/node` installed (spec assumed it was; only client/react packages were present)
  - [x] `lib/liveblocks.ts` — `getLiveblocks()` lazily creates the node client from `LIVEBLOCKS_SECRET_KEY`, cached on `global` (lazy so `next build` doesn't need the secret); `getUserColor(userId)` hashes the ID into a fixed 10-color palette
  - [x] `POST /api/liveblocks-auth` — body `{ room }` (room ID == project ID); `401` signed out, `400` missing room, `403` no project access (`getProjectRole`); `getOrCreateRoom(room, { defaultAccesses: [] })`; access-token session with `FULL_ACCESS` on that room and `userInfo` `{ name (fullName ?? username ?? email), avatar (Clerk imageUrl), color }`
  - [x] `npm run build`, typecheck, lint clean
- 11 Base canvas:
  - [x] `types/canvas.ts` — `NODE_SHAPES`, `CanvasNodeData` `{ label, color, shape }`, `CanvasNode` (type `canvasNode`), `CanvasEdge` (type `canvasEdge`)
  - [x] `components/editor/collaborative-canvas.tsx` (client) — `LiveblocksProvider` (`/api/liveblocks-auth`) → `RoomProvider` (room = project ID, presence `{ cursor: null, isThinking: false }`) → error boundary → `ClientSideSuspense` ("Loading canvas…")
  - [x] Connection errors: `useErrorListener` rethrows `ROOM_CONNECTION_ERROR` during render (outside the suspense boundary) so the fallback shows instead of loading forever
  - [x] `useLiveblocksFlow<CanvasNode, CanvasEdge>({ suspense: true })` with empty initial nodes/edges, wired into `ReactFlow` (loose connection mode, `fitView`, dark color mode, `MiniMap`, dots `Background`)
  - [x] Workspace page stays server-side; `EditorShell` replaces the placeholder with the canvas (keyed by project ID)
  - [x] `npm run build`, lint clean
- 12 Shape panel:
  - [x] `components/editor/shape-panel.tsx` — React Flow `Panel` at bottom-center, pill toolbar of draggable icon buttons (rectangle 160×80, diamond 160×160, circle 100×100, pill 160×64, cylinder 120×100, hexagon 150×100)
  - [x] Drag payload `{ shape, width, height }` as JSON under `SHAPE_DRAG_TYPE` (`types/canvas.ts`, with `ShapeDragPayload` and `DEFAULT_NODE_COLOR` `#1F1F1F`)
  - [x] Canvas wrapper handles `dragover`/`drop`; payload validated (known shape, sane size), `screenToFlowPosition` (canvas wrapped in `ReactFlowProvider`), node centered on cursor and added via `onNodesChange([{ type: "add" }])` so it syncs to Liveblocks
  - [x] Node: ID `${shape}-${Date.now()}-${counter}`, type `canvasNode`, `width`/`height` from payload, data `{ label: "", color: DEFAULT_NODE_COLOR, shape }`
  - [x] `components/editor/canvas-node.tsx` — every shape is a bordered rectangle with centered label (border turns brand cyan when selected); registered as `nodeTypes.canvasNode`
  - [x] `npm run build`, lint clean
- 13 Node shape:
  - [x] `canvas-node.tsx` exports `ShapeView` (shape, color, label?, selected?): rectangle/circle/pill via CSS radius + border; diamond/hexagon/cylinder via SVG paths in a 100x100 viewBox stretched to the node (`preserveAspectRatio="none"`, non-scaling stroke). Border `--border-subtle` at rest, `--accent-primary` when selected. `CanvasNode` renders `ShapeView` from `data`, still synced via Liveblocks
  - [x] Shape panel drag ghost: one off-screen `ShapeView` per shape at default size x current zoom; `onDragStart` passes it to `dataTransfer.setDragImage`, centered on the cursor (matches where the drop centers the node). The browser removes the image on drop or cancel. Node creation unchanged
  - [x] `npm run build`, lint clean
- 14 Node editing:
  - [x] `CanvasNode` renders React Flow `NodeResizer` while selected: 7px dark handles with cyan border, faint cyan outline, min 40x40. Resize emits `dimensions`/`position` changes through the existing `onNodesChange`, synced by Liveblocks
  - [x] Inline label: double-click anywhere on the node (a `nopan` wrapper around `ShapeView`) opens a `textarea` overlaid on a hidden copy of the text in one CSS grid cell (box sizes from the text, no layout shift); `Label` placeholder in `text-copy-faint` when empty. Typing calls `updateNodeData` (a `replace` change, synced by Liveblocks); blur or `Escape` closes. Textarea has `nodrag nopan nowheel`
  - [x] `ShapeView` `label` prop widened to `ReactNode`; shape rendering, shape panel, drag ghost and node creation unchanged
  - [x] Deletion (spec item 4, added later): `deleteKeyCode={["Delete", "Backspace"]}` (Backspace was the existing default). React Flow passes the selected nodes plus their connected edges to Liveblocks `onDelete`, one mutation = one undo step
  - [x] Multi-select (spec item 5): `hooks/use-selection-box.ts` — right-drag on the pane draws a fixed-position Windows-blue box (`#0078d7`); live-selects nodes it touches (`getIntersectingNodes`, partial) and edges whose rendered path crosses it (24 sampled points per path in screen space) plus edges between two selected nodes; applied as `select` changes. Browser context menu suppressed on the pane. React Flow's built-in box is left-button only, which pans here
  - [x] Selection as a unit: dragging moves all selected (React Flow default, one paused-history batch); resizing one selected node maps the others through the same scale (position relative to the resized node's start rect, size x scale, min 40) via `triggerNodeChanges` with `resizing: true`, so the whole group resize is one undo step; Delete removes all selected and their edges
  - [x] `npm run build`, lint clean
- 15 Node color toolbar:
  - [x] `types/canvas.ts` `NODE_COLORS` — 8 `{ name, fill, text }` pairs from `ui-context.md` (not in `globals.css`); `DEFAULT_NODE_COLOR`/`DEFAULT_NODE_TEXT_COLOR` are the first pair. `CanvasNodeData.textColor` is optional (older nodes fall back to the default text color); new nodes store both
  - [x] `CanvasNode` renders React Flow `NodeToolbar` (top, 10px offset; shown when the node is the only selected one) with one round swatch per pair: fill background, text-color border, active = `ring-copy-primary` with offset, hover = tight `0 0 6px 1px` glow in the text color. Toolbar has `nodrag nopan`
  - [x] Swatch click calls `updateNodeData(id, { color, textColor })` (Liveblocks-synced, no server calls); `ShapeView` takes `textColor` for the label
  - [x] `npm run build`, lint clean
- 16 Edge behavior:
  - [x] `CanvasNode` renders four `Handle`s (top/right/bottom/left, all `type="source"` with the side as ID; loose mode connects any to any): 8px white dots with a dark border, hidden by default and faded in while the node is selected, hovered (pointer state on the body and the handles), or the target of an in-progress connection (`useConnection` `toNode`)
  - [x] `ReactFlow` `defaultEdgeOptions`: type `canvasEdge`, `ArrowClosed` end marker, stroke `EDGE_COLOR` (`#f8fafc`, `types/canvas.ts`) 1.5px with round caps. React Flow merges these into the connection before `onConnect`, and Liveblocks' `addEdge` keeps them
  - [x] `components/editor/canvas-edge.tsx` (`edgeTypes.canvasEdge`): `getSmoothStepPath` right-angle routing, `BaseEdge` at 50% opacity at rest and 100% when hovered or selected, `interactionWidth={24}` hit area
  - [x] Labels: double-click the edge or its label opens an input in `EdgeLabelRenderer`, placed at the `getSmoothStepPath` `labelX`/`labelY` midpoint; `size` grows with the text; blur/Enter/Escape saves via `updateEdgeData` (the `onEdgesChange` replace flow, synced by Liveblocks). Saved labels are pill badges; a hovered or selected edge with no label shows a faint "Double-click to label" hint. Label wrapper is `nodrag nopan`
  - [x] `CanvasEdge` data is now `{ label?: string }`
  - [x] `npm run build`, lint clean
- 17 Canvas ergonomics:
  - [x] `components/editor/canvas-controls.tsx` — React Flow `Panel` at bottom-left (`z-10`, same pill styling as the shape panel): zoom out / fit view / zoom in, thin divider, undo / redo
  - [x] Zoom buttons call the `useReactFlow` instance (`zoomOut`/`fitView`/`zoomIn`, 200ms animation)
  - [x] Undo/redo use Liveblocks `useUndo`/`useRedo`; `useCanUndo`/`useCanRedo` disable the buttons (dimmed to 40% opacity)
  - [x] `hooks/use-keyboard-shortcuts.ts` `useKeyboardShortcuts(flow, undo, redo)` — `window` keydown; skips inputs, textareas, selects, and contentEditable. `+`/`=` zoom in, `-` zoom out (only without Ctrl/Cmd, so browser page zoom still works), `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` and `Cmd/Ctrl+Y` redo
  - [x] Removed the `MiniMap`
  - [x] `npm run build`, lint clean
- 18 Starter templates:
  - [x] `components/editor/starter-templates.ts` — `CanvasTemplate` `{ id, name, description, nodes, edges }` on the shared `CanvasNode`/`CanvasEdge` types; `CANVAS_TEMPLATES`: Microservices, CI/CD Pipeline, Event-Driven System. `node()` helper takes a `NODE_COLORS` name and the shape panel's default size per shape (`SHAPES` now exported); `edge()` applies `defaultEdgeOptions` plus explicit side handles and optional label
  - [x] `defaultEdgeOptions` moved from `collaborative-canvas.tsx` to `canvas-edge.tsx` (exported), so template data doesn't import the canvas module (import cycle)
  - [x] `components/editor/starter-templates-modal.tsx` — `EditorDialog` (new optional `className`, here `sm:max-w-3xl`) with a scrollable two-column card grid: preview, name, description, `Import` button (calls `onImport`, then closes)
  - [x] Preview: one plain `<svg>` per card whose `viewBox` is the node bounds + padding, fitted to a fixed `h-40` box; edges are straight lines between node centers; nodes use their color and shape (`SVG_SHAPES` paths from `canvas-node.tsx`, now exported; rounded `rect` for rectangle/pill/circle)
  - [x] Navbar `Templates` button (`LayoutTemplate`, workspace only) → `EditorShell` `isTemplatesOpen` → passed through `CollaborativeCanvas`; the modal renders inside `Canvas` so import uses its Liveblocks flow state directly
  - [x] Import: remove all edges, remove all nodes, then add template nodes and edges through `onNodesChange`/`onEdgesChange` (Liveblocks-synced), IDs suffixed per import; then `fitView` (React Flow queues it until the new nodes are measured)
  - [x] `npm run build`, typecheck, lint clean

- 19 Presence avatars and live cursors:
  - [x] `liveblocks.config.ts` Presence is now `{ cursor: { x, y } | null, thinking: boolean }` (renamed from `isThinking`); `RoomProvider` initial presence updated
  - [x] `components/editor/presence.tsx` `PresenceAvatars` — React Flow `Panel` top-right of the canvas (canvas view only; navbar untouched). Collaborators = `useOthers` minus entries whose ID matches the Clerk `useAuth().userId` (Liveblocks user ID == Clerk user ID). Up to 5 overlapping 28px display-only avatars (photo, else initials on the presence color), `+N` chip, `ring-2` in `--bg-base`; divider only when collaborators exist; then Clerk `UserButton` sized to 28px
  - [x] `LiveCursors` — overlay inside `ReactFlow`; collaborators' cursors (same filter, so never the current user) as a colored pointer + name badge in the presence color. Cursors are stored in flow coordinates (`screenToFlowPosition`) and projected with `useViewport`, so they point at the same diagram spot at any pan/zoom
  - [x] `ReactFlow` `onMouseMove` broadcasts the cursor via `useUpdateMyPresence`; `onMouseLeave` sets it to `null`
  - [x] `npm run build`, lint clean

- 20 AI sidebar shell:
  - [x] `components/editor/ai-sidebar.tsx` `AiSidebar` (`isOpen`, `onClose`; state stays in `EditorShell`) replaces the inline placeholder `<aside>`. Same fixed right slide-over, `inert`/`invisible` when closed, shadow only while open; surface now `bg-base/95` + `border-surface-border`
  - [x] Header: bot icon, `AI Workspace` (`text-copy-primary`), `Collaborate with BuildingBlocks` (`text-copy-muted`), ghost close button
  - [x] shadcn `Tabs`: `AI Architect` / `Specs`; active = `bg-ai/15 text-ai-text`, inactive `text-copy-muted`
  - [x] AI Architect: `ScrollArea` chat, empty state (bot icon, description, 3 starter chips `bg-subtle text-ai-text` that fill the input), user bubbles right (`bg-accent-dim border-2 border-brand/50 text-copy-primary`), assistant bubbles left (`bg-elevated border-surface-border text-ai-text`), auto-scroll to newest. `Textarea` grows via `field-sizing-content` between 104px and 176px (raised from the spec's 72px so the placeholder clears the corner send button); Enter sends, Shift+Enter newline; send button (`bg-ai text-white`) sits inside the textarea's bottom-right corner (textarea `pb-12` keeps text clear of it). Sending only appends the user message (no AI yet)
  - [x] Specs: `Generate Spec` button (`bg-ai text-white`, no action) + static demo card (`bg-elevated`, `border-surface-border`, `FileText` icon, title, snippet, disabled download)
  - [x] Spec token names mapped to existing ones (none added): `text-primary-text` → `text-copy-primary`, `text-muted-text` → `text-copy-muted`, `bg-accent`/`text-accent(-text)` → AI accent `bg-ai`/`text-ai-text` (shadcn `bg-accent` is the grey subtle surface), `bg-brand-dim` → `bg-accent-dim`
  - [x] `npm run build`, lint clean

- 21 Canvas autosave:
  - [x] `@vercel/blob` installed. Reuses the existing `Project.canvasJsonPath` for the blob URL (no migration); Prisma holds metadata only
  - [x] `app/api/projects/[projectId]/canvas/route.ts` — `GET` reads `canvasJsonPath`, fetches the blob (`useCache: false`), returns `{ canvas }` (`null` when never saved); `PUT { nodes, edges }` (`400` unless both are arrays) uploads to `canvas/<projectId>.json` and stores the URL. Owner or collaborator; `401` signed out, `404` missing or no access
  - [x] The Blob store is private: blobs use `access: "private"`, one fixed path per project overwritten in place (`allowOverwrite`), so no orphaned blobs
  - [x] `hooks/use-canvas-autosave.ts` `useCanvasAutosave(projectId, nodes, edges, applySaved)` — snapshots nodes/edges as JSON without `selected`/`dragging`/`resizing` (clicks don't save); 1.5s debounce; status `saving` (unsaved changes or in flight) / `saved` / `error`; `saveNow` for the button
  - [x] Load: if the Liveblocks room has no nodes and no edges on mount, `GET` the saved canvas and add it via `onNodesChange`/`onEdgesChange` (then `fitView`); a room with content skips the load. Autosave stays off until the load finishes, and stays off if the load fails (shows `error`), so an empty room never overwrites the saved canvas
  - [x] Navbar Save button (workspace only) reflects manual saves only; autosave runs silently in the background. `Save` (`Save` icon) by default, `Saving...` (spinning `LoaderCircle`) while the click's request is in flight, then `Saved` (`Check`) or `Error` (`CircleAlert`, `text-error`) for 2s before returning to `Save` (`useManualSave` in `editor-navbar.tsx`). `saveNow` returns `Promise<boolean>`; it resolves `false` before the saved canvas has loaded. `Canvas` reports `{ status, saveNow }` up to `EditorShell` via `onSaveChange`
  - [x] `npm run build`, lint clean; Blob put/overwrite/uncached get verified against the real store

- Trigger.dev setup:
  - [x] `@trigger.dev/sdk` + `@trigger.dev/build` 4.8.3; `trigger.config.ts` (project `proj_egbbpkhmqnceuhzwxhie`, `node-24`) with `dirs: ["./trigger"]` (root, per architecture boundaries); `.trigger` gitignored
  - [x] `trigger/example.ts` `hello-world` placeholder task; app code triggers via `import type` + `tasks.trigger<typeof t>("id", payload)`
  - [x] `TRIGGER_SECRET_KEY` in `.env.local` (dev key from the dashboard); run `npx trigger.dev@4.8.3 dev` alongside `npm run dev`

- 22 Design agent API (backend wiring only, no AI, no UI):
  - [x] `prisma/models/task-run.prisma` `TaskRun` (`runId` unique, `projectId`, `userId` = Clerk user ID, `createdAt`; index on `runId`, compound index on `userId`+`projectId`); migration `20261110020012_task_run`. No relation to `Project`
  - [x] `trigger/design-agent.ts` — `design-agent` task, payload `{ prompt, roomId }`, logs and returns its input
  - [x] `POST /api/ai/design` `{ prompt, roomId, projectId }` — `401` signed out, `400` missing fields or `roomId !== projectId` (room ID == project ID), `404` no project access; triggers via `tasks.trigger<typeof designAgent>` (type-only import), stores a `TaskRun`, returns `{ runId }`
  - [x] `POST /api/ai/design/token` `{ runId }` — `401`/`400`; `404` unless a `TaskRun` with that `runId` belongs to the caller; returns `{ token }` from `auth.createPublicToken` scoped to read that run
  - [x] `npm run build`, lint clean. Not exercised end to end against a running `trigger.dev dev` worker

- 23 Design agent logic:
  - [x] `trigger/design-agent.ts` — Gemini (`@ai-sdk/google` `gemini-3.5-flash`, key from `GEMINI_API_KEY` via `createGoogleGenerativeAI`) gets the current canvas (nodes with label/shape/color name/position/size, edges) and the prompt, and returns `{ summary, actions[] }` via `generateText` + `Output.object` with a `jsonSchema` (flat action object; zod is not a direct dependency). The system prompt carries the allowed shapes (role + default size), the `NODE_COLORS` names by role, and layout rules (grid, ≥80px horizontal / ≥60px vertical gaps, no overlap, aligned tiers, side handles by flow direction)
  - [x] Actions: `addNode`, `moveNode`, `resizeNode`, `updateNode` (label/shape/color), `deleteNode` (also removes its edges), `addEdge`, `deleteEdge`. Applied one per `mutateFlow` call (`@liveblocks/react-flow/node`, existing `getLiveblocks()` client), so collaborators see the design build up. Every action is validated: unknown IDs, missing coordinates, and self-edges are skipped and counted. Shape falls back to rectangle and color to Neutral; sizes are clamped to 40–800. New nodes match user-created ones (`canvasNode`, shape-panel default size, fill + text color); edges match `defaultEdgeOptions` (duplicated in the task because the source modules are client components). Model IDs for new nodes map to `ai-<stamp>-<id>`
  - [x] AI presence via `liveblocks.setPresence` (user `buildingblocks-ai`, "BuildingBlocks AI", `--accent-ai` color): `{ cursor, thinking: true }`, starting at the canvas center and then following each change. In `finally`, presence is reset to `{ cursor: null, thinking: false }` with the minimum 2s TTL (there is no delete API). `LiveCursors` badge now appends "· thinking…" while a participant's `thinking` is true
  - [x] Status feed: Liveblocks Feed `ai-status` (`AI_STATUS_FEED_ID`, created on first run), messages `{ runId, status: start|processing|complete|error, message }` at start, "Planning the design…", "Applying N changes…", then the summary (plus the skipped count) or an error. Feed and presence writes are best-effort (logged, never fail the run)
  - [x] Errors: posts the `error` status, clears presence, and rethrows so the run shows as failed. `retry: { maxAttempts: 1 }` because the edits are not idempotent. `maxDuration: 300`
  - [x] `npm run build`, typecheck, lint clean. Not run end to end (needs a `trigger.dev dev` worker and a real Gemini call)

- 24 AI presence state (UI + realtime signals only, no generation flow):
  - [x] `types/tasks.ts` — `AI_STATUS_FEED_ID = "ai-status-feed"` (renamed from feature 23's `ai-status`), `AiStatusMessage` `{ text?, status?: start|processing|complete|error, runId? }`, `parseAiStatusMessage(data)` validates feed data (returns `null` for anything else). `trigger/design-agent.ts` imports both and now posts `{ runId, status, text }` (was `message`)
  - [x] `CollaborativeCanvas` takes `children`, rendered inside `RoomProvider` but outside the canvas suspense/error boundary; `EditorShell` passes `AiSidebar` there so it can use room hooks (it is `fixed`, so layout is unchanged)
  - [x] `AiSidebar` `useAiStatus()` (non-suspense `@liveblocks/react` hooks, so the sidebar works while the room connects): active = any other participant has `thinking: true` in presence (the AI agent joins as a participant; no parallel state); text = latest `useFeedMessages(AI_STATUS_FEED_ID)` message, validated. Status row above the input (`role="status"`, `aria-live`): spinning `LoaderCircle` while active, `Sparkles` otherwise; shows only the latest text (fallback "AI is working…"). While active the textarea is disabled and the send button shows a spinner and is disabled; tabs, chat history, starter chips, and close stay usable
  - [x] `LiveCursors` badge shows a small spinning `LoaderCircle` while a participant's `thinking` is true (replaces the "· thinking…" text)
  - [x] `npm run build`, lint clean; validator assert-checked. Not exercised against a live AI run

- 25 Sidebar chat feed (room chat only; no AI replies, no backend tasks):
  - [x] `types/tasks.ts` — `AI_CHAT_FEED_ID = "ai-chat"`, Zod `aiChatMessageSchema` `{ sender, role: user|assistant, content, timestamp (epoch ms) }`, `AiChatMessage`. `zod` added as a direct dependency (was already installed transitively)
  - [x] `AiSidebar` `useRoomChat()`: `useFeedMessages(AI_CHAT_FEED_ID)` rendered in feed order, each message `safeParse`d and dropped if invalid; shows sender, time, and content (bubble styling unchanged, by role). Separate from `ai-status-feed`
  - [x] Sending via the existing textarea/send button: `useCreateFeed` once per session (existing feed is fine, mirrors the design task), then `useCreateFeedMessage` with the user's `info.name`. Input clears only after a successful send; failure shows a small `role="alert"` error above the input. Send disabled while a send is in flight

- 26 Design agent frontend (sidebar wiring only; no backend changes):
  - [x] Submit: posts the user message to `ai-chat`, then `POST /api/ai/design` `{ prompt, roomId, projectId }` (`projectId` = room ID, which the existing route requires), then `POST /api/ai/design/token` for the public token (the existing API returns `{ runId }` and the token separately, not `{ runId, publicToken }`). `runId` + token held in local state
  - [x] `useRealtimeRun<typeof designAgent>` (type-only import) with the token. On completion the submitter's client posts an `assistant` message ("BuildingBlocks AI") to `ai-chat`: the run's status-feed summary when it has arrived, else an applied-count fallback; failures and subscription errors post an error message. Start failures post "Couldn't start the design: …" to `ai-chat`
  - [x] Busy = sending, local run active, or any participant `thinking` (covers other clients). Textarea disabled and send button shows a spinner while busy
  - [x] Status strip (latest `ai-status-feed` text) shows only while a run is active; dark `bg-elevated` with green `#62C073` left border and spinner. No longer shows stale text after a run
  - [x] User bubbles green `#62C073` with `#0F2E18` text (the Green node color pair from `types/canvas.ts`); AI bubbles `bg-elevated` + `text-copy-primary`; send button green, dimmed when disabled
  - [x] Canvas changes come only through Liveblocks (`useLiveblocksFlow`); no manual sync
  - [x] `npm run build`, typecheck, lint clean. Not exercised end to end (needs a `trigger.dev dev` worker and Gemini key)

- 27 Spec generation flow (backend only; no frontend, no spec storage):
  - [x] `types/tasks.ts` — Zod `specRequestSchema` `{ roomId, chatHistory: AiChatMessage[], nodes, edges }` (nodes/edges are loose React Flow JSON; only `id`, `data.label`/`shape`, `source`/`target` are typed) and `generateSpecPayloadSchema` (adds `projectId`)
  - [x] `POST /api/ai/spec` — Clerk auth, Zod-validated body, project access from `roomId` (room ID == project ID; no client `projectId` accepted), triggers `generate-spec`, saves a `TaskRun`, returns `{ runId }`
  - [x] `POST /api/ai/spec/token` — run-owner check via `TaskRun`, returns `{ token }` (public token scoped to the run, `expirationTime: "1h"`)
  - [x] `trigger/generate-spec.ts` — `schemaTask` `generate-spec`, Gemini (`gemini-3.5-flash`, same key lookup as the design agent), metadata `status` processing/complete/error, returns `{ content }` (Markdown). Uses the config's default retries (read-only, safe to retry)
  - [x] `npm run build`, typecheck, lint clean. Not run against a live Trigger.dev worker
- 28 Spec persistence and download (backend only; no UI):
  - [x] `prisma/models/project-spec.prisma` — `ProjectSpec` (`id`, `projectId` relation with cascade delete, `filePath` = Blob URL, `createdAt`; index on projectId+createdAt). Migration `20261110044126_project_spec` applied. Metadata only; content lives in Blob
  - [x] `trigger/generate-spec.ts` — after generation, `put`s the Markdown to the private store at `specs/{projectId}/{specId}.md` and upserts the `ProjectSpec` row with the blob URL. `specId` = Trigger run ID, so a retry overwrites the same blob/record instead of duplicating. Returns `{ content, specId }`; metadata gets `specId`
  - [x] `GET /api/projects/[projectId]/specs/[specId]/download` — `401` signed out, `404` missing project / no access (same as other project routes), `404` spec missing or not in that project, `404` blob missing. Streams the private blob as `text/markdown` with `Content-Disposition: attachment` (`{projectId}-spec.md`); the Blob URL is never returned
  - [x] `npm run build`, typecheck, lint clean. Not run against a live Trigger.dev worker or with a real download
- 29 Spec UI integration (sidebar Specs tab):
  - [x] `GET /api/projects/[projectId]/specs` — added because no list endpoint existed (spec assumed one). `401` signed out, `404` no access; returns `{ specs: [{ id, createdAt }] }` newest first; `filePath` never returned
  - [x] `AiSidebar` `SpecsTab`: fetches the list on tab open (inactive tab content unmounts, so it refetches each time); compact clickable rows with filename (`{projectId}-spec.md`, same as the download route; `ProjectSpec` has no filename column) and `createdAt`; loading, empty, and error states. Each row has a download link to the download route (`<a download>`, browser handles the file)
  - [x] `SpecPreviewDialog` (`EditorDialog` + `ScrollArea`): fetches content through the download route on open, held only while open; rendered with `react-markdown` + `remark-gfm` (new deps; no raw HTML rendered). Close button, Esc, and focus trap from Radix; Download button in the footer
  - [x] "Generate Spec" wired (follow-up fix: the button had no handler, so nothing ever triggered `generate-spec`): reads nodes/edges from the autosaved canvas (`GET /api/projects/[projectId]/canvas`; the sidebar is outside `ReactFlowProvider`) and chat history from the `ai-chat` feed, `POST /api/ai/spec` then `/api/ai/spec/token`, tracks the run with `useRealtimeRun<typeof generateSpec>`; button spins while running, errors show under it, list refetches on success
  - [x] `npm run build`, typecheck, lint clean. Not exercised with real specs in a browser

## In Progress

- None.

## Next Up

- Spec generation reads the autosaved canvas, so edits from the last ~1.5s before clicking may be missing. Switching away from the Specs tab mid-run drops tracking (the spec still saves and shows on reopen).
- Dev: after `prisma generate` adds a model, restart `next dev`; `lib/prisma.ts` caches the old client on `global` (`prisma.projectSpec` was undefined until restart).
- The closing AI message is posted by the submitter's client; if they close the tab mid-run, no closing message is posted (the status feed still shows the summary).
- The feed is created by the design task on its first run; until then `useFeedMessages` has nothing (or an error) and the status row stays hidden. 
- The Trigger.dev environment needs `GEMINI_API_KEY`, `LIVEBLOCKS_SECRET_KEY`, and (for spec saving) `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` (dev reads the local env files; deployed runs need them set in the Trigger.dev dashboard).
- Each AI action is a separate storage mutation, so a large plan means many Liveblocks REST calls. Batch them if latency or rate limits become a problem.

- In the workspace view the navbar still shows its own `UserButton` (spec: navbar unchanged), so the current user's button appears twice there.
- AI sidebar textarea auto-resize relies on CSS `field-sizing`, unsupported in Firefox/Safari (fixed 104px there).
- Autosave: edits made in the last 1.5s before closing the tab are not flushed to Blob (the Liveblocks room still has them). Deleting a project does not delete its canvas or spec blobs (spec rows cascade).
- Loading a saved canvas into an empty room is one Liveblocks change per list, so it is undoable.
- Starter template import is several Liveblocks changes, so undo may revert it in steps rather than all at once.

## Open Questions

- None.

## Architecture Decisions

- Dark only: `:root` holds the `ui-context.md` tokens and shadcn variables alias them; `<html>` carries `dark` so shadcn `dark:` variants apply.
- `cn()` re-exports shadcn's `cn` package (clsx + tailwind-merge replacement), as generated by the shadcn CLI.
- Editor chrome components are stateless (props + callbacks); sidebar is `fixed` below the `h-14` navbar so it overlays the canvas without shifting layout, and is `inert` when closed.
- Route protection is protect-by-default in `proxy.ts` (`clerkMiddleware` + `auth.protect()` with a manual public-path check; deprecated `createRouteMatcher` avoided). For `/api/*` the proxy returns a JSON `401` when signed out (not `auth.protect()`), and route handlers check `auth()` themselves too.
- Editor home is `/editor`, workspaces are `/editor/[roomId]`; both are server pages rendering the client `EditorShell`, which owns `isSidebarOpen`. Mutations go through the REST API, then `router.refresh()` re-runs the server fetch (no client-side list state).
- Dialogs wrap `components/ui/dialog` via `EditorDialog` with token classes; shadcn primitives stay unmodified.
- Client hooks live in `hooks/`. Project dialogs are one `EditorDialog` driven by `useProjectDialogs`; the hook keeps the last dialog after close so content doesn't vanish mid-animation.
- Project ID is the Liveblocks room ID: `<slug>-<8 hex chars>`, chosen client-side at create and fixed for life (rename changes only `name`).
- The `bg-base` token is declared as `--background-color-base`, not `--color-base`: a `--color-*` token named `base` also emits a color for `text-base`, which turned all `text-base` text (e.g. shadcn `Input`) near-black. Avoid `--color-*` token names that collide with Tailwind size keywords (`base`, `sm`, `lg`, `xs`, ...).

- Prisma 7 multi-file schema: `prisma7.config.ts` points `schema` at the `prisma/` folder, so `prisma/schema.prisma` holds the generator/datasource and models live in `prisma/models/*.prisma`. The generated client (`app/generated/prisma`) is gitignored; run `npx prisma generate` after install.
- Liveblocks auth uses access tokens (`prepareSession` + `allow`), not ID tokens: project access lives in our DB, so the auth route is the gate and rooms are created private (`defaultAccesses: []`).
- Accelerate uses the core `accelerateUrl` client option; `@prisma/extension-accelerate` (query caching) is not installed.

## Fixed Issues

- Dialog input text was black: `text-base` color collision (above). Fixed in `globals.css`.
- Rename dialog now shows the slug preview, with the old slug struck through when the new name changes it.
- Canvas looked like a floating card: React Flow's `colorMode="dark"` paints `#141414` over the page. `ReactFlow` now sets `--xy-background-color: var(--bg-base)`, dots use `--border-subtle`, and the minimap uses project tokens.
- Dropped shapes all rendered as the same rounded rectangle, so drag-and-drop looked broken (the pipeline itself was correct). `canvas-node.tsx` now renders each shape: CSS radius for rectangle/circle/pill, inline SVG for diamond/hexagon/cylinder.
- Sidebars get an elevation shadow only while open and become `invisible` when closed (visibility transitions with the slide), so nothing peeks past the viewport edge.
- Double-clicking an edge (or node) to edit its label also zoomed the canvas: React Flow binds `dblclick.zoom` directly on the pane, bypassing its filter, so `nopan` doesn't stop it. `ReactFlow` now sets `zoomOnDoubleClick={false}` (empty-canvas double-click no longer zooms either).
- Label text jumped up a line while editing: the textarea's default `rows=2` made the grid cell a line taller than the text. Now `rows={1}` + `h-full`.
- Delete/Backspace deletion now goes through a `keydown` listener in `Canvas` (window-level, skips inputs/textareas/contenteditable via the exported `isEditable`): selected nodes from `useNodes()` and selected edges from `useEdges()`, plus edges attached to deleted nodes (Liveblocks' `onDelete` doesn't cascade), removed with Liveblocks' `onDelete` mutation. `deleteKeyCode={null}`. Note: Liveblocks' `onNodesChange`/`onEdgesChange` ignore `remove` changes.
- First drop on an empty canvas auto-zoomed: React Flow keeps the `fitView` prop queued until nodes exist. `fitView` is now only set when the room has nodes on mount, and `loadSaved` only calls `fitView()` when the saved canvas has nodes.
- `next.config.ts` allows `img.clerk.com` via `images.remotePatterns`. `UserButton` renders on the editor home navbar only.
- Template import never cleared the canvas (Liveblocks ignores `remove` changes). The templates modal now offers "Add to canvas" (template bounds centered in the current view via `getNodesBounds` + `screenToFlowPosition`, viewport unchanged) or "Replace canvas" (`onDelete` on everything, then `fitView`). Both run in one `room.batch` (one undo step) and pre-select the imported nodes and edges (local `select` changes), deselecting anything previously selected.
- Autosave status indicator above the shape panel (`ShapePanel` `saveStatus`): "Saving…" / "All changes saved" / "Autosave failed".
- Right-drag selection flashed every node selected at the start: while the box was still a line (0 width or height), `getIntersectingNodes` matched all nodes (`overlap >= box area` with area 0). `use-selection-box` now skips selection until the box has both width and height.

- Design agent failed with a `LiveblocksError` "Not Found" from `mutateFlow`. The dashboard test payload used `roomID` instead of `roomId`, so the task called `rooms/undefined`. The task now rejects a payload without a string `roomId`/`prompt` before any Liveblocks call. The Gemini key also reads `GOOGLE_AI_API_KEY` (the name in `.env.local`) when `GEMINI_API_KEY` is unset.

## Session Notes

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` were added to `.env.local` (the spec assumed they existed). Other environments (Vercel, CI) need them too.
- `BLOB_READ_WRITE_TOKEN` must be set (present in `.env.local`); the store is private, so `access: "public"` fails.
- `LIVEBLOCKS_SECRET_KEY` (`sk_...`) must be set in `.env.local` and deployed envs; it was not present when feature 10 was built.
