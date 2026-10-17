import Link from "next/link";
import { CalendarDays, Newspaper, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container">
      <div className="panel card-pad" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", padding: 40 }}>
        <div className="empty-icon" aria-hidden="true">404</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>This page isn&rsquo;t on campus</h1>
        <p className="muted" style={{ marginBottom: 22 }}>
          The link may be outdated, or the content has been removed by a moderator.
        </p>
        <div className="row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
          <Link href="/posts" className="btn btn-primary">
            <Newspaper size={16} /> Posts
          </Link>
          <Link href="/events" className="btn btn-ghost">
            <CalendarDays size={16} /> Events
          </Link>
          <Link href="/academics" className="btn btn-ghost">
            <BookOpen size={16} /> Academics
          </Link>
        </div>
      </div>
    </div>
  );
}
