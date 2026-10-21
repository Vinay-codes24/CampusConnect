import fs from "node:fs";
import path from "node:path";

/**
 * Generates the demo SVG artwork used by seeded posts and events.
 * Run: node scripts/make-samples.mjs
 *
 * In production these would be real banners uploaded by clubs through
 * POST /api/upload.
 */

const OUT = path.join(process.cwd(), "public", "samples");
fs.mkdirSync(OUT, { recursive: true });

const palettes = [
  ["#4f46e5", "#0d9488"],
  ["#7c3aed", "#2563eb"],
  ["#0f766e", "#4f46e5"],
  ["#db2777", "#7c3aed"],
  ["#0369a1", "#0d9488"],
  ["#b45309", "#db2777"],
  ["#4338ca", "#0891b2"],
  ["#166534", "#0d9488"],
  ["#9f1239", "#4f46e5"],
];

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrap(text, max) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function banner({ title, kicker, detail, palette, w = 1200, h = 630 }) {
  const [c1, c2] = palette;
  const kick = esc(kicker ?? "");
  const detailLines = wrap(detail ?? "", 46).slice(0, 3);
  const titleLines = wrap(title, 26).slice(0, 3);

  const titleNodes = titleLines
    .map((l, i) => `<text x="80" y="${330 + i * 74}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="66" font-weight="800" fill="#ffffff">${esc(l)}</text>`)
    .join("\n  ");
  const detailNodes = detailLines
    .map((l, i) => `<text x="80" y="${360 + titleLines.length * 74 + i * 34}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="27" font-weight="500" fill="rgba(255,255,255,0.85)">${esc(l)}</text>`)
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <circle cx="1080" cy="540" r="190" fill="rgba(255,255,255,0.10)"/>
  <circle cx="960" cy="120" r="90" fill="rgba(255,255,255,0.12)"/>
  <circle cx="180" cy="560" r="140" fill="rgba(0,0,0,0.10)"/>
  ${kick ? `<rect x="80" y="150" rx="999" ry="999" width="${Math.max(150, kick.length * 16 + 44)}" height="52" fill="rgba(255,255,255,0.20)"/>
  <text x="${80 + (Math.max(150, kick.length * 16 + 44) / 2)}" y="184" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="#ffffff">${kick.toUpperCase()}</text>` : ""}
  ${titleNodes}
  ${detailNodes}
</svg>
`;
}

function meme({ top, bottom, palette, id }) {
  const [c1, c2] = palette;
  const topLines = wrap(top, 24).slice(0, 2);
  const bottomLines = wrap(bottom, 24).slice(0, 2);
  const topNodes = topLines
    .map((l, i) => `<text x="600" y="${90 + i * 74}" text-anchor="middle" font-family="Impact, Segoe UI, Arial Black, sans-serif" font-size="68" font-weight="900" fill="#ffffff" stroke="#000000" stroke-width="7" paint-order="stroke">${esc(l)}</text>`)
    .join("\n  ");
  const bottomNodes = bottomLines
    .map((l, i) => `<text x="600" y="${560 + i * 74}" text-anchor="middle" font-family="Impact, Segoe UI, Arial Black, sans-serif" font-size="68" font-weight="900" fill="#ffffff" stroke="#000000" stroke-width="7" paint-order="stroke">${esc(l)}</text>`)
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700" role="img" aria-label="${esc(top)} ${esc(bottom)}">
  <defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#g${id})"/>
  <rect width="1200" height="700" fill="rgba(255,255,255,0.06)"/>
  <circle cx="600" cy="350" r="150" fill="rgba(255,255,255,0.12)"/>
  <rect x="470" y="270" width="260" height="160" rx="24" fill="rgba(255,255,255,0.20)"/>
  <rect x="505" y="305" width="190" height="24" rx="12" fill="rgba(255,255,255,0.55)"/>
  <rect x="505" y="345" width="140" height="24" rx="12" fill="rgba(255,255,255,0.45)"/>
  <rect x="505" y="385" width="170" height="24" rx="12" fill="rgba(255,255,255,0.35)"/>
  ${topNodes}
  ${bottomNodes}
</svg>
`;
}

const files = {
  "hackfest.svg": banner({
    title: "HackFest 2026",
    kicker: "36 hour national hackathon",
    detail: "₹2L prize pool · 120 seats · mentors on floor all night",
    palette: palettes[0],
  }),
  "workshop.svg": banner({
    title: "Git & GitHub for Beginners",
    kicker: "hands-on workshop",
    detail: "Branching, pull requests and your first merged PR",
    palette: palettes[2],
  }),
  "placement.svg": banner({
    title: "Campus Placements 101",
    kicker: "resume clinic",
    detail: "Alumni from five companies review resumes on the spot",
    palette: palettes[6],
  }),
  "spandan.svg": banner({
    title: "Spandan — Annual Cultural Fest",
    kicker: "three days of music, dance & drama",
    detail: "Battle of bands · street play · fashion walk · short film",
    palette: palettes[3],
  }),
  "cricket.svg": banner({
    title: "Inter-Batch Cricket Cup",
    kicker: "finals",
    detail: "Eight batches, one trophy. Main Ground, hostel side.",
    palette: palettes[4],
  }),
  "lecture.svg": banner({
    title: "Debugging Distributed Systems",
    kicker: "guest lecture",
    detail: "Three real production incidents, dissected live",
    palette: palettes[1],
  }),
  "blood.svg": banner({
    title: "Blood Donation Camp",
    kicker: "rotaract club",
    detail: "With the district hospital blood centre · health centre",
    palette: palettes[5],
  }),
  "robotics.svg": banner({
    title: "Robotics League",
    kicker: "line follower challenge",
    detail: "Timed qualifiers in the morning, knockouts after lunch",
    palette: palettes[7],
  }),
  "alumni.svg": banner({
    title: "Life After the First Job",
    kicker: "alumni talk",
    detail: "Four alumni, four very different paths, zero sugarcoating",
    palette: palettes[8],
  }),
  "dsa-sheet.svg": banner({
    title: "DSA Revision Sheet",
    kicker: "printable · 7 pages",
    detail: "Complexity cheat codes, graph templates and 20 recurring patterns",
    palette: palettes[6],
  }),
  "meme-lab.svg": meme({
    id: "a",
    top: "Lab assistant: just restart the PCB",
    bottom: "Multimeter: 0V and 4V at the same time",
    palette: palettes[5],
  }),
  "meme-night.svg": meme({
    id: "b",
    top: "3 AM in the AC gallery",
    bottom: "with cold coffee and half an assignment",
    palette: palettes[1],
  }),
};

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), svg, "utf8");
}
console.log(`wrote ${Object.keys(files).length} SVGs to public/samples`);
