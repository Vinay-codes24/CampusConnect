import type { CampusEvent, EventGroup } from "./types";
import { EVENT_GROUP_BY_CATEGORY } from "./types";

type Db = {
  registrations: { eventId: string; userId: string; status: string }[];
};

export type EventView = CampusEvent & {
  registered: boolean;
  attendeeCount: number;
  seatsLeft: number | null;
  status: "open" | "closed" | "full" | "registered" | "past";
  group: EventGroup;
};

/** Projects an event with viewer-specific registration state. */
export function toView(e: CampusEvent, db: Db, viewerId: string | null): EventView {
  const registrations = db.registrations.filter((r) => r.eventId === e.id && r.status === "registered");
  const registered = !!viewerId && registrations.some((r) => r.userId === viewerId);
  const seatsLeft = e.seats == null ? null : Math.max(0, e.seats - registrations.length);
  const past = new Date(e.start).getTime() < Date.now();
  const deadlinePassed = !!e.deadline && new Date(e.deadline).getTime() < Date.now();

  const status: EventView["status"] = past
    ? "past"
    : registered
      ? "registered"
      : deadlinePassed
        ? "closed"
        : seatsLeft === 0
          ? "full"
          : "open";

  return {
    ...e,
    registered,
    attendeeCount: registrations.length,
    seatsLeft,
    status,
    group: EVENT_GROUP_BY_CATEGORY[e.category],
  };
}
