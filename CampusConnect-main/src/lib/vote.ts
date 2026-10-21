import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError, type RouteContext } from "@/lib/api";
import { getDB, mutate, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Vote } from "@/lib/types";

type Counted = { id: string; upvotes: number; downvotes: number; removed: boolean };

/**
 * Shared vote endpoint factory used by posts and comments.
 *
 * Server-enforced invariants:
 *  - exactly one vote row per (user, target) → a user can never both upvote and downvote
 *  - value 0 removes the existing vote (un-vote)
 *  - replaying an identical vote is idempotent → counts never double-apply
 */
export function makeVoteHandler(target: "post" | "comment") {
  return handler(async (req: NextRequest, ctx: RouteContext) => {
    const me = await requireUser();
    const { id } = await ctx.params;
    const body = await readBody(req);
    const raw = Number(body.value);
    if (![1, 0, -1].includes(raw)) throw new ApiError(400, "Vote value must be 1, 0 or -1.");
    const value = raw as 1 | 0 | -1;

    const db = getDB();
    const collection = findTarget(db, target, id);
    if (!collection || collection.removed) throw new ApiError(404, "That content no longer exists.");

    const result = mutate((d) => {
      const item = findTarget(d, target, id);
      if (!item) throw new ApiError(404, "That content no longer exists.");

      const index = d.votes.findIndex((v) => v.userId === me.id && v.target === target && v.targetId === id);
      const existing: Vote | undefined = index >= 0 ? d.votes[index] : undefined;

      if (value === 0) {
        if (existing) {
          if (existing.value === 1) item.upvotes = Math.max(0, item.upvotes - 1);
          else item.downvotes = Math.max(0, item.downvotes - 1);
          d.votes.splice(index, 1);
        }
      } else if (!existing) {
        d.votes.push({ userId: me.id, target, targetId: id, value, createdAt: now() });
        if (value === 1) item.upvotes += 1;
        else item.downvotes += 1;
      } else if (existing.value !== value) {
        if (existing.value === 1) {
          item.upvotes = Math.max(0, item.upvotes - 1);
          item.downvotes += 1;
        } else {
          item.downvotes = Math.max(0, item.downvotes - 1);
          item.upvotes += 1;
        }
        existing.value = value;
      }

      const viewerVote = d.votes.find((v) => v.userId === me.id && v.target === target && v.targetId === id)?.value ?? 0;
      return { upvotes: item.upvotes, downvotes: item.downvotes, viewerVote };
    });

    return json({ ...result, score: result.upvotes - result.downvotes });
  });
}

function findTarget(db: { posts: Counted[]; comments: Counted[] }, target: "post" | "comment", id: string): Counted | undefined {
  return target === "post" ? db.posts.find((p) => p.id === id) : db.comments.find((c) => c.id === id);
}
