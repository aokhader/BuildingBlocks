import { currentUser } from "@clerk/nextjs/server";

import { getLiveblocks, getUserColor } from "@/lib/liveblocks";
import { getProjectRole } from "@/lib/project-access";

// Liveblocks client authEndpoint: body is `{ room }`, where room ID == project ID.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const room = body?.room;
  if (typeof room !== "string" || !room) {
    return Response.json({ error: "room is required" }, { status: 400 });
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const role = await getProjectRole(room, { userId: user.id, email });
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  const liveblocks = getLiveblocks();
  // Private room: access is granted only through the session below.
  await liveblocks.getOrCreateRoom(room, { defaultAccesses: [] });

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.fullName ?? user.username ?? email ?? "Anonymous",
      avatar: user.imageUrl,
      color: getUserColor(user.id),
    },
  });
  session.allow(room, session.FULL_ACCESS);

  const { status, body: token } = await session.authorize();
  return new Response(token, { status, headers: { "Content-Type": "application/json" } });
}
