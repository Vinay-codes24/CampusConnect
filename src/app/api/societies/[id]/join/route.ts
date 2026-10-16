import { handler, json, ApiError } from "@/lib/api";
import { mutate, uid, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { type SocietyMember } from "@/lib/types";

export const POST = handler(async (_req, ctx) => {
  const viewer = await requireUser();
  const { id } = await ctx.params;

  const result = mutate((db) => {
    const society = (db.societies as { id: string }[]).find((item) => item.id === id);
    if (!society) throw new ApiError(404, "That society does not exist.");

    const existing = (db.societyMembers as SocietyMember[]).find(
      (m) => m.userId === viewer.id && m.societyId === id,
    );

    if (existing) {
      db.societyMembers = (db.societyMembers as SocietyMember[]).filter((m) => m !== existing);
      return { id, joined: false };
    }

    (db.societyMembers as SocietyMember[]).push({
      id: uid(),
      userId: viewer.id,
      societyId: id,
      joinedAt: now(),
    });
    return { id, joined: true };
  });

  return json(result);
});