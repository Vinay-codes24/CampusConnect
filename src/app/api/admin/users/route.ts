import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLES, type Role } from "@/lib/types";
import { oneOf } from "@/lib/validation";

/** GET /api/admin/users — account list with activity counts (admin only). */
export const GET = handler(async () => {
  await requireRole("admin");
  const db = getDB();
  return json({
    users: db.users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      department: u.department,
      year: u.year,
      verified: u.verified,
      createdAt: u.createdAt,
      posts: db.posts.filter((p) => p.authorId === u.id && !p.removed).length,
      events: db.registrations.filter((r) => r.userId === u.id && r.status === "registered").length,
    })),
  });
});

/** POST /api/admin/users — change a user's role or verification status. */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireRole("admin");
  const body = await readBody(req);
  const userId = String(body.userId ?? "");
  if (userId === me.id) throw new ApiError(400, "You cannot change your own role.");

  const db = getDB();
  const target = db.users.find((u) => u.id === userId);
  if (!target) throw new ApiError(404, "That account does not exist.");

  if (body.role !== undefined) {
    const role = oneOf(body.role, ROLES, "role") as Role;
    mutate((d) => {
      const u = d.users.find((x) => x.id === userId);
      if (u) u.role = role;
    });
    mutate((d) => {
      d.notifications.push({
        id: crypto.randomUUID(),
        userId,
        type: "system",
        title: `Your role is now “${role}”`,
        body: `${me.name} updated your permissions on CampusConnect.`,
        link: "/profile",
        important: true,
        createdAt: new Date().toISOString(),
      });
    });
    return json({ ok: true, role });
  }

  if (typeof body.verified === "boolean") {
    mutate((d) => {
      const u = d.users.find((x) => x.id === userId);
      if (u) u.verified = body.verified === true;
    });
    return json({ ok: true, verified: body.verified });
  }

  throw new ApiError(400, "Nothing to update.");
});
