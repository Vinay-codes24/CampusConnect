import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, nowPlus } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { email as validateEmail, password as validatePassword, str } from "@/lib/validation";

/**
 * Two-step password reset.
 *
 * Step 1: POST { email }          -> creates a single-use token (returned here
 *                                     because no mail service is configured in
 *                                     demo mode — it would be emailed instead).
 * Step 2: POST { email, token, password } -> sets the new password.
 */
export const POST = handler(async (req: NextRequest) => {
  const body = await readBody(req);
  const email = validateEmail(body.email);

  if (!body.token) {
    mutate((db) => {
      const exists = db.users.some((u) => u.email.toLowerCase() === email);
      if (!exists) return;
      db.resets = db.resets.filter((r) => r.email !== email);
      db.resets.push({
        email,
        token: crypto.randomBytes(16).toString("hex"),
        expiresAt: nowPlus(30 * 60 * 1000),
        used: false,
      });
    });
    // Always report success so the endpoint cannot be used to probe accounts.
    return json({
      ok: true,
      demo: true,
      message: "If that account exists, a reset code has been created. In demo mode the code is shown below.",
      token: getResetToken(email),
    });
  }

  const token = str(body.token, { field: "Reset code", min: 8, max: 64 }).toLowerCase();
  const pass = validatePassword(body.password);

  mutate((db) => {
    const record = db.resets.find((r) => r.email === email && r.token === token && !r.used);
    if (!record || record.expiresAt <= now()) {
      throw new ApiError(400, "That reset code is invalid or has expired.");
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) throw new ApiError(400, "That reset code is invalid or has expired.");
    const { salt, hash } = hashPassword(pass);
    user.salt = salt;
    user.passwordHash = hash;
    record.used = true;
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
  });

  return json({ ok: true, message: "Password updated. You can now sign in." });
});

function getResetToken(email: string): string | null {
  const db = getDB();
  return db.resets.find((r) => r.email === email && !r.used)?.token ?? null;
}
