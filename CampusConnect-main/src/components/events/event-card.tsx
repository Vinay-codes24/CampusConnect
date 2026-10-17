"use client";

import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import type { EventView } from "@/lib/events";
import { EventBanner, RegisterControl, STATUS_META, SeatsBar, eventWhen } from "./shared";

/**
 * Event card for the /events grid: banner, title, category, when/where/who,
 * seats left and a register control that updates the card in place.
 */
export function EventCard({
  event,
  onChange,
}: {
  event: EventView;
  onChange: (event: EventView) => void;
}) {
  const status = STATUS_META[event.status];

  return (
    <article className="panel card-hover" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Link
        href={`/events/${event.id}`}
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: "block", overflow: "hidden" }}
      >
        <EventBanner
          src={event.banner}
          alt=""
          style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
        />
      </Link>

      <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <span className="tag">{event.category}</span>
          <span className={status.tagClass} title={status.label}>
            {status.label}
          </span>
        </div>

        <Link
          href={`/events/${event.id}`}
          style={{
            fontWeight: 700,
            fontSize: 16.5,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {event.title}
        </Link>

        <div className="stack" style={{ gap: 6 }}>
          <span className="row text-sm muted" style={{ gap: 8, alignItems: "flex-start" }}>
            <Calendar size={15} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
            <span>{eventWhen(event)}</span>
          </span>
          <span className="row text-sm muted" style={{ gap: 8, alignItems: "flex-start" }}>
            <MapPin size={15} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
            <span>{event.venue}</span>
          </span>
          <span className="row text-sm muted" style={{ gap: 8, alignItems: "flex-start" }}>
            <Users size={15} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {event.organizer}
            </span>
          </span>
        </div>

        <SeatsBar event={event} />

        <div style={{ marginTop: "auto", paddingTop: 4 }}>
          <RegisterControl event={event} onChange={onChange} />
        </div>
      </div>
    </article>
  );
}
