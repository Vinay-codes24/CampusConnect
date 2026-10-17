import { handler, json } from "@/lib/api";
import { getDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type CommunityView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  members: number;
  icon: string;
  tone: string;
  postCount: number;
  joined: boolean;
};

/**
 * GET /api/communities — every campus community with live membership and the
 * viewer's join state. Works signed-out (joined is then false).
 */
export const GET = handler(async () => {
  const viewer = await getCurrentUser();
  const db = getDB();

  const postCounts = new Map<string, number>();
  for (const post of db.posts) {
    if (!post.removed && post.communityId) postCounts.set(post.communityId, (postCounts.get(post.communityId) ?? 0) + 1);
  }
  const joinedIds = new Set(db.communityMembers.filter((m) => m.userId === viewer?.id).map((m) => m.communityId));
  const communities: CommunityView[] = db.communities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    members: c.members,
    icon: c.icon,
    tone: c.tone,
    postCount: postCounts.get(c.id) ?? 0,
    joined: !!viewer && joinedIds.has(c.id),
  }));

  return json({ communities });
});
