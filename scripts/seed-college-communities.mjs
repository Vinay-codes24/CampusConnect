// Appends the four college community rows (cm-dtu, cm-igdtuw, cm-nsut,
// cm-iiitd) to the live demo database without touching any existing row.
// Idempotent: communities that already exist (by id) are skipped, so
// re-running never duplicates or resets data.
//
// Run with the dev/production server STOPPED — the server persists its
// in-memory copy of data/db.json on every mutation and would overwrite this.
//
//   node scripts/seed-college-communities.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Mirrors the four college communities in src/lib/seed.ts (fresh installs). */
const COMMUNITIES = [
  {
    id: "cm-dtu",
    name: "Delhi Technological University",
    slug: "DTU",
    description: "The DTU campus community.",
    members: 3240,
    icon: "graduation",
    tone: "brand",
  },
  {
    id: "cm-igdtuw",
    name: "Indira Gandhi Delhi Technical University for Women",
    slug: "IGDTUW",
    description: "The IGDTUW campus community.",
    members: 1930,
    icon: "graduation",
    tone: "rose",
  },
  {
    id: "cm-nsut",
    name: "Netaji Subhas University of Technology",
    slug: "NSUT",
    description: "The NSUT campus community.",
    members: 2860,
    icon: "graduation",
    tone: "accent",
  },
  {
    id: "cm-iiitd",
    name: "Indraprastha Institute of Information Technology Delhi",
    slug: "IIIT-DELHI",
    description: "The IIIT-Delhi campus community.",
    members: 1410,
    icon: "graduation",
    tone: "violet",
  },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(here, "..", "data", "db.json");

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
if (!Array.isArray(db.communities)) {
  console.error("data/db.json has no communities array — aborting.");
  process.exit(1);
}

const existing = new Set(db.communities.map((c) => c.id));
const missing = COMMUNITIES.filter((c) => !existing.has(c.id));
db.communities.push(...missing);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
console.log(
  `seed-college-communities: ${missing.length} added, ${COMMUNITIES.length - missing.length} already present (total communities: ${db.communities.length})`,
);
