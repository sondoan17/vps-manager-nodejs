import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// ── Constants ──────────────────────────────────────────────────────────

/** Minimum password length. */
export const MIN_PASSWORD_LENGTH = 12;
/** Maximum password length. */
export const MAX_PASSWORD_LENGTH = 256;
/** Default scrypt parameters. */
export const SCRYPT_N = 16_384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 64;
const ALGORITHM = "scrypt";

// ── Format ─────────────────────────────────────────────────────────────
// Stored format: scrypt:$N:$r:$p:$salt_base64url:$hash_base64url
// This is self-describing so parameters can change across versions.

function encode(value: number): string {
  return value.toString(16);
}

function decode(value: string): number {
  return Number.parseInt(value, 16);
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

/**
 * Hash a password using scrypt with a random salt.
 * Returns the self-describing encoded string for storage.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, HASH_BYTES, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return [
    ALGORITHM,
    encode(SCRYPT_N),
    encode(SCRYPT_R),
    encode(SCRYPT_P),
    toBase64Url(salt),
    toBase64Url(hash),
  ].join("$");
}

/**
 * Verify a password against a stored hash string.
 * Timing-safe comparison.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  if (parts[0] !== ALGORITHM) return false;

  const N = decode(parts[1]);
  const r = decode(parts[2]);
  const p = decode(parts[3]);
  const salt = fromBase64Url(parts[4]);
  const expectedHash = fromBase64Url(parts[5]);

  const actualHash = scryptSync(password, salt, expectedHash.length, { N, r, p });

  if (actualHash.length !== expectedHash.length) return false;
  return timingSafeEqual(actualHash, expectedHash);
}

/**
 * Validate password meets length constraints.
 * Returns null if valid, or an error message string if invalid.
 */
export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length === 0) {
    return "Password is required";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
}
