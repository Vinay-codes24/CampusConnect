import { NextRequest } from "next/server";
import { handler, json, ApiError, type RouteContext } from "@/lib/api";
import { getDB, mutate } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** DELETE /api/comments/[id] — author, faculty or admin only. */
export const DELETE = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;

  const db = getDB();
  const comment = db.comments.find((c) => c.id === id);
  if (!comment || comment.removed) throw new ApiError(404, "That comment no longer exists.");
  if (comment.authorId !== me.id && me.role !== "admin" && me.role !== "faculty") {
    throw new ApiError(403, "You can only delete your own comments.");
  }

  mutate((d) => {
    const target = d.comments.find((c) => c.id === id);
    if (!target) return;
    target.removed = true;
    const post = d.posts.find((p) => p.id === target.postId);
    if (post) post.commentCount = Math.max(0, post.commentCount - 1);
    // Remove the comment's own votes so counts stay reconcilable.
    d.votes = d.votes.filter((v) => !(v.target === "comment" && v.targetId === id));
  });

  return json({ ok: true });
});
