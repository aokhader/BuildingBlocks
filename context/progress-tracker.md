# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation

## Current Goal

- Feature 14 (revised): Node editing — deletion and multi-selection added (`context/feature-specs/14-node-editing.md`) — done

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

## In Progress

- None.

## Next Up

- In the workspace view the navbar still shows its own `UserButton` (spec: navbar unchanged), so the current user's button appears twice there.
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
- Right-drag selection flashed every node selected at the start: while the box was still a line (0 width or height), `getIntersectingNodes` matched all nodes (`overlap >= box area` with area 0). `use-selection-box` now skips selection until the box has both width and height.

## Session Notes

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` were added to `.env.local` (the spec assumed they existed). Other environments (Vercel, CI) need them too.
- `LIVEBLOCKS_SECRET_KEY` (`sk_...`) must be set in `.env.local` and deployed envs; it was not present when feature 10 was built.
