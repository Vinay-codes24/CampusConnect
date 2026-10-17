import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB } from "@/lib/db";
import { getCurrentUser, publicUser, requireUser } from "@/lib/auth";
import { DEPARTMENTS, YEARS } from "@/lib/types";
import { coerceUniversityId } from "@/lib/universities";
import { optional, strings, str } from "@/lib/validation";

export const GET = handler(async () => {
  const user = await getCurrentUser();
  return json({ user: user ? publicUser(user) : null });
});

/** PATCH /api/auth/me — update the signed-in student's own profile. */
export const PATCH = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = await readBody(req);

  const name = optional(body.name, 60) || me.name;
  if (name.trim().length < 2) throw new ApiError(400, "Please enter your full name.");

  const department = optional(body.department, 80);
  const year = optional(body.year, 24);
  if (department && !DEPARTMENTS.includes(department as never)) {
    throw new ApiError(400, "Please choose a listed department.");
  }
  if (year && !YEARS.includes(year as never)) {
    throw new ApiError(400, "Please choose a listed year of study.");
  }

  const username = (optional(body.username, 24) || me.username)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (username.length < 3) throw new ApiError(400, "Username must be at least 3 characters.");

  const db = getDB();
  if (db.users.some((u) => u.id !== me.id && u.username.toLowerCase() === username)) {
    throw new ApiError(409, "That username is taken.");
  }

  const updated = db.users.find((u) => u.id === me.id)!;
  updated.name = str(name, { field: "Full name", min: 2, max: 60 });
  updated.username = username;
  updated.department = department || null;
  updated.year = year || null;
  updated.bio = optional(body.bio, 400);
  updated.interests = strings(body.interests, 8);
  if (body.university !== undefined) {
    if (body.university === null || body.university === "") {
      updated.university = null;
    } else {
      const validated = coerceUniversityId(body.university);
      if (!validated) throw new ApiError(400, "Invalid university identifier.");
      updated.university = validated;
    }
  }
  if (typeof body.avatar === "string") updated.avatar = body.avatar.slice(0, 4096) || null;

  return json({ user: publicUser(updated) });
});
