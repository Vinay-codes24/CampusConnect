import { NextRequest } from "next/server";
import { handler, json, ApiError, type RouteContext } from "@/lib/api";
import { getDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { stripPrivateFields } from "@/lib/auth";
import { postView } from "@/lib/serialize";
import { toView } from "@/lib/events";

/** GET /api/users/[id] — public student/faculty profile. */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const viewer = await getCurrentUser();
  const db = getDB();
  const user = db.users.find((u) => u.id === id || u.username === id);
  if (!user) throw new ApiError(404, "That profile does not exist.");

  const isSelf = viewer?.id === user.id;
  const posts = db.posts
    .filter((p) => p.authorId === user.id && !p.removed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => postView(db, p, viewer?.id ?? null));

  const registrations = db.registrations
    .filter((r) => r.userId === user.id && r.status === "registered")
    .map((r) => db.events.find((e) => e.id === r.eventId))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map((e) => toView(e, db, viewer?.id ?? null));

  return json({
    user: isSelf ? { ...stripPrivateFields(user), email: user.email } : stripPrivateFields(user),
    isSelf,
    posts,
    registrations,
    stats: {
      posts: posts.length,
      comments: db.comments.filter((c) => c.authorId === user.id && !c.removed).length,
      upvotes: db.votes.filter((v) => v.userId === user.id).length,
      events: registrations.length,
    },
  });
});
