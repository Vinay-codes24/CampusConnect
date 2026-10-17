import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Database } from "./types";
import { buildSeedData } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const GLOBAL_KEY = "__campusconnect_db__";

type GlobalWithDB = typeof globalThis & { [GLOBAL_KEY]?: Database };

function loadFromDisk(): Database | null {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || !Array.isArray(parsed.users)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(db: Database): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  // Atomic replace so a crash mid-write never corrupts the database.
  fs.renameSync(tmp, DB_PATH);
}

/**
 * Returns the process-wide database instance, lazily creating it from the
 * demo seed the first time it is requested.
 */
export function getDB(): Database {
  const g = globalThis as GlobalWithDB;
  if (g[GLOBAL_KEY]) return g[GLOBAL_KEY] as Database;
  const fromDisk = loadFromDisk();
  const db = fromDisk ?? buildSeedData();
  if (ensureCollections(db)) persist(db);
  else if (!fromDisk) persist(db);
  g[GLOBAL_KEY] = db;
  return db;
}

/**
 * Fills collections that were added after a database file was written, so an
 * older `data/db.json` still boots with full demo data. Returns true when
 * anything was patched.
 */
function ensureCollections(db: Database): boolean {
  const seed = buildSeedData();
  let patched = false;

  const required: Array<keyof Database> = [
    "users",
    "sessions",
    "resets",
    "communities",
    "communityMembers",
    "posts",
    "comments",
    "votes",
    "reports",
    "events",
    "societies",
    "societyMembers",
    "registrations",
    "notifications",
    "reads",
    "attendance",
    "timetables",
    "materials",
    "exams",
    "syllabus",
    "scholarships",
  ];

  for (const key of required) {
    if (!Array.isArray(db[key])) {
      (db as unknown as Record<string, unknown>)[key] = Array.isArray(seed[key])
        ? (seed[key] as unknown[])
        : [];
      patched = true;
    }
  }

  // A database written before communities existed gets the seeded ones.
  if (db.communities.length === 0 && seed.communities.length > 0) {
    db.communities = seed.communities;
    patched = true;
  }
  return patched;
}

/** Runs a mutation and flushes it to disk. */
export function mutate<T>(fn: (db: Database) => T): T {
  const db = getDB();
  const result = fn(db);
  persist(db);
  return result;
}

/** Flushes the in-memory database to disk without changing it. */
export function flush(): void {
  persist(getDB());
}

/** Drops all data and re-creates the demo seed (admin/test utility). */
export function resetDB(): Database {
  const g = globalThis as GlobalWithDB;
  const db = buildSeedData();
  g[GLOBAL_KEY] = db;
  persist(db);
  return db;
}

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function nowPlus(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}
