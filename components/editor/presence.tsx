"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react/suspense";
import { Panel, useViewport } from "@xyflow/react";
import { LoaderCircle } from "lucide-react";

const MAX_AVATARS = 5;
const AVATAR = "size-7 shrink-0 rounded-full ring-2 ring-[var(--bg-base)]";

// Others in the room, minus any entry for the current Clerk user (e.g. their other tabs).
function useCollaborators() {
  const { userId } = useAuth();
  return useOthers((others) => others.filter((o) => o.id !== userId));
}

export function PresenceAvatars() {
  const collaborators = useCollaborators();
  const shown = collaborators.slice(0, MAX_AVATARS);
  const overflow = collaborators.length - shown.length;

  return (
    <Panel
      position="top-right"
      className="z-10 flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 p-1.5 backdrop-blur"
    >
      {collaborators.length > 0 && (
        <>
          <div className="flex -space-x-2">
            {shown.map(({ connectionId, info }) => (
              <span
                key={connectionId}
                title={info.name}
                className={`${AVATAR} flex items-center justify-center overflow-hidden text-xs font-medium text-white`}
                style={{ backgroundColor: info.color }}
              >
                {info.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={info.avatar} alt={info.name} className="size-full object-cover" />
                ) : (
                  initials(info.name)
                )}
              </span>
            ))}
            {overflow > 0 && (
              <span
                className={`${AVATAR} flex items-center justify-center bg-surface-border text-[10px] font-medium text-copy-primary`}
              >
                +{overflow}
              </span>
            )}
          </div>
          <div className="h-5 w-px bg-surface-border" />
        </>
      )}
      <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
    </Panel>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Cursors are stored in flow coordinates, so they point at the same spot of the diagram for everyone.
export function LiveCursors() {
  const collaborators = useCollaborators();
  const { x, y, zoom } = useViewport();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {collaborators.map(({ connectionId, presence, info }) =>
        presence.cursor ? (
          <div
            key={connectionId}
            className="absolute top-0 left-0"
            style={{
              transform: `translate(${presence.cursor.x * zoom + x}px, ${presence.cursor.y * zoom + y}px)`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M1 1 L15 7 L8 8.5 L5.5 15 Z" fill={info.color} stroke="white" strokeWidth="1" />
            </svg>
            <span
              className="ml-3 flex w-max items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white"
              style={{ backgroundColor: info.color }}
            >
              {info.name}
              {presence.thinking && (
                <LoaderCircle className="size-3 animate-spin" aria-label="thinking" />
              )}
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}
