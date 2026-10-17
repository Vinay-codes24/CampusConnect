# CampusConnect — build contract

Read this before writing any code. It is the single source of truth for conventions
so that independently built sections look and behave like one product.

## Stack & commands

- Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4.
- Dev server: `npm run dev` (already running on http://localhost:3000).
- Typecheck: `npm.cmd run typecheck` (run this before you finish — it MUST pass).
- No new npm dependencies may be added. Icons: `lucide-react` only.
- Import alias: `@/*` → `./src/*`.

## File layout

```
src/
  app/
    api/**/route.ts        Server endpoints (see "API" below)
    posts/…                Social feed pages      (owner: main agent)
    events/…               Events pages           (owner: agent A)
    academics/…            Academics pages        (owner: agent B)
    login/ signup/ reset/ profile/ notifications/ settings/ admin/ search/
  components/              Shared client components
  lib/                     Types, db, auth, validation, helpers
```

**Route files (`src/app/api/**/route.ts`) may only export HTTP verbs**
(`GET`, `POST`, `PATCH`, `DELETE`, …). Exporting anything else breaks the build.
Shared server logic belongs in `src/lib/*`.

## Design system (do not invent new colours or radii)

Use the classes already defined in `src/app/globals.css`:

| Purpose | Classes |
| --- | --- |
| Page wrapper | `<div className="container stack">` |
| Card | `card card-pad`, `panel card-pad`, add `card-hover` for clickable cards |
| Buttons | `btn btn-primary` · `btn-ghost` · `btn-soft` · `btn-danger` · `btn-accent`; sizes `btn-sm`, `btn-lg` |
| Filter chips | `<button className="chip" aria-pressed={bool}>` |
| Labels/tags | `tag`, `tag-accent`, `tag-warn`, `tag-danger`, `tag-muted` |
| Forms | `.field` > `label.label` + `input.input` / `textarea.textarea` / `select.select`; helper text `.hint` |
| Muted text | `.text-sm.muted` |
| Progress | `<div className="progress"><span style={{width:'70%'}} /></div>` |
| Empty state | `<EmptyState title body action icon />` from `@/components/ui` |
| Loading | `<SkeletonCard />` from `@/components/ui` |
| Modal | `<Modal open onClose title footer size="sm|md|lg" />` from `@/components/ui` |
| Avatar | `<Avatar name src size />` from `@/components/ui` |
| Demo badge | `<span className="demo-badge">Demo data</span>` |

Colours come from Tailwind tokens (see `@theme` in globals.css):
`brand-50…900` (indigo), `accent-50…700` (teal), `ink-100…900`, `canvas`.
Prefer `bg-brand-600 text-white`, `text-ink-500`, `border-ink-200`, `bg-white`.

## Client conventions

- Every interactive page/component starts with `"use client";`.
- Fetch data with `api<T>(path, { json })` from `@/lib/client`. It throws
  `Error(message)` on non-2xx — show the message with `toast(msg, "error")`.
- `useApp()` from `@/components/providers` gives:
  `{ user, setUser, refreshUser, unread, refreshNotifications, toasts, toast }`.
  `user` is `null` when signed out — handle that state (prompt to log in).
- Helpers: `timeAgo`, `formatDate`, `formatTime`, `formatBytes`, `initials`
  in `@/lib/client`.
- Shared UI: `Modal`, `Avatar`, `EmptyState`, `ErrorState`, `SkeletonCard`, `Spinner`.
- Every page needs **loading**, **empty**, and **error** states, plus
  `aria-label`s on icon-only buttons. Never leave a button that does nothing.
- Layout: mobile-first, `max-w` containers via `.container`. Cards stack to one
  column below 768px.

## Types

All domain types are in `src/lib/types.ts` (read it — do not redeclare them).

## API

Auth uses an httpOnly session cookie; include `credentials: "same-origin"`
(the `api()` helper already does). All endpoints return JSON; errors are
`{ error: string }` with a 4xx/5xx status.

### Public / auth
| Method & path | Body / query | Response |
| --- | --- | --- |
| `POST /api/auth/signup` | `{email,password,name,username,department?,year?}` | `{user}` 201 |
| `POST /api/auth/login` | `{email,password}` | `{user}` |
| `POST /api/auth/logout` | – | `{ok}` |
| `GET /api/auth/me` | – | `{user\|null}` |
| `PATCH /api/auth/me` | `{name?,username?,department?,year?,bio?,interests?,avatar?}` | `{user}` |
| `POST /api/auth/reset` | `{email}` → `{ok,demo,message,token}`; `{email,token,password}` → `{ok,message}` | |
| `GET /api/search` | `?q=&limit=` | `{results:{type,title,subtitle,href}[],total}` |

### Posts
| Method & path | Body / query | Response |
| --- | --- | --- |
| `GET /api/posts` | `?filter=latest\|trending\|upvoted\|questions\|resources\|campus\|memes&q=&page=&limit=&author=&community=` | `{posts:PostView[],page,hasMore,total}` |
| `POST /api/posts` | `{title,body,category,media?,communityId?}` | `{post}` 201 |
| `GET /api/posts/[id]` | – | `{post,comments:CommentView[]}` |
| `DELETE /api/posts/[id]` | – | `{ok}` |
| `POST /api/posts/[id]/vote` | `{value:1\|0\|-1}` | `{upvotes,downvotes,viewerVote,score}` |
| `POST /api/comments` | `{postId,body,parentId?}` | `{comment}` 201 |
| `DELETE /api/comments/[id]` | – | `{ok}` |
| `POST /api/comments/[id]/vote` | `{value:1\|0\|-1}` | same as post vote |
| `POST /api/reports` | `{target:'post'\|'comment',targetId,reason,details?}` | `{report}` 201 |

`PostView` = `Post & {author:LiteUser,community:{id,name,slug}\|null,viewerVote,canDelete,score}`
(see `src/lib/serialize.ts`). Categories are in `POST_CATEGORIES`.

### Communities (rail on `/posts`)
| Method & path | Body / query | Response |
| --- | --- | --- |
| `GET /api/communities` | – (works signed out) | `{communities:{id,name,slug,description,members,icon,tone,postCount,joined}[]}` |
| `POST /api/communities/[id]/join` | – — sign in required | `{id,joined,members}` (membership toggles) |

Selecting a community filters the feed with `/posts?community=<id>`.

### Events
| Method & path | Body / query | Response |
| --- | --- | --- |
| `GET /api/events` | `?filter=upcoming\|today\|week\|technical\|cultural\|sports\|academic\|career\|mine\|all&q=` | `{events:EventView[],total}` |
| `POST /api/events` | `{title,description,category,start,end,venue,organizer,deadline?,seats?,eligibility?,instructions?,registrationUrl?,banner?}` — role: faculty/organizer/admin | `{event}` 201 |
| `GET /api/events/[id]` | – | `{event}` |
| `PATCH /api/events/[id]` | partial fields — creator/admin | `{event}` |
| `DELETE /api/events/[id]` | – | `{ok}` |
| `POST /api/events/[id]/register` | – | `{event,registered:true}` |
| `DELETE /api/events/[id]/register` | – | `{event,registered:false}` |

`EventView` (from `src/lib/events.ts`) = `CampusEvent & {registered,attendeeCount,seatsLeft,status:'open'|'closed'|'full'|'registered'|'past',group}`.

### Academics / admin / users / notifications / files
| Method & path | Body / query | Response |
| --- | --- | --- |
| `GET /api/academics` | – (sign-in required) | `{viewer,syllabus,scholarships,attendance,timetables,materials,exams,demo:true}` |
| `GET/POST /api/notifications` | `?limit=&summary=1` / `{id}` \| `{all:true}` \| `{prefs:{…}}` | `{items,unread,prefs,total}` |
| `GET /api/users/[id]` | – | `{user,isSelf,posts,registrations,stats}` |
| `GET /api/admin/reports` | `?status=open\|all` — faculty/admin | `{reports,open}` |
| `POST /api/admin/reports` | `{reportId,action:'resolve'\|'dismiss'\|'remove',note?}` | `{ok,report}` |
| `POST /api/admin/records` | `{kind:'announcement'\|'syllabus'\|'material'\|'exam'\|'attendance'\|'timetable'\|'scholarship',data:{…}}` — faculty/admin | `{ok,summary,link}` |
| `DELETE /api/admin/records` | `{kind,id}` | `{ok}` |
| `GET /api/admin/users` | – admin | `{users[]}` |
| `POST /api/admin/users` | `{userId,role?}` \| `{userId,verified?}` admin | `{ok}` |
| `POST /api/upload` | `multipart` field `file` (+ optional `kind`) | `{url,name,size,kind}` 201 |
| `GET /api/files/[name]` | `?download=1` | binary |
| `GET /api/download` | `?type=syllabus\|material&id=…&format=pdf\|txt` | PDF attachment |

## Demo accounts (seeded)

| Role | Email | Password |
| --- | --- | --- |
| Student (Aarav) | `student@campus.edu` | `student123` |
| Faculty (Dr. Meera Iyer) | `faculty@campus.edu` | `faculty123` |
| Club organizer (Rohan) | `organizer@campus.edu` | `organizer123` |
| Administrator | `admin@campus.edu` | `admin123` |

## Hard rules

1. All sample content is demo data — surfaces that show academic records must
   keep the visible "Demo data" labelling (`className="demo-badge"`).
2. Never render a control the current user cannot use: hide/disable it with a
   tooltip or explain why (e.g. "Sign in to vote").
3. Server is the authority: never optimistically claim success without handling
   the returned error.
4. Keep every page responsive and keyboard-navigable (visible focus, labels on
   inputs, `aria-pressed`/`aria-current` on toggles).
