import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  important: boolean;
  createdAt: string;
  read: boolean;
};

/** GET /api/notifications?limit=20&summary=1 */
export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const db = getDB();
  const readIds = new Set(db.reads.filter((r) => r.userId === me.id).map((r) => r.notificationId));

  const items: Item[] = db.notifications
    .filter((n) => n.userId === me.id || n.userId === "*")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      important: n.important,
      createdAt: n.createdAt,
      read: readIds.has(n.id),
    }));

  const unread = items.filter((i) => !i.read).length;

  if (url.searchParams.get("summary") === "1") return json({ unread });

  return json({
    items: items.slice(0, limit),
    unread,
    prefs: me.notificationPrefs,
    total: items.length,
  });
});

/**
 * POST /api/notifications
 *   { id }             → mark one as read
 *   { all: true }      → mark everything as read
 *   { prefs }          → update notification preferences
 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = await readBody(req);

  if (body.prefs && typeof body.prefs === "object") {
    const allowed = ["replies", "postInteractions", "eventReminders", "academic"] as const;
    const next = { ...me.notificationPrefs };
    allowed.forEach((key) => {
      if (key in (body.prefs as Record<string, unknown>)) next[key] = Boolean((body.prefs as Record<string, unknown>)[key]);
    });
    mutate((db) => {
      const user = db.users.find((u) => u.id === me.id);
      if (user) user.notificationPrefs = next;
    });
    return json({ prefs: next });
  }

  if (body.all === true) {
    mutate((db) => {
      const mine = db.notifications.filter((n) => n.userId === me.id || n.userId === "*").map((n) => n.id);
      const existing = new Set(db.reads.filter((r) => r.userId === me.id).map((r) => r.notificationId));
      mine.forEach((id) => {
        if (!existing.has(id)) db.reads.push({ userId: me.id, notificationId: id });
      });
    });
    return json({ ok: true });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) throw new ApiError(400, "Please provide a notification id.");
  const target = getDB().notifications.find((n) => n.id === id);
  if (!target) throw new ApiError(404, "That notification does not exist.");
  if (target.userId !== me.id && target.userId !== "*") throw new ApiError(403, "Not your notification.");

  mutate((db) => {
    if (!db.reads.some((r) => r.userId === me.id && r.notificationId === id)) {
      db.reads.push({ userId: me.id, notificationId: id });
    }
  });
  return json({ ok: true });
});
