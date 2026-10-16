import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { liteUser } from "@/lib/serialize";
import type { Database } from "@/lib/types";

/**
 * GET  /api/admin/reports?status=open — moderation queue (faculty/admin)
 * POST /api/admin/reports             — resolve / dismiss / remove content
 */
export const GET = handler(async (req: NextRequest) => {
  await requireRole("faculty", "admin");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const db = getDB();

  const reports = db.reports
    .filter((r) => status === "all" || r.status === status)
    .map((r) => {
      const content =
        r.target === "post"
          ? db.posts.find((p) => p.id === r.targetId)
          : db.comments.find((c) => c.id === r.targetId);
      const authorId = content?.authorId ?? null;
      return {
        ...r,
        excerpt: (content && "title" in content ? `${content.title} — ` : "") + (content?.body ?? "(content removed)").slice(0, 220),
        contentAuthor: authorId ? liteUser(db, authorId) : null,
        reporter: liteUser(db, r.reporterId),
        contentRemoved: content ? !!content.removed : true,
      };
    });

  return json({
    reports,
    open: reports.filter((r) => r.status === "open").length,
  });
});

export const POST = handler(async (req: NextRequest) => {
  const me = await requireRole("faculty", "admin");
  const body = await readBody(req);
  const reportId = String(body.reportId ?? "");
  const action = String(body.action ?? "");
  const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";

  if (!["resolve", "dismiss", "remove"].includes(action)) {
    throw new ApiError(400, "Choose an action: resolve, dismiss or remove.");
  }

  const db = getDB();
  const report = db.reports.find((r) => r.id === reportId);
  if (!report) throw new ApiError(404, "That report does not exist.");

  mutate((d) => {
    const target = d.reports.find((r) => r.id === reportId);
    if (!target) return;
    target.status = action === "dismiss" ? "dismissed" : "resolved";
    target.resolution = note || (action === "remove" ? "Content removed by a moderator." : action === "dismiss" ? "Report dismissed." : "Reviewed, no violation.");
    target.resolvedBy = me.id;

    if (action === "remove") {
      if (target.target === "post") {
        const post = d.posts.find((p) => p.id === target.targetId);
        if (post) {
          post.removed = true;
          notify(d, post.authorId, `Your post “${post.title}” was removed`, `A moderator removed it: ${target.reason}. ${target.resolution}`);
        }
      } else {
        const comment = d.comments.find((c) => c.id === target.targetId);
        if (comment) {
          comment.removed = true;
          const post = d.posts.find((p) => p.id === comment.postId);
          if (post) post.commentCount = Math.max(0, post.commentCount - 1);
          notify(d, comment.authorId, "Your comment was removed", `A moderator removed it: ${target.reason}. ${target.resolution}`);
        }
      }
    }
  });

  return json({ ok: true, report: getDB().reports.find((r) => r.id === reportId) });
});

function notify(
  db: Database,
  userId: string,
  title: string,
  body: string,
) {
  db.notifications.push({
    id: uid(),
    userId,
    type: "moderation",
    title,
    body,
    link: "/posts",
    important: true,
    createdAt: now(),
  });
}
