import { NextRequest } from "next/server";
import { handler, json, ApiError, type RouteContext } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toView } from "@/lib/events";

/**
 * POST   /api/events/[id]/register — register (idempotent, no duplicates).
 * DELETE /api/events/[id]/register — withdraw a registration.
 */
export const POST = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;

  const db = getDB();
  const event = db.events.find((e) => e.id === id);
  if (!event) throw new ApiError(404, "That event does not exist.");
  if (new Date(event.end).getTime() < Date.now()) throw new ApiError(400, "This event has already finished.");
  if (event.deadline && new Date(event.deadline).getTime() < Date.now()) {
    throw new ApiError(400, "The registration deadline for this event has passed.");
  }

  const existing = db.registrations.find((r) => r.eventId === id && r.userId === me.id);
  if (existing && existing.status === "registered") {
    throw new ApiError(409, "You are already registered for this event.");
  }

  const attendeeCount = db.registrations.filter((r) => r.eventId === id && r.status === "registered").length;
  if (event.seats != null && attendeeCount >= event.seats) {
    throw new ApiError(400, "All seats for this event are taken.");
  }

  mutate((d) => {
    const found = d.registrations.find((r) => r.eventId === id && r.userId === me.id);
    if (found) {
      found.status = "registered";
      found.createdAt = now();
    } else {
      d.registrations.push({ id: uid(), eventId: id, userId: me.id, status: "registered", createdAt: now() });
    }
    d.notifications.push({
      id: uid(),
      userId: me.id,
      type: "event_registration",
      title: `Registration confirmed — ${event.title}`,
      body: `You are registered. ${event.venue} · ${new Date(event.start).toLocaleString()}`,
      link: `/events/${id}`,
      important: false,
      createdAt: now(),
    });
  });

  const fresh = getDB();
  return json({ event: toView(fresh.events.find((e) => e.id === id)!, fresh, me.id), registered: true });
});

export const DELETE = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;

  const db = getDB();
  const event = db.events.find((e) => e.id === id);
  if (!event) throw new ApiError(404, "That event does not exist.");

  const existing = db.registrations.find((r) => r.eventId === id && r.userId === me.id && r.status === "registered");
  if (!existing) throw new ApiError(400, "You are not registered for this event.");

  mutate((d) => {
    const found = d.registrations.find((r) => r.eventId === id && r.userId === me.id);
    if (found) found.status = "cancelled";
    d.notifications.push({
      id: uid(),
      userId: me.id,
      type: "event_registration",
      title: `Registration withdrawn — ${event.title}`,
      body: "Your seat has been released. You can register again if you change your mind.",
      link: `/events/${id}`,
      important: false,
      createdAt: now(),
    });
  });

  const fresh = getDB();
  return json({ event: toView(fresh.events.find((e) => e.id === id)!, fresh, me.id), registered: false });
});
