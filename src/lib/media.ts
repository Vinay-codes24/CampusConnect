import { ApiError } from "./api";
import type { Media } from "./types";

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

/** Validates the attachment list sent by the post composer. */
export function sanitizeMedia(raw: unknown): Media[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new ApiError(400, "Attachments were not in the expected format.");
  if (raw.length > 4) throw new ApiError(400, "A post can include at most 4 attachments.");

  return raw.map((item) => {
    const rec = item as Partial<Media>;
    const kind = rec.kind === "image" || rec.kind === "video" || rec.kind === "file" ? rec.kind : null;
    if (!kind) throw new ApiError(400, "One of your attachments has an unsupported type.");

    const url = typeof rec.url === "string" ? rec.url : "";
    if (!url.startsWith("/api/")) {
      throw new ApiError(400, "Attachments must be uploaded through the platform first.");
    }
    const size = Number(rec.size ?? 0);
    if (kind === "image" && size > MAX_IMAGE) throw new ApiError(400, "Images must be 8 MB or smaller.");
    if (kind === "video" && size > MAX_VIDEO) throw new ApiError(400, "Videos must be 40 MB or smaller.");

    return { kind, url, name: String(rec.name ?? "attachment").slice(0, 120), size };
  });
}
