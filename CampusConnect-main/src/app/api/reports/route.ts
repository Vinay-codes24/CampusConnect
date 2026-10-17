import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { REPORT_REASONS, type Report, type ReportReason, type VoteTarget } from "@/lib/types";
import { oneOf, optional, str } from "@/lib/validation";

/** POST /api/reports — file a moderation report against a post or comment. */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = await readBody(req);
  const target = oneOf(body.target, ["post", "comment"] as const, "target") as VoteTarget;
  const targetId = str(body.targetId, { field: "Content" });
  const reason = oneOf(body.reason, REPORT_REASONS, "reason") as ReportReason;
  const details = optional(body.details, 500);

  const db = getDB();
  const exists =
    target === "post"
      ? db.posts.some((p) => p.id === targetId)
      : db.comments.some((c) => c.id === targetId);
  if (!exists) throw new ApiError(404, "That content no longer exists.");

  if (target === "post") {
    const post = db.posts.find((p) => p.id === targetId);
    if (post?.authorId === me.id) throw new ApiError(400, "You cannot report your own post.");
  }

  const duplicate = db.reports.some(
    (r) => r.target === target && r.targetId === targetId && r.reporterId === me.id && r.status === "open",
  );
  if (duplicate) throw new ApiError(409, "You have already reported this. Moderators are reviewing it.");

  const report = mutate((d) => {
    const created: Report = {
      id: uid(),
      target,
      targetId,
      reporterId: me.id,
      reason,
      details,
      status: "open",
      createdAt: now(),
      resolution: null,
      resolvedBy: null,
    };
    d.reports.unshift(created);

    // Tell moderators there is something in the queue.
    d.users
      .filter((u) => u.role === "admin" || u.role === "faculty")
      .forEach((mod) => {
        d.notifications.push({
          id: uid(),
          userId: mod.id,
          type: "moderation",
          title: "New content report",
          body: `${me.name} reported a ${target}: ${reason}`,
          link: "/admin?tab=reports",
          important: true,
          createdAt: now(),
        });
      });

    return created;
  });

  return json({ report }, 201);
});
