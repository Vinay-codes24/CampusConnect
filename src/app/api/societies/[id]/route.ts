import { NextRequest } from "next/server";
import { handler, json, ApiError } from "@/lib/api";
import { getDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { type Society, type SocietyMember } from "@/lib/types";

export const GET = handler(async (_req: NextRequest, ctx) => {
  const params = await ctx.params;
  const id = params.id;
  const viewer = await getCurrentUser();
  const db = getDB();
  const society = (db.societies as Society[]).find((s) => s.id === id);
  if (!society) throw new ApiError(404, "That society does not exist.");
  const joined = (db.societyMembers as SocietyMember[]).some(
    (m) => m.userId === viewer?.id && m.societyId === id,
  );
  return json({ society, joined });
});