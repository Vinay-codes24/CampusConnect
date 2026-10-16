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

  const communities: CommunityView[] = db.communities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    members: c.members,
    icon: c.icon,
    tone: c.tone,
    postCount: db.posts.filter((p) => p.communityId === c.id && !p.removed).length,
    joined: !!viewer && db.communityMembers.some((m) => m.userId === viewer.id && m.communityId === c.id),
  }));

  return json({ communities });
});
