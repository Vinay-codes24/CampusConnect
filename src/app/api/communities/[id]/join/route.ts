import { handler, json, ApiError } from "@/lib/api";
import { mutate, now, uid } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * POST /api/communities/[id]/join — toggles membership. The demo data starts
 * with members, so joining twice leaves and vice versa; both directions
 * persist to `data/db.json`.
 */
export const POST = handler(async (_req, ctx) => {
  const viewer = await requireUser();
  const { id } = await ctx.params;

  const result = mutate((db) => {
    const community = db.communities.find((c) => c.id === id);
    if (!community) throw new ApiError(404, "That community does not exist.");

    const existing = db.communityMembers.find(
      (m) => m.userId === viewer.id && m.communityId === community.id,
    );

    if (existing) {
      db.communityMembers = db.communityMembers.filter((m) => m !== existing);
      community.members = Math.max(1, community.members - 1);
      return { joined: false, members: community.members };
    }

    db.communityMembers.push({
      id: uid(),
      userId: viewer.id,
      communityId: community.id,
      joinedAt: now(),
    });
    community.members += 1;
    return { joined: true, members: community.members };
  });

  return json({ id, ...result });
});
