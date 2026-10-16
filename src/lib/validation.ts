import { ApiError } from "./api";

/**
 * Small, dependency-free input validation used by both client forms and the
 * API routes. Every helper throws ApiError(400) with a user-facing message.
 */

export function str(
  value: unknown,
  opts: { field?: string; min?: number; max?: number; required?: boolean } = {},
): string {
  const field = opts.field ?? "This field";
  const raw = typeof value === "string" ? value.trim() : value == null ? "" : String(value);
  if (!raw) {
    if (opts.required === false) return "";
    throw new ApiError(400, `${field} is required.`);
  }
  if (opts.min != null && raw.length < opts.min) {
    throw new ApiError(400, `${field} must be at least ${opts.min} characters.`);
  }
  if (opts.max != null && raw.length > opts.max) {
    throw new ApiError(400, `${field} must be ${opts.max} characters or fewer.`);
  }
  return raw;
}

export function optional(value: unknown, max = 2000): string {
  if (value == null) return "";
  const raw = typeof value === "string" ? value.trim() : String(value);
  if (raw.length > max) throw new ApiError(400, `Text must be ${max} characters or fewer.`);
  return raw;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const raw = typeof value === "string" ? (value as T) : ("" as T);
  if (!allowed.includes(raw)) {
    throw new ApiError(400, `Please choose a valid ${field.toLowerCase()}.`);
  }
  return raw;
}

export function email(value: unknown): string {
  const raw = str(value, { field: "Email", max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(raw)) {
    throw new ApiError(400, "Please enter a valid email address.");
  }
  return raw;
}

export function password(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  if (raw.length < 8) throw new ApiError(400, "Password must be at least 8 characters.");
  if (raw.length > 128) throw new ApiError(400, "Password must be 128 characters or fewer.");
  if (!/[a-zA-Z]/.test(raw) || !/[0-9]/.test(raw)) {
    throw new ApiError(400, "Password must contain both letters and numbers.");
  }
  return raw;
}

export function bool(value: unknown): boolean {
  return value === true || value === "true";
}

export function int(value: unknown, opts: { min?: number; max?: number; fallback?: number } = {}): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) {
    if (opts.fallback != null) return opts.fallback;
    throw new ApiError(400, "Please enter a valid number.");
  }
  if (opts.min != null && n < opts.min) throw new ApiError(400, `Value must be at least ${opts.min}.`);
  if (opts.max != null && n > opts.max) throw new ApiError(400, `Value must be at most ${opts.max}.`);
  return n;
}

export function isoDate(value: unknown, field: string): string {
  const raw = str(value, { field });
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${field} must be a valid date.`);
  return d.toISOString();
}

export function strings(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}
