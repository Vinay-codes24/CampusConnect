import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { EVENT_CATEGORIES, type CampusEvent, type EventCategory, type EventGroup, EVENT_GROUP_BY_CATEGORY } from "@/lib/types";
import { isoDate, oneOf, optional, str } from "@/lib/validation";
import { toView } from "@/lib/events";

const FILTERS = ["upcoming", "today", "week", "technical", "cultural", "sports", "academic", "career", "mine", "all"] as const;

/** GET /api/events?filter=&q= */
export const GET = handler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const filter = (FILTERS as readonly string[]).includes(url.searchParams.get("filter") ?? "")
    ? (url.searchParams.get("filter") as (typeof FILTERS)[number])
    : "upcoming";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const viewer = await getCurrentUser();
  const db = getDB();

  let list = db.events.filter((e) => e.published || (viewer && (viewer.role === "admin" || viewer.id === e.createdBy)));

  if (q) {
    list = list.filter((e) => `${e.title} ${e.category} ${e.organizer} ${e.venue} ${e.description}`.toLowerCase().includes(q));
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const weekEnd = new Date(dayStart.getTime() + 7 * 86_400_000);
  const isUpcoming = (e: CampusEvent) => new Date(e.end).getTime() > Date.now();

  if (filter === "upcoming") {
    list = list.filter(isUpcoming);
  } else if (filter === "today") {
    list = list.filter((e) => new Date(e.start) < dayEnd && new Date(e.end).getTime() > dayStart.getTime());
  } else if (filter === "week") {
    list = list.filter((e) => new Date(e.start) >= dayStart && new Date(e.start) <= weekEnd);
  } else if (filter === "mine") {
    list = viewer
      ? list.filter((e) => db.registrations.some((r) => r.eventId === e.id && r.userId === viewer.id && r.status === "registered"))
      : [];
  } else if (filter === "all") {
    // every event, past included
  } else {
    const group = filter.toUpperCase() as EventGroup;
    list = list.filter((e) => isUpcoming(e) && EVENT_GROUP_BY_CATEGORY[e.category] === group);
  }

  list = [...list].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return json({ events: list.map((e) => toView(e, db, viewer?.id ?? null)), total: list.length });
});

const STAFF: Array<"faculty" | "organizer" | "admin"> = ["faculty", "organizer", "admin"];

/** POST /api/events — create an event (faculty, club organizers, admins). */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireRole(...STAFF);
  const body = await readBody(req);

  const title = str(body.title, { field: "Event name", min: 4, max: 140 });
  const description = str(body.description, { field: "Description", min: 20, max: 4000 });
  const category = oneOf(body.category, EVENT_CATEGORIES, "category") as EventCategory;
  const start = isoDate(body.start, "Start time");
  const end = isoDate(body.end, "End time");
  if (new Date(end) <= new Date(start)) throw new ApiError(400, "The end time must be after the start time.");

  const venue = str(body.venue, { field: "Venue", min: 2, max: 120 });
  const organizer = str(body.organizer, { field: "Organizer", min: 2, max: 120 });
  const deadline = body.deadline ? isoDate(body.deadline, "Registration deadline") : null;
  const seats = body.seats ? Math.max(1, Math.min(5000, Number(body.seats) || 0)) : null;

  const created = mutate((db) => {
    const event: CampusEvent = {
      id: uid(),
      title,
      description,
      category,
      banner: typeof body.banner === "string" && body.banner.startsWith("/") ? body.banner : null,
      start,
      end,
      venue,
      organizer,
      organizerId: me.id,
      deadline,
      seats,
      eligibility: optional(body.eligibility, 600),
      instructions: optional(body.instructions, 1200),
      registrationUrl: optional(body.registrationUrl, 300),
      createdBy: me.id,
      createdAt: now(),
      published: body.published !== false,
      related: [],
    };
    db.events.unshift(event);

    if (event.published) {
      db.users
        .filter((u) => u.notificationPrefs.eventReminders)
        .forEach((u) => {
          db.notifications.push({
            id: uid(),
            userId: u.id,
            type: "event_reminder",
            title: `New event: ${event.title}`,
            body: `${event.category} · ${new Date(event.start).toLocaleDateString()} · ${event.venue}`,
            link: `/events/${event.id}`,
            important: false,
            createdAt: now(),
          });
        });
    }
    return event;
  });

  const db = getDB();
  return json({ event: toView(created, db, me.id) }, 201);
});
