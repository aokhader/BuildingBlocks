import { Liveblocks } from "@liveblocks/node";

function createClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
  return new Liveblocks({ secret });
}

const globalForLiveblocks = global as unknown as { liveblocks?: Liveblocks };

export function getLiveblocks(): Liveblocks {
  // Lazy so `next build` doesn't need the secret.
  return (globalForLiveblocks.liveblocks ??= createClient());
}

const CURSOR_COLORS = [
  "#E57373",
  "#F06292",
  "#BA68C8",
  "#7986CB",
  "#4FC3F7",
  "#4DB6AC",
  "#81C784",
  "#FFD54F",
  "#FFB74D",
  "#A1887F",
];

// Same user ID always maps to the same color.
export function getUserColor(userId: string): string {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
