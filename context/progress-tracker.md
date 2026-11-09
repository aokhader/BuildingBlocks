# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation

## Current Goal

- Feature 07: Wire editor home (`context/feature-specs/07-wire-editor-home.md`) — done

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

## In Progress

- None.

## Next Up

- Workspace canvas at `/editor/[projectId]` (Liveblocks room = project ID).

## Open Questions

- None.

## Architecture Decisions

- Dark only: `:root` holds the `ui-context.md` tokens and shadcn variables alias them; `<html>` carries `dark` so shadcn `dark:` variants apply.
- `cn()` re-exports shadcn's `cn` package (clsx + tailwind-merge replacement), as generated by the shadcn CLI.
- Editor chrome components are stateless (props + callbacks); sidebar is `fixed` below the `h-14` navbar so it overlays the canvas without shifting layout, and is `inert` when closed.
- Route protection is protect-by-default in `proxy.ts` (`clerkMiddleware` + `auth.protect()` with a manual public-path check; deprecated `createRouteMatcher` avoided). For `/api/*` the proxy returns a JSON `401` when signed out (not `auth.protect()`), and route handlers check `auth()` themselves too.
- Editor home is `/editor`, workspaces are `/editor/[projectId]`; both are server pages rendering the client `EditorShell`, which owns `isSidebarOpen`. Mutations go through the REST API, then `router.refresh()` re-runs the server fetch (no client-side list state).
- Dialogs wrap `components/ui/dialog` via `EditorDialog` with token classes; shadcn primitives stay unmodified.
- Client hooks live in `hooks/`. Project dialogs are one `EditorDialog` driven by `useProjectDialogs`; the hook keeps the last dialog after close so content doesn't vanish mid-animation.
- Project ID is the Liveblocks room ID: `<slug>-<8 hex chars>`, chosen client-side at create and fixed for life (rename changes only `name`).
- The `bg-base` token is declared as `--background-color-base`, not `--color-base`: a `--color-*` token named `base` also emits a color for `text-base`, which turned all `text-base` text (e.g. shadcn `Input`) near-black. Avoid `--color-*` token names that collide with Tailwind size keywords (`base`, `sm`, `lg`, `xs`, ...).

- Prisma 7 multi-file schema: `prisma7.config.ts` points `schema` at the `prisma/` folder, so `prisma/schema.prisma` holds the generator/datasource and models live in `prisma/models/*.prisma`. The generated client (`app/generated/prisma`) is gitignored; run `npx prisma generate` after install.
- Accelerate uses the core `accelerateUrl` client option; `@prisma/extension-accelerate` (query caching) is not installed.

## Fixed Issues

- Dialog input text was black: `text-base` color collision (above). Fixed in `globals.css`.
- Rename dialog now shows the slug preview, with the old slug struck through when the new name changes it.

## Session Notes

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` were added to `.env.local` (the spec assumed they existed). Other environments (Vercel, CI) need them too.
