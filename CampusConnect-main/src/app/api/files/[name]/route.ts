import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { handler, ApiError, type RouteContext } from "@/lib/api";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const SAFE_NAME = /^[a-f0-9]{32}\.[a-z0-9]{2,5}$/;

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
};

/**
 * GET /api/files/[name] — serves an uploaded file.
 * The name is validated against the exact pattern produced by /api/upload, so
 * no user input can escape the upload directory.
 */
export const GET = handler(async (req: NextRequest, ctx: RouteContext) => {
  const { name } = await ctx.params;
  if (!SAFE_NAME.test(name)) throw new ApiError(404, "File not found.");

  const full = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(full)) throw new ApiError(404, "File not found.");

  const ext = name.split(".").pop() ?? "";
  const type = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const data = fs.readFileSync(full);
  const download = new URL(req.url).searchParams.get("download") === "1";

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
      // Uploaded SVGs are never executed as documents.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
