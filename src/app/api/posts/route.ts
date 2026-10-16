import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { postView } from "@/lib/serialize";
import {
  PROGRAMS,
  YEAR_STATUSES,
  POST_CATEGORIES,
  type Post,
  type PostCollege,
  type Program,
  type YearStatus,
} from "@/lib/types";
import { UNIVERSITY_IDS, findUniversity } from "@/lib/universities";
import { oneOf, optional, str } from "@/lib/validation";
import { sanitizeMedia } from "@/lib/media";

const FILTERS = ["latest", "trending", "upvoted", "questions", "resources", "campus", "memes", "kalesh", "tea", "gossips", "rant", "jobs"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * Reads an optional structured filter param. Absent/empty means "no filter";
 * a non-empty unknown value is a client bug, so it fails loudly instead of
 * silently showing an unfiltered feed.
 */
function optionalEnum<T extends string>(raw: string | null, allowed: readonly T[], label: string): T | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (!allowed.includes(value as T)) throw new ApiError(400, `Please choose a valid ${label}.`);
  return value as T;
}

export const GET = handler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const filter = (FILTERS as readonly string[]).includes(url.searchParams.get("filter") ?? "")
    ? (url.searchParams.get("filter") as Filter)
    : "latest";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(25, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));
  const authorId = url.searchParams.get("author");
  const communityId = url.searchParams.get("community");
  const college = optionalEnum(url.searchParams.get("college"), UNIVERSITY_IDS, "college community");
  const program = optionalEnum(url.searchParams.get("program"), PROGRAMS, "program");
  const yearStatus = optionalEnum(url.searchParams.get("year"), YEAR_STATUSES, "year or status");

  const viewer = await getCurrentUser();
  const db = getDB();

  let list = db.posts.filter((p) => !p.removed);
  if (authorId) list = list.filter((p) => p.authorId === authorId);
  if (communityId) list = list.filter((p) => p.communityId === communityId);
  // College feed: only posts explicitly filed to that college. Older posts
  // without the structured field stay visible in the All Colleges feed.
  if (college) list = list.filter((p) => p.college === college);
  if (program) list = list.filter((p) => p.program === program);
  if (yearStatus) list = list.filter((p) => p.yearStatus === yearStatus);

  if (q) {
    list = list.filter((p) => {
      const author = db.users.find((u) => u.id === p.authorId);
      const collegeName = p.college ? findUniversity(p.college) : null;
      const haystack = `${p.title} ${p.body} ${p.category} ${p.program ?? ""} ${p.yearStatus ?? ""} ${collegeName?.name ?? ""} ${collegeName?.shortName ?? ""} ${author?.name ?? ""} ${author?.username ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  const byFilter: Record<Filter, (p: Post) => boolean> = {
    latest: () => true,
    trending: () => true,
    upvoted: () => true,
    questions: (p) => p.category === "Question",
    resources: (p) => p.category === "Study Resources",
    campus: (p) => p.category === "Campus Life" || p.category === "Discussion",
    memes: (p) => p.category === "Memes",
    kalesh: (p) => p.category === "Kalesh",
    tea: (p) => p.category === "Tea",
    gossips: (p) => p.category === "Gossips",
    rant: (p) => p.category === "Rant",
    jobs: (p) => p.category === "Jobs",
  };
  list = list.filter(byFilter[filter]);

  const ageHours = (iso: string) => Math.max(1, (Date.now() - new Date(iso).getTime()) / 3_600_000);

  if (filter === "latest") {
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else if (filter === "trending") {
    // Score decays with age so old viral posts do not dominate forever.
    list = [...list].sort(
      (a, b) =>
        (b.upvotes - b.downvotes) / Math.pow(ageHours(b.createdAt), 0.55) -
        (a.upvotes - a.downvotes) / Math.pow(ageHours(a.createdAt), 0.55),
    );
  } else {
    list = [...list].sort((a, b) => b.upvotes - b.downvotes || b.createdAt.localeCompare(a.createdAt));
  }

  const start = (page - 1) * limit;
  const slice = list.slice(start, start + limit);

  return json({
    posts: slice.map((p) => postView(db, p, viewer?.id ?? null)),
    page,
    hasMore: start + limit < list.length,
    total: list.length,
  });
});

/** POST /api/posts — publish a new post. */
export const POST = handler(async (req: NextRequest) => {
  const viewer = await getCurrentUser();
  if (!viewer) throw new ApiError(401, "Sign in to create a post.");

  const body = await readBody(req);
  const title = str(body.title, { field: "Title", min: 3, max: 180 });
  const text = optional(body.body, 8000);
  const category = oneOf(body.category, POST_CATEGORIES, "category");
  if (!text && !Array.isArray(body.media)) throw new ApiError(400, "Your post needs some content.");

  const media = sanitizeMedia(body.media);

  // Structured college metadata — self-selected, validated against allowlists.
  const college = optionalEnum(typeof body.college === "string" ? body.college : null, UNIVERSITY_IDS, "college community");
  const program = optionalEnum(typeof body.program === "string" ? body.program : null, PROGRAMS, "program");
  const yearStatus = optionalEnum(typeof body.yearStatus === "string" ? body.yearStatus : null, YEAR_STATUSES, "year or status");

  const requestedCommunity =
    typeof body.communityId === "string" && body.communityId.trim().length > 0
      ? body.communityId.trim()
      : null;

  const created = mutate((db) => {
    if (requestedCommunity && !db.communities.some((c) => c.id === requestedCommunity)) {
      throw new ApiError(400, "That community does not exist.");
    }
    const post: Post = {
      id: uid(),
      authorId: viewer.id,
      communityId: requestedCommunity,
      title,
      body: text,
      category,
      media,
      createdAt: now(),
      upvotes: 1,
      downvotes: 0,
      commentCount: 0,
      removed: false,
      college: college as PostCollege | null,
      program: program as Program | null,
      yearStatus: yearStatus as YearStatus | null,
    };
    db.posts.unshift(post);
    db.votes.push({ userId: viewer.id, target: "post", targetId: post.id, value: 1, createdAt: now() });
    return post;
  });

  const db = getDB();
  return json({ post: postView(db, created, viewer.id) }, 201);
});
