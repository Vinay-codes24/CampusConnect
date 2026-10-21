import crypto from "node:crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

/** Salted scrypt password hashing (no external dependencies). */
export function hashPassword(phrase: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(phrase, salt, 64, SCRYPT_PARAMS).toString("hex");
  return { salt, hash };
}

export function verifyPassword(phrase: string, salt: string, hash: string): boolean {
  const candidate = crypto.scryptSync(phrase, salt, 64, SCRYPT_PARAMS);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
