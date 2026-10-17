import { handler, json } from "@/lib/api";
import { getDB } from "@/lib/db";
import { COLLEGE_COMMUNITIES } from "@/lib/colleges";
import type { UniversityId } from "@/lib/universities";

/**
 * GET /api/colleges — live post counts for the four college communities.
 * Community metadata (names, descriptions, colours) is static and lives in
 * src/lib/colleges.ts; the community headers merge these counts into it.
 */
export const GET = handler(async () => {
  const db = getDB();
  const visible = db.posts.filter((p) => !p.removed);
  const counts = Object.fromEntries(COLLEGE_COMMUNITIES.map((c) => [c.id, 0])) as Record<UniversityId, number>;
  for (const post of visible) {
    if (post.college && counts[post.college] != null) counts[post.college]++;
  }
  return json({ counts, total: visible.length });
});
