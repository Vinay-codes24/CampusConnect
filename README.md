# CampusConnect

A unified digital campus for college students: a Reddit-style social feed, a campus
events discovery board, and an academic dashboard — in one responsive Next.js app.

> **Demo build.** Everything you see runs on seeded *sample data* (labelled in the UI).
> Read “Storage & demo mode” below to plug in a real database.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student (Aarav) | `student@campus.edu` | `student123` |
| Faculty (Dr. Meera Iyer) | `faculty@campus.edu` | `faculty123` |
| Club organizer (Rohan) | `organizer@campus.edu` | `organizer123` |
| Administrator | `admin@campus.edu` | `admin123` |

---

## What is implemented

**Header & navigation** — sticky header with logo/brand, global search (live
results across posts, events, students, resources, subjects, announcements,
scholarships and exams), notification bell with unread badge, profile menu.
Exactly three primary tabs: **Posts · Events · Academics**, highlighted per route,
switched client-side with no full page reload. Posts is the landing section.

**Posts** (`/posts`, `/posts/[id]`)
- Create-post composer: title, body, category (text / meme / question /
  announcement / study tip / campus life), image & video upload with preview,
  live preview before publishing, publish + cancel.
- Feed with filters (Latest, Trending, Most Upvoted, Questions, Study Resources,
  Campus Life, Memes), keyword search, infinite scroll + “Load more”.
- Post cards: avatar, name, department, year, time, category tag, media,
  upvote/downvote with optimistic UI, comment count, share, report, delete.
- Voting: one vote per user per post, toggle to remove, switching between
  up/down, idempotent on repeat requests, persisted server-side (survives refresh).
- Comments: threaded replies (2+ levels), comment upvotes, delete own comment,
  report comment, live comment count.
- Share: Web Share API when available, clipboard copy with confirmation toast.
- Reddit-style left rail on `/posts`: **Recent posts** (5 latest with score,
  comments and age), **Join communities** (8 seeded campus communities with live
  member counts and a server-persisted Join/Leave toggle), and **Explore**
  (feed filters plus quick links to events, exams, scholarships and the
  timetable). Selecting a community filters the feed via
  `/posts?community=<id>`, shows a banner card, and new posts are published to
  that community. On mobile the rail stacks below the feed. Post cards show an
  `r/<slug>` chip linking back to the community.

**Events** (`/events`, `/events/[id]`, `/events/new`)
- Card grid with banners, category, date/time, venue, organizer, seats left,
  registration status; search + filters (Upcoming, Today, This Week, Technical,
  Cultural, Sports, Academic, Career, My Events).
- Detail page with full description, eligibility, instructions, related
  announcements, share, and Register / Withdraw (no duplicate registrations,
  seat limits, deadline enforcement).
- Event creation for faculty / club organizers / admins, with banner upload.

**Academics** (`/academics` + seven dashboards)
Syllabus (dept → semester → subject → units, PDF download), Scholarships
(official vs. community listings, deadline filters), Attendance (per-subject
progress bars against the 75% minimum, read-only for students), Timetable
(weekly/daily, current day and next class highlighted, labs and breaks),
Notifications (academic notices, read/unread, important highlighting), Study
Materials (filterable library with real downloads), Exam Schedule (list + calendar
view, countdowns).

**Accounts** — sign-up, login, logout, password reset (two-step), student profile
(editable, avatar upload, interests, posts, registered events), public profiles,
notification centre, notification preferences.

**Administration** (`/admin`) — role-based (Student · Faculty · Club organizer ·
Administrator): moderation queue (resolve / dismiss / remove with notes),
publishing official announcements, managing syllabus / materials / exams /
attendance / scholarships, user roles & verification, event management.

**Cross-cutting** — in-app notifications (replies, post interactions, event
registrations, academic announcements, moderation), unified search, loading /
empty / error states everywhere, keyboard-navigable dialogs with focus trapping,
`aria-*` states on toggles, reduced-motion support, responsive from 320px up.

---

## Architecture

```
src/
  app/
    layout.tsx            Header + 3-tab nav + footer, session bootstrap
    posts/ events/ academics/ login/ signup/ reset/ profile/ notifications/
    settings/ admin/ search/
    api/                  Route handlers (authoritative validation & auth)
  components/             Client UI (providers, header, nav, posts/, …)
  lib/
    types.ts              Domain model (1:1 with future DB tables)
    db.ts                 Data access + atomic file persistence
    seed.ts               Demo dataset (sample content)
    auth.ts password.ts   Sessions, scrypt hashing, role checks
    api.ts validation.ts  Handler wrapper, error model, input validation
    serialize.ts events.ts media.ts vote.ts pdf.ts client.ts
data/
  db.json                 The database (created on first run)
  uploads/                Uploaded files (random names, validated)
public/samples/           Generated demo banners/memes
scripts/make-samples.mjs  Regenerates the demo artwork
```

Request flow: **client component → `api()` → route handler → `requireUser()` /
`requireRole()` → validation → `mutate()` → JSON response.** The server is the
authority for every state change: votes, registrations, reports, roles and
academic records cannot be forged from the client.

Security measures already in place: scrypt password hashing with per-user salts,
httpOnly SameSite session cookies with hashed tokens, server-side input
validation on every endpoint, role gates on all write endpoints, MIME + magic-byte
+ size validation on uploads, random upload filenames with a strict serving
pattern (no path traversal), per-user scoping of attendance records, and error
responses that never leak stack traces.

---

## Storage & demo mode

**What is configured today:** a local, file-backed JSON database
(`data/db.json`) written atomically. It is a real backend — data persists across
restarts and page refreshes — but it is *not* PostgreSQL, so the app runs in a
clearly labelled **demo mode** (see the badge in the footer/header).

**To move to PostgreSQL:**

1. Provision a PostgreSQL database and add `pg` (or Prisma/Drizzle) to the project.
2. Create tables matching the interfaces in `src/lib/types.ts` (they are named
   identically: `users`, `sessions`, `posts`, `comments`, `votes`, `reports`,
   `events`, `registrations`, `notifications`, `reads`, `syllabus`,
   `scholarships`, `attendance`, `timetables`, `materials`, `exams`).
   Add unique indexes on `(userId, target, targetId)` for `votes` and on
   `(eventId, userId)` for `registrations` so the duplicate-vote and
   duplicate-registration guarantees are enforced by the database too.
3. Replace the bodies of `getDB()` / `mutate()` in `src/lib/db.ts` with queries.
   No route handler or UI code changes — they only use `getDB()`, `mutate()`,
   `requireUser()` and `requireRole()`.
4. Move `data/uploads` to object storage (S3/GCS) and point `POST /api/upload`
   + `GET /api/files/[name]` at it.
5. Set `DATA_MODE=production` and replace the “Demo build” badge (it is rendered
   from `layout.tsx`) with your college branding.

**To enable real e-mail** (college-email verification, password-reset codes):
`POST /api/auth/reset` currently returns the reset code in the response because
no mail service exists in demo mode — wire it to your provider and stop
returning `token`.

---

## Notes on sample content

All posts, events, scholarships, attendance figures and announcements are
**fictional sample data** generated by `src/lib/seed.ts` for demonstration. They
do not represent any real college, student, or official academic record.

To reset the demo data: stop the server and delete `data/db.json`.
