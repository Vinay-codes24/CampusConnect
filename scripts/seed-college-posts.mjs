// Appends the college-community seed posts (p-c1..p-c8) to the live demo
// database without touching any existing row. Idempotent: posts that already
// exist (by id) are skipped, so re-running never duplicates or resets data.
//
// Run with the dev/production server STOPPED — the server persists its
// in-memory copy of data/db.json on every mutation and would overwrite this.
//
//   node scripts/seed-college-posts.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const t = Date.now();
const ago = (ms) => new Date(t - ms).toISOString();

/** Mirrors the eight college posts in src/lib/seed.ts (fresh installs). */
const POSTS = [
  {
    id: "p-c1",
    authorId: "u-aarav",
    title: "How do you survive the 8 AM labs after a societies night?",
    body: "Two societies, one early lab batch, and my alarm has become a suggestion. Looking for routines that actually work — sleep early on weekdays and go wild on weekends, or power through on caffeine?",
    category: "Question",
    media: [],
    createdAt: ago(3 * HOUR),
    upvotes: 24,
    downvotes: 1,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "dtu",
    program: "B.Tech",
    yearStatus: "3rd Year",
  },
  {
    id: "p-c2",
    authorId: "u-rohan",
    title: "Robotics Society is hosting an open build evening this Friday",
    body: "Bring anything broken — drones, RC cars, a keyboard that only works when you hit it. We'll have soldering stations, spare parts and someone who can actually fix things. Drop a comment if you're coming so we can size the room.",
    category: "Campus Life",
    media: [],
    createdAt: ago(7 * HOUR),
    upvotes: 41,
    downvotes: 0,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "dtu",
    program: "B.Tech",
    yearStatus: "4th Year",
  },
  {
    id: "p-c3",
    authorId: "u-priya",
    title: "Type-pairing cheatsheet from the design club's last workshop",
    body: "We put together a one-page reference for submissions and slides: 8 pairings that work, 4 that absolutely don't, and a quick contrast-check routine before you export. Ask in the comments and I'll share the file here.",
    category: "Study Resources",
    media: [],
    createdAt: ago(12 * HOUR),
    upvotes: 56,
    downvotes: 1,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "igdtuw",
    program: "B.Tech",
    yearStatus: "2nd Year",
  },
  {
    id: "p-c4",
    authorId: "u-ananya",
    title: "Balancing ECE coursework and two societies — what actually worked",
    body: "Final year now, and the only thing that kept it together was a hard rule: societies get evenings, coursework gets mornings. I also stopped attending every one-off event — missing one isn't the end of the world. What's your system?",
    category: "Discussion",
    media: [],
    createdAt: ago(21 * HOUR),
    upvotes: 33,
    downvotes: 2,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "igdtuw",
    program: "B.Tech",
    yearStatus: "4th Year",
  },
  {
    id: "p-c5",
    authorId: "u-kabir",
    title: "Which canteen do you hit between back-to-back classes?",
    body: "The one nearest the academic block always has a queue by 12:30. Is the one behind the sports block actually faster, or does it just feel that way because nobody's there? Looking for a data-backed answer before mid-sems.",
    category: "Question",
    media: [],
    createdAt: ago(30 * HOUR),
    upvotes: 18,
    downvotes: 0,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "nsut",
    program: "B.Tech",
    yearStatus: "3rd Year",
  },
  {
    id: "p-c6",
    authorId: "u-dev",
    title: "Built a group-study slot finder for our batch — want in?",
    body: "It reads everyone's free slots and suggests times where at least three of us are actually free. Worked for our DBMS group, now generalising it. Comment with your batch size and I'll share how to set it up.",
    category: "Discussion",
    media: [],
    createdAt: ago(44 * HOUR),
    upvotes: 29,
    downvotes: 1,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "nsut",
    program: "B.Tech",
    yearStatus: "2nd Year",
  },
  {
    id: "p-c7",
    authorId: "u-sneha",
    title: "Late-night project lab culture: healthy or overrated?",
    body: "There's something about demo-day eve where the whole lab ends up ordering food at 1 AM and the thing finally compiles. Fun in the moment, brutal the next morning. Where do you draw the line?",
    category: "Campus Life",
    media: [],
    createdAt: ago(4 * DAY),
    upvotes: 47,
    downvotes: 3,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "iiitd",
    program: "B.Tech",
    yearStatus: "3rd Year",
  },
  {
    id: "p-c8",
    authorId: "u-arjun",
    title: "First-year BBA on a tech campus — how do you find your people?",
    body: "Most club fairs lean heavily technical and I felt a bit out of place. Anyone here found communities where a non-tech mix actually works? Open to trying anything that isn't a coding contest.",
    category: "Discussion",
    media: [],
    createdAt: ago(5 * DAY),
    upvotes: 12,
    downvotes: 0,
    commentCount: 0,
    removed: false,
    communityId: null,
    college: "iiitd",
    program: "BBA",
    yearStatus: "1st Year",
  },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(here, "..", "data", "db.json");

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
if (!Array.isArray(db.posts)) {
  console.error("data/db.json has no posts array — aborting.");
  process.exit(1);
}

const existing = new Set(db.posts.map((p) => p.id));
const missing = POSTS.filter((p) => !existing.has(p.id));
db.posts.push(...missing);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
console.log(
  `seed-college-posts: ${missing.length} added, ${POSTS.length - missing.length} already present (total posts: ${db.posts.length})`,
);
