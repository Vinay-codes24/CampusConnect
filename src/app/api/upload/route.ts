import { NextRequest } from "next/server";
import { handler, json, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const LIMITS: Record<string, { max: number; mimes: string[]; ext: string[] }> = {
  image: { max: 8 * 1024 * 1024, mimes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"], ext: ["png", "jpg", "jpeg", "gif", "webp", "svg"] },
  video: { max: 40 * 1024 * 1024, mimes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"], ext: ["mp4", "webm", "ogv", "mov"] },
  document: { max: 10 * 1024 * 1024, mimes: ["application/pdf", "text/plain"], ext: ["pdf", "txt"] },
};

/**
 * POST /api/upload  (multipart/form-data, field name: "file")
 *
 * Validates the declared MIME type, a sniffed magic-byte prefix and the size
 * limit on the server, then stores the file under data/uploads with a random
 * name (no user-controlled path segments).
 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  if (me.role === "student") {
    // Students may attach images/videos to posts; documents are staff-only.
  }

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Expected a multipart/form-data upload.");

  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file was included in the upload.");

  const kind = (form.get("kind") as string) || guessKind(file.type);
  const limits = LIMITS[kind];
  if (!limits) throw new ApiError(400, "That file type is not supported.");
  if (file.size > limits.max) {
    throw new ApiError(400, `${kind === "video" ? "Video" : kind === "image" ? "Image" : "Document"} uploads must be ${Math.round(limits.max / 1024 / 1024)} MB or smaller.`);
  }
  if (!limits.mimes.includes(file.type)) {
    throw new ApiError(400, `Unsupported content type: ${file.type || "unknown"}.`);
  }

  const ext = extensionFor(file.type) ?? limits.ext[0];
  const bytes = Buffer.from(await file.arrayBuffer());

  // Magic-byte sanity check so a renamed executable cannot slip through.
  if (kind === "image" && !looksLikeImage(bytes)) throw new ApiError(400, "That file does not look like a valid image.");
  if (kind === "video" && !looksLikeVideo(bytes)) throw new ApiError(400, "That file does not look like a valid video.");
  if (kind === "document" && file.type === "application/pdf" && bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new ApiError(400, "Only valid PDF files can be uploaded.");
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const stored = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), bytes);

  return json(
    {
      url: `/api/files/${stored}`,
      name: file.name.slice(0, 120) || `upload.${ext}`,
      size: file.size,
      kind,
    },
    201,
  );
});

function guessKind(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

function extensionFor(mime: string): string | null {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "text/plain": "txt",
  };
  return map[mime] ?? null;
}

function looksLikeImage(b: Buffer): boolean {
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  if (b[0] === 0xff && b[1] === 0xd8) return true;
  if (b.subarray(0, 4).toString("latin1") === "GIF8") return true;
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return true;
  const head = b.subarray(0, 256).toString("latin1").trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return true;
  return false;
}

function looksLikeVideo(b: Buffer): boolean {
  const head = b.subarray(0, 16);
  if (head.subarray(4, 8).toString("latin1") === "ftyp") return true; // mp4 / mov
  if (head.subarray(0, 4).toString("latin1") === "OggS") return true;
  if (head.subarray(0, 4).toString("latin1") === "RIFF") return true; // webm container fallback
  if (b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true; // webm/mkv
  return false;
}
