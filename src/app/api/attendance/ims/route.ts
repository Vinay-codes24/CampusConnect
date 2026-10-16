import { NextRequest } from "next/server";
import { handler, json, ApiError, readBody, badRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  createIMSSession,
  refreshIMSCaptcha,
  loginWithIMS,
  deleteIMSSession,
} from "@/lib/ims";

/**
 * /api/attendance/ims — native NSUT IMS login panel backend.
 *
 * GET    → open a fresh IMS session and return its genuine CAPTCHA (data URI)
 * POST   → { action: "refresh" | "login" | "cancel", ... }
 *
 * Security:
 *   - Requires an authenticated CampusConnect student session.
 *   - The IMS PHP session cookie never leaves this server process.
 *   - IMS passwords / CAPTCHA answers are forwarded once to the official
 *     https://imsnsit.org login endpoint and never stored or logged.
 *   - Sessions are in-memory only, expire in 10 minutes, and are deleted on
 *     cancel or after being consumed by the attendance sync.
 */

const MAX_UID = 50;
const MAX_PWD = 100;
const MAX_CAP = 20;

async function requireStudent() {
  const me = await requireUser();
  if (me.role !== "student") {
    throw new ApiError(403, "Only student accounts can connect to NSUT IMS.");
  }
  return me;
}

export const GET = handler(async () => {
  await requireStudent();
  const { token, captchaImage } = await createIMSSession();
  return json({ token, captchaImage });
});

export const POST = handler(async (req: NextRequest) => {
  await requireStudent();
  const body = await readBody<{
    action?: string;
    token?: string;
    uid?: string;
    pwd?: string;
    cap?: string;
  }>(req);

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) badRequest("Missing IMS connection token. Please start a new connection.");

  if (body.action === "refresh") {
    return json(await refreshIMSCaptcha(token));
  }

  if (body.action === "cancel") {
    deleteIMSSession(token);
    return json({ ok: true });
  }

  if (body.action === "login") {
    const uid = (body.uid ?? "").trim();
    const pwd = body.pwd ?? "";
    const cap = (body.cap ?? "").trim();

    if (!uid || !pwd || !cap) {
      badRequest("Enter your IMS username, password and the CAPTCHA text.");
    }
    if (uid.length > MAX_UID || pwd.length > MAX_PWD || cap.length > MAX_CAP) {
      badRequest("One of the IMS login fields exceeds the allowed length.");
    }

    return json(await loginWithIMS(token, uid, pwd, cap));
  }

  throw new ApiError(400, "Unknown IMS action.");
});
