import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError, type RouteContext } from "@/lib/api";
import { getDB, mutate } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { toView } from "@/lib/events";

/** GET /api/events/[id] — event details + related announcements. */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const viewer = await getCurrentUser();
  const db = getDB();
  const event = db.events.find((e) => e.id === id);
  if (!event) throw new ApiError(404, "That event does not exist.");
  return json({ event: toView(event, db, viewer?.id ?? null) });
});

/** PATCH /api/events/[id] — organizer or admin edits an event. */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const db = getDB();
  const event = db.events.find((e) => e.id === id);
  if (!event) throw new ApiError(404, "That event does not exist.");
  if (event.createdBy !== me.id && me.role !== "admin") throw new ApiError(403, "Only the creator or an admin can edit this event.");

  const body = await readBody(req);
  mutate((d) => {
    const target = d.events.find((e) => e.id === id);
    if (!target) return;
    if (typeof body.title === "string" && body.title.trim().length >= 4) target.title = body.title.trim();
    if (typeof body.description === "string" && body.description.trim().length >= 20) target.description = body.description.trim();
    if (typeof body.venue === "string" && body.venue.trim()) target.venue = body.venue.trim();
    if (typeof body.published === "boolean") target.published = body.published;
    if (typeof body.start === "string" && !Number.isNaN(new Date(body.start).getTime())) target.start = new Date(body.start).toISOString();
    if (typeof body.end === "string" && !Number.isNaN(new Date(body.end).getTime())) target.end = new Date(body.end).toISOString();
  });

  const fresh = getDB();
  return json({ event: toView(fresh.events.find((e) => e.id === id)!, fresh, me.id) });
});

/** DELETE /api/events/[id] — organizer or admin. */
export const DELETE = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const db = getDB();
  const event = db.events.find((e) => e.id === id);
  if (!event) throw new ApiError(404, "That event does not exist.");
  if (event.createdBy !== me.id && me.role !== "admin") throw new ApiError(403, "Only the creator or an admin can delete this event.");
  mutate((d) => {
    d.events = d.events.filter((e) => e.id !== id);
    d.registrations = d.registrations.filter((r) => r.eventId !== id);
  });
  return json({ ok: true });
});
