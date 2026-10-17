import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB } from "@/lib/db";
import { createSession, setSessionCookie, publicUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { email as validateEmail, str } from "@/lib/validation";

export const POST = handler(async (req: NextRequest) => {
  const body = await readBody(req);
  const email = validateEmail(body.email);
  const pass = str(body.password, { field: "Password" });

  const db = getDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !verifyPassword(pass, user.salt, user.passwordHash)) {
    throw new ApiError(401, "Incorrect email or password.");
  }

  const token = createSession(user.id);
  await setSessionCookie(token);
  return json({ user: publicUser(user) });
});
