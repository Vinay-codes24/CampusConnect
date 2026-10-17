import { NextRequest } from "next/server";
import { handler, json } from "@/lib/api";
import { getDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Hit = { type: string; title: string; subtitle: string; href: string };

/**
 * GET /api/search?q=…  — unified search across posts, events, students,
 * academic resources, subjects and official announcements.
 */
export const GET = handler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(30, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const viewer = await getCurrentUser();
  const db = getDB();

  if (q.length < 2) return json({ results: [], total: 0 });

  const results: Hit[] = [];

  db.posts
    .filter((p) => !p.removed && `${p.title} ${p.body} ${p.category}`.toLowerCase().includes(q))
    .forEach((p) => {
      const author = db.users.find((u) => u.id === p.authorId);
      results.push({ type: "Post", title: p.title, subtitle: `${p.category} · by ${author?.name ?? "Unknown"}`, href: `/posts/${p.id}` });
    });

  db.events
    .filter((e) => e.published && `${e.title} ${e.description} ${e.category} ${e.organizer} ${e.venue}`.toLowerCase().includes(q))
    .forEach((e) => results.push({ type: "Event", title: e.title, subtitle: `${e.category} · ${e.venue}`, href: `/events/${e.id}` }));

  // Students are only searchable when the viewer is signed in (privacy setting).
  if (viewer) {
    db.users
      .filter((u) => `${u.name} ${u.username} ${u.department ?? ""} ${u.interests.join(" ")}`.toLowerCase().includes(q))
      .forEach((u) =>
        results.push({ type: "Student", title: u.name, subtitle: `${u.department ?? "Department"} · @${u.username}`, href: `/profile/${u.id}` }),
      );
  }

  db.materials
    .filter((m) => `${m.title} ${m.subject} ${m.department} ${m.type}`.toLowerCase().includes(q))
    .forEach((m) => results.push({ type: "Resource", title: m.title, subtitle: `${m.subject} · ${m.type}`, href: "/academics/study-materials" }));

  db.syllabus
    .filter((s) => `${s.subject} ${s.code} ${s.department}`.toLowerCase().includes(q))
    .forEach((s) => results.push({ type: "Subject", title: s.subject, subtitle: `${s.code} · ${s.department}`, href: "/academics/syllabus" }));

  db.notifications
    .filter((n) => (n.userId === "*" || n.userId === viewer?.id) && `${n.title} ${n.body}`.toLowerCase().includes(q))
    .forEach((n) => results.push({ type: "Announcement", title: n.title, subtitle: n.body.slice(0, 90), href: n.link ?? "/academics/notifications" }));

  db.scholarships
    .filter((s) => `${s.name} ${s.eligibility} ${s.provider}`.toLowerCase().includes(q))
    .forEach((s) => results.push({ type: "Scholarship", title: s.name, subtitle: `${s.amount} · closes ${s.deadline.slice(0, 10)}`, href: "/academics/scholarships" }));

  db.exams
    .filter((e) => `${e.name} ${e.subject} ${e.code}`.toLowerCase().includes(q))
    .forEach((e) => results.push({ type: "Exam", title: `${e.subject} — ${e.name}`, subtitle: `${e.code} · ${e.date.slice(0, 10)}`, href: "/academics/exam-schedule" }));

  return json({ results: results.slice(0, limit), total: results.length });
});
