import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDB, mutate, now, nowPlus } from "./db";
import type { Role, User } from "./types";
import { ApiError } from "./api";
import { hashPassword, sha256, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

const SESSION_COOKIE = "cc_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return sha256(token);
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  mutate((db) => {
    // Drop expired sessions while we are here.
    db.sessions = db.sessions.filter((s) => s.expiresAt > now());
    db.sessions.push({
      tokenHash: hashToken(token),
      userId,
      createdAt: now(),
      expiresAt: nowPlus(SESSION_DAYS * 24 * 60 * 60 * 1000),
    });
  });
  return token;
}

export function destroySession(token: string): void {
  mutate((db) => {
    db.sessions = db.sessions.filter((s) => s.tokenHash !== hashToken(token));
  });
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_INSECURE_COOKIE !== "1",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/** Resolves the signed-in user for the current request, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const db = getDB();
  const session = db.sessions.find((s) => s.tokenHash === hashToken(token));
  if (!session || session.expiresAt <= now()) return null;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;
  return user;
}

/** Throws 401 when nobody is signed in. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "You need to sign in to do that.");
  return user;
}

const STAFF_ROLES: Role[] = ["faculty", "organizer", "admin"];

export function isStaff(user: User): boolean {
  return STAFF_ROLES.includes(user.role);
}

export function canManageContent(user: User): boolean {
  return user.role === "faculty" || user.role === "admin";
}

/** Throws 401/403 unless the signed-in user holds one of the given roles. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission to do that.");
  }
  return user;
}

/**
 * Safe projection of a user record — never includes credentials.
 * Use `stripPrivateFields` when returning *other* people's profiles.
 */
export function publicUser(user: User): Omit<User, "passwordHash" | "salt"> {
  const { passwordHash: _ph, salt: _s, ...rest } = user;
  return rest;
}

/** Strips credentials and the college email from someone else's profile. */
export function stripPrivateFields(user: User): Omit<User, "passwordHash" | "salt" | "email"> {
  const { passwordHash: _ph, salt: _s, email: _e, ...rest } = user;
  return rest;
}
