import {
  addCollaborator,
  getProjectOwner,
  listCollaborators,
  removeCollaborator,
} from "@/lib/collaborators";
import { getCurrentIdentity, getProjectRole } from "@/lib/project-access";

type Context = RouteContext<"/api/projects/[projectId]/collaborators">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Missing and forbidden both return 404 so project IDs can't be probed.
async function authorize(ctx: Context, need: "view" | "manage") {
  const identity = await getCurrentIdentity();
  if (!identity) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };

  const { projectId } = await ctx.params;
  const role = await getProjectRole(projectId, identity);
  if (!role) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  if (need === "manage" && role !== "owner") {
    return { error: Response.json({ error: "Only the owner can manage access" }, { status: 403 }) };
  }
  return { projectId, role, identity };
}

function parseEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export async function GET(_req: Request, ctx: Context) {
  const auth = await authorize(ctx, "view");
  if ("error" in auth) return auth.error;

  const [owner, collaborators] = await Promise.all([
    getProjectOwner(auth.projectId),
    listCollaborators(auth.projectId),
  ]);
  return Response.json({ isOwner: auth.role === "owner", owner, collaborators });
}

export async function POST(req: Request, ctx: Context) {
  const body: unknown = await req.json().catch(() => null);
  const email = parseEmail(body && typeof body === "object" && "email" in body ? body.email : null);
  if (!email) return Response.json({ error: "A valid email is required" }, { status: 400 });

  const auth = await authorize(ctx, "manage");
  if ("error" in auth) return auth.error;
  if (email === auth.identity.email?.toLowerCase()) {
    return Response.json({ error: "You already own this project" }, { status: 400 });
  }

  if (!(await addCollaborator(auth.projectId, email))) {
    return Response.json({ error: "Already a collaborator" }, { status: 409 });
  }
  return Response.json({ collaborators: await listCollaborators(auth.projectId) }, { status: 201 });
}

export async function DELETE(req: Request, ctx: Context) {
  const email = parseEmail(new URL(req.url).searchParams.get("email"));
  if (!email) return Response.json({ error: "A valid email is required" }, { status: 400 });

  const auth = await authorize(ctx, "manage");
  if ("error" in auth) return auth.error;

  await removeCollaborator(auth.projectId, email);
  return new Response(null, { status: 204 });
}
