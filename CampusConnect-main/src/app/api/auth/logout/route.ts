import { NextRequest } from "next/server";
import { handler, json } from "@/lib/api";
import { destroySession, getSessionToken, clearSessionCookie } from "@/lib/auth";

export const POST = handler(async (_req: NextRequest) => {
  const token = await getSessionToken();
  if (token) destroySession(token);
  await clearSessionCookie();
  return json({ ok: true });
});
