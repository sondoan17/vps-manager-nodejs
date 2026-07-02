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
const ID_HASH_BYTES = 64;
const ALGORITHM = "scrypt";

// ── Parameter bounds ───────────────────────────────────────────────────

const N_MIN = 1024;
const N_MAX = 1_048_576; // 2^20 — generous upper bound
const R_MIN = 1;
const R_MAX = 256;
const P_MIN = 1;
const P_MAX = 64;
const SALT_MIN_BYTES = 8;
const SALT_MAX_BYTES = 128;
const HASH_MIN_BYTES = 16;
const HASH_MAX_BYTES = 256;

// ── Format ─────────────────────────────────────────────────────────────
// Stored format: scrypt:$N:$r:$p:$salt_base64url:$hash_base64url
// This is self-describing so parameters can change across versions.

function encode(value: number): string {
  return value.toString(16);
}

function decode(value: string): number {
  return Number.parseInt(value, 16);
}

function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
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
  const hash = scryptSync(password, salt, ID_HASH_BYTES, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
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
 *
 * Returns false for any malformed verifier, unsupported algorithm,
 * or out‑of‑bounds parameters — never throws.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (typeof stored !== "string") return false;

    const parts = stored.split("$");
    if (parts.length !== 6) return false;
    if (parts[0] !== ALGORITHM) return false;

    const N = decode(parts[1]);
    const r = decode(parts[2]);
    const p = decode(parts[3]);
    const salt = fromBase64Url(parts[4]);
    const expectedHash = fromBase64Url(parts[5]);

    // Validate params are sane and bounded
    if (!isPowerOf2(N) || N < N_MIN || N > N_MAX) return false;
    if (r < R_MIN || r > R_MAX) return false;
    if (p < P_MIN || p > P_MAX) return false;
    if (salt.length < SALT_MIN_BYTES || salt.length > SALT_MAX_BYTES) return false;
    if (expectedHash.length < HASH_MIN_BYTES || expectedHash.length > HASH_MAX_BYTES) return false;

    const actualHash = scryptSync(password, salt, expectedHash.length, { N, r, p });

    if (actualHash.length !== expectedHash.length) return false;
    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    // Any parse/KDF errors result in false — never throw
    return false;
  }
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
