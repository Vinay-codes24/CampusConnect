import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { createSession, setSessionCookie, publicUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { email as validateEmail, password as validatePassword, str } from "@/lib/validation";

export const POST = handler(async (req: NextRequest) => {
  const body = await readBody(req);
  const email = validateEmail(body.email);
  const pass = validatePassword(body.password);
  const name = str(body.name, { field: "Full name", min: 2, max: 60 });
  const username = str(body.username, { field: "Username", min: 3, max: 24 })
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const department = typeof body.department === "string" ? body.department.slice(0, 80) : "";
  const year = typeof body.year === "string" ? body.year.slice(0, 20) : "";

  const db = getDB();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw new ApiError(409, "An account with that college email already exists.");
  }
  if (db.users.some((u) => u.username.toLowerCase() === username)) {
    throw new ApiError(409, "That username is taken. Please pick another.");
  }

  const { salt, hash } = hashPassword(pass);

  const created = mutate((d) => {
    const user = {
      id: uid(),
      email,
      passwordHash: hash,
      salt,
      name,
      username,
      role: "student" as const,
      avatar: null,
      department: department || null,
      year: year || null,
      interests: [],
      bio: "",
      // College-email verification is simulated in demo mode: accounts created
      // with a *.edu / *.ac.* style address are auto-verified.
      verified: /(\.edu(\.|$))|(\.ac\.[a-z]{2,}$)/i.test(email),
      createdAt: now(),
      notificationPrefs: { replies: true, postInteractions: true, eventReminders: true, academic: true },
    };
    d.users.push(user);
    d.notifications.push({
      id: uid(),
      userId: user.id,
      type: "system",
      title: "Welcome to CampusConnect",
      body: "Your account is ready. Complete your profile so classmates can find you.",
      link: "/profile",
      important: false,
      createdAt: now(),
    });
    return user;
  });

  const token = createSession(created.id);
  await setSessionCookie(token);
  return json({ user: publicUser(created) }, 201);
});
