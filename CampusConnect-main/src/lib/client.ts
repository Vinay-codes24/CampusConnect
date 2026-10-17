"use client";

/**
 * Client-side helpers for talking to the CampusConnect API.
 * Every call returns parsed JSON and throws an Error with a human-readable
 * message when the server responds with a non-2xx status.
 */

export type ApiUser = {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: "student" | "faculty" | "organizer" | "admin";
  avatar: string | null;
  department: string | null;
  year: string | null;
  interests: string[];
  bio: string;
  verified: boolean;
  createdAt: string;
  notificationPrefs: { replies: boolean; postInteractions: boolean; eventReminders: boolean; academic: boolean };
  university?: string | null;
};

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Formats a "YYYY-MM-DD" date using the viewer's local calendar (no UTC shift). */
export function formatDay(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "09:30" → "9:30 AM" (exam/timetable times are plain 24h strings). */
export function formatClock(hhmm: string): string {
  const parts = hhmm.split(":");
  const h = Number.parseInt(parts[0] ?? "0", 10);
  const m = Number.parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h)) return hhmm;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(Number.isNaN(m) ? 0 : m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Parses "YYYY-MM-DD" as a local date (avoids the UTC off-by-one). */
export function parseDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** Whole days from today until the given date (negative = in the past). */
export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function countdownLabel(iso: string, now = new Date()): { days: number; label: string; past: boolean } {
  const days = daysUntil(iso, now);
  if (days > 1) return { days, label: `in ${days} days`, past: false };
  if (days === 1) return { days, label: "tomorrow", past: false };
  if (days === 0) return { days, label: "today", past: false };
  if (days === -1) return { days, label: "yesterday", past: true };
  return { days, label: `${Math.abs(days)} days ago`, past: true };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
