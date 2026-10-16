import { NextRequest } from "next/server";
import { handler, json, ApiError, type RouteContext } from "@/lib/api";
import { getDB, mutate } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { commentView, postView } from "@/lib/serialize";

/** GET /api/posts/[id] — single post with its full comment thread. */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const viewer = await getCurrentUser();
  const db = getDB();
  const post = db.posts.find((p) => p.id === id && !p.removed);
  if (!post) throw new ApiError(404, "That post no longer exists.");

  const comments = db.comments
    .filter((c) => c.postId === id && !c.removed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((c) => commentView(db, c, viewer?.id ?? null));

  return json({ post: postView(db, post, viewer?.id ?? null), comments });
});

/** DELETE /api/posts/[id] — author or moderator only. */
export const DELETE = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const db = getDB();
  const post = db.posts.find((p) => p.id === id);
  if (!post) throw new ApiError(404, "That post no longer exists.");
  if (post.authorId !== me.id && me.role !== "admin" && me.role !== "faculty") {
    throw new ApiError(403, "You can only delete your own posts.");
  }
  mutate((d) => {
    const target = d.posts.find((p) => p.id === id);
    if (target) target.removed = true;
  });
  return json({ ok: true });
});
