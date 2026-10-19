import { NextRequest } from "next/server";
import { handler, json, ApiError } from "@/lib/api";
import { getDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SOCIETY_CATEGORIES, type Society, type SocietyMember } from "@/lib/types";
import { coerceUniversityId } from "@/lib/universities";
import { oneOf } from "@/lib/validation";

/** GET /api/societies?college=&category=&q=&joined=true */
export const GET = handler(async (req: NextRequest) => {
  const url = new URL(req.url);

  const rawCollege = (url.searchParams.get("college") ?? "").trim();
  const college = rawCollege ? coerceUniversityId(rawCollege) : null;
  if (rawCollege && !college) throw new ApiError(400, "Please choose a valid college.");

  const rawCategory = (url.searchParams.get("category") ?? "").trim();
  const category = rawCategory
    ? oneOf(rawCategory, SOCIETY_CATEGORIES, "category")
    : null;

  const rawQuery = (url.searchParams.get("q") ?? "").trim();
  const searchTerms = tokenize(rawQuery);
  const joinedOnly = url.searchParams.get("joined") === "true";

  const viewer = await getCurrentUser();
  const db = getDB();
  let list = db.societies as Society[];

  if (joinedOnly) {
    const joinedIds = new Set(
      (db.societyMembers as SocietyMember[])
        .filter((m) => m.userId === viewer?.id)
        .map((m) => m.societyId),
    );
    list = list.filter((s) => joinedIds.has(s.id));
  }

  if (college) list = list.filter((s) => s.collegeId === college);
  if (category) list = list.filter((s) => s.category === category);
  if (searchTerms.length > 0) {
    list = list.filter((s) => matchesSearch(s, searchTerms));
  }

  list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const joinedSet = new Set(
    (db.societyMembers as SocietyMember[])
      .filter((m) => m.userId === viewer?.id)
      .map((m) => m.societyId),
  );

  const societies = list.map((society) => ({
    ...society,
    joined: joinedSet.has(society.id),
  }));

  return json({ societies, total: societies.length });
});

/**
 * Splits free text into lowercase word tokens, keeping hyphens so compound
 * words such as "non-technical" stay a single token. Searching "technical"
 * therefore matches "Technical Societies" but not every "Non-Technical" one.
 */
function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Every search term must prefix-match at least one token of the society's
 * indexed fields (name, category, descriptions, tags and lists).
 */
function matchesSearch(society: Society, terms: string[]): boolean {
  const haystack = tokenize(
    [
      society.name,
      society.category,
      society.shortDescription,
      society.fullDescription,
      society.mission,
      society.tagline ?? "",
      ...society.areasOfInterest,
      ...society.activities,
      ...society.achievements,
    ].join(" "),
  );
  return terms.every((term) => haystack.some((token) => token.startsWith(term)));
}