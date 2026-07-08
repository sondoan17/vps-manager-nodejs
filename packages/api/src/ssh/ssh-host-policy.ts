import { lookup as dnsLookup } from "node:dns/promises";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { AppConfig } from "../config/app-config.js";
import { SshHostBlockedError } from "../common/errors.js";

// ---------------------------------------------------------------------------
// IPv4 helpers
// ---------------------------------------------------------------------------

function ipv4ToNumber(host: string): number | undefined {
  const parts = host.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return undefined;
  return parts.reduce((value, part) => (value << 8) + part, 0) >>> 0;
}

function inRange(value: number, cidrBase: string, bits: number): boolean {
  const base = ipv4ToNumber(cidrBase);
  if (base === undefined) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (base & mask);
}

// ---------------------------------------------------------------------------
// Address classification
// ---------------------------------------------------------------------------

type Classification =
  "localhost" | "metadata" | "private" | "public" | "invalid";

function classifyIpv4(addr: string): Classification {
  const num = ipv4ToNumber(addr);
  if (num === undefined) return "invalid";
  if (inRange(num, "127.0.0.0", 8)) return "localhost";
  if (inRange(num, "169.254.0.0", 16)) return "metadata";
  if (inRange(num, "0.0.0.0", 8)) return "localhost"; // unspecified
  if (
    inRange(num, "10.0.0.0", 8) ||
    inRange(num, "172.16.0.0", 12) ||
    inRange(num, "192.168.0.0", 16)
  )
    return "private";
  return "public";
}

/**
 * Parse an IPv6 address into its 8 hextets (16-bit numbers).
 *
 * Handles:
 *   - "::" compression (anywhere)
 *   - Leading-zero hextets  (e.g. "0000")
 *   - Dotted IPv4 suffix    (e.g. "::ffff:10.0.0.5")
 *   - Mixed forms           (e.g. "0:0:0:0:0:ffff:7f00:1")
 *   - Fully-expanded forms  (e.g. "0000:0000:0000:0000:0000:ffff:7f00:0001")
 *
 * Returns `undefined` for anything that is not a valid-looking IPv6 address.
 */
function parseIpv6Hextets(addr: string): number[] | undefined {
  const lower = addr.trim().toLowerCase();

  // Separate optional dotted IPv4 suffix (the last 32 bits)
  let ipv4Suffix: string | undefined;
  let base = lower;
  const ipv4Match = lower.match(/^(.*?):(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match) {
    base = ipv4Match[1];
    ipv4Suffix = ipv4Match[2];
  }

  const parts = base.split(":");
  if (parts.length < 2 || parts.length > 8) return undefined;

  const emptyIdx = parts.indexOf("");
  let hextets: number[];

  if (emptyIdx !== -1) {
    // "::" compression — emptyIdx marks the first empty slot
    // Two empty slots in a row would be ["", "", ...] — only one empty
    const before = parts.slice(0, emptyIdx);
    const after = parts.slice(emptyIdx + 1);
    const ipv4Hextets = ipv4Suffix ? 2 : 0;
    const remaining = 8 - before.length - after.length - ipv4Hextets;
    if (remaining < 1) return undefined;
    hextets = [
      ...before.map((h) => parseInt(h || "0", 16)),
      ...Array(remaining).fill(0),
      ...after.map((h) => parseInt(h || "0", 16)),
    ];
  } else {
    // No compression
    const ipv4Hextets = ipv4Suffix ? 2 : 0;
    if (parts.length !== 8 - ipv4Hextets) return undefined;
    hextets = parts.map((h) => parseInt(h, 16));
  }

  // Append IPv4 suffix as two hextets
  if (ipv4Suffix) {
    const octets = ipv4Suffix.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255))
      return undefined;
    hextets.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
  }

  if (
    hextets.length !== 8 ||
    hextets.some((h) => isNaN(h) || h < 0 || h > 0xffff)
  )
    return undefined;
  return hextets;
}

/**
 * Classify an IPv6 address by parsing all 8 hextets.
 *
 *   - All zeros / [0,0,0,0,0,0,0,1]  -> localhost (unspecified / loopback)
 *   - fe80::/10  (first hextet 0xfe80–0xfebf) -> metadata / link-local
 *   - fc00::/7   (first hextet 0xfc00–0xfdff) -> private / ULA
 *   - everything else                         -> public
 */
function classifyIpv6(addr: string): Classification {
  const hextets = parseIpv6Hextets(addr);
  if (!hextets) return "invalid";

  // Loopback (::1 / 0:0:0:0:0:0:0:1)  and  Unspecified (:: / 0:0:0:0:0:0:0:0)
  const isAllZero = hextets.every((h) => h === 0);
  const isLoopback =
    hextets.slice(0, 7).every((h) => h === 0) && hextets[7] === 1;
  if (isAllZero || isLoopback) return "localhost";

  const firstHextet = hextets[0];
  // Link-local fe80::/10  (0xfe80 – 0xfebf)
  if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return "metadata";
  // ULA fc00::/7  (0xfc00 – 0xfdff)
  if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return "private";
  return "public";
}

/**
 * Convert two 16-bit numbers (hextets) to a dotted-decimal IPv4 string.
 */
function hextetsToIpv4(hi: number, lo: number): string {
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/**
 * Detect IPv4-mapped IPv6 addresses using parsed hextets.
 *
 * RFC 4291 prefix:  0:0:0:0:0:ffff/96
 * Returns the embedded dotted-decimal IPv4 string or null.
 */
function extractIpv4Mapped(addr: string): string | null {
  const hextets = parseIpv6Hextets(addr);
  if (!hextets) return null;

  // Check for 0:0:0:0:0:ffff/96 prefix
  for (let i = 0; i < 5; i++) {
    if (hextets[i] !== 0) return null;
  }
  if (hextets[5] !== 0xffff) return null;

  return hextetsToIpv4(hextets[6], hextets[7]);
}

// ---------------------------------------------------------------------------
// Host input validation (shared by sync + async paths)
// ---------------------------------------------------------------------------

/**
 * Reject inputs that look like URLs, paths, userinfo, or host:port notation.
 * Valid IPv6 literals (containing ":") are preserved.
 */
function validateHostFormat(host: string): void {
  const normalized = host.trim().toLowerCase();

  // Always reject userinfo, paths, percent-encoding
  if (normalized.includes("@"))
    throw new SshHostBlockedError(
      "Invalid SSH host format: userinfo ( @ ) not allowed",
    );
  if (normalized.includes("/"))
    throw new SshHostBlockedError(
      "Invalid SSH host format: path ( / ) not allowed",
    );
  if (normalized.includes("%"))
    throw new SshHostBlockedError(
      "Invalid SSH host format: percent-encoding not allowed",
    );

  // Reject bracketed IPv6 with port: [::1]:22
  if (normalized.includes("[") || normalized.includes("]")) {
    throw new SshHostBlockedError(
      "Invalid SSH host format: bracketed notation with port not allowed",
    );
  }

  // If it contains ":" but is NOT a valid IPv6 literal, it's a host:port or similar
  if (normalized.includes(":") && isIP(normalized) === 0) {
    throw new SshHostBlockedError(
      "Invalid SSH host format: host:port style not allowed",
    );
  }
}

// ---------------------------------------------------------------------------
// Sync assertion (backward-compatible wrapper)
// ---------------------------------------------------------------------------

/**
 * Synchronous host-name / literal-IP check.
 * Does NOT perform DNS resolution.
 * Kept for backward compatibility with existing tests and routes that pass
 * a pre-resolved literal IP.
 */
export function assertSshHostAllowed(host: string, config: AppConfig): void {
  const normalized = host.trim().toLowerCase();
  validateHostFormat(normalized);

  // Named localhost
  if (normalized === "localhost")
    throw new SshHostBlockedError("Localhost SSH targets are blocked");

  // IPv4-mapped IPv6
  const mappedV4 = extractIpv4Mapped(normalized);
  if (mappedV4) {
    assertClassificationAllowed(
      classifyIpv4(mappedV4),
      config,
      `IPv4-mapped address ::ffff:${mappedV4}`,
    );
    return;
  }

  const ipVersion = isIP(normalized);

  if (ipVersion === 6) {
    assertClassificationAllowed(classifyIpv6(normalized), config, normalized);
    return;
  }

  if (ipVersion === 4) {
    assertClassificationAllowed(classifyIpv4(normalized), config, normalized);
    return;
  }

  // Non-IP hostnames allowed through sync wrapper; async version should be used.
}

function assertClassificationAllowed(
  classification: Classification,
  config: AppConfig,
  label: string,
): void {
  switch (classification) {
    case "localhost":
      throw new SshHostBlockedError(
        `Localhost SSH targets are blocked: ${label}`,
      );
    case "metadata":
      throw new SshHostBlockedError(
        `Metadata/link-local SSH targets are blocked: ${label}`,
      );
    case "private":
      if (!(config.mode === "local" && config.allowPrivateNetworkTargets)) {
        throw new SshHostBlockedError(
          `Private-network SSH targets require explicit local config: ${label}`,
        );
      }
      return;
    case "public":
      return;
    case "invalid":
      throw new SshHostBlockedError(`Invalid SSH target address: ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Async DNS-resolution-aware policy
// ---------------------------------------------------------------------------

/**
 * Async resolution-aware SSH host policy.
 *
 * Resolves hostnames via DNS A/AAAA, validates every resolved address,
 * and returns the first resolved IP for connection (to avoid DNS rebinding TOCTOU).
 *
 * DNS failures and empty results fail closed.
 */
export async function assertSshHostAllowedAsync(
  host: string,
  config: AppConfig,
): Promise<string> {
  const normalized = host.trim().toLowerCase();

  // ---- Reject URL/path/userinfo/host:port style inputs ----
  validateHostFormat(normalized);

  // Named localhost
  if (normalized === "localhost")
    throw new SshHostBlockedError("Localhost SSH targets are blocked");

  // ---- Literal IP fast-path (no DNS needed) ----
  const ipVersion = isIP(normalized);

  // IPv4-mapped IPv6
  const mappedV4 = extractIpv4Mapped(normalized);
  if (mappedV4) {
    assertClassificationAllowed(
      classifyIpv4(mappedV4),
      config,
      `IPv4-mapped address ::ffff:${mappedV4}`,
    );
    return mappedV4;
  }

  if (ipVersion === 6) {
    assertClassificationAllowed(classifyIpv6(normalized), config, normalized);
    return normalized;
  }

  if (ipVersion === 4) {
    assertClassificationAllowed(classifyIpv4(normalized), config, normalized);
    return normalized;
  }

  // ---- Hostname resolution ----
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dnsLookup(normalized, { all: true, verbatim: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SshHostBlockedError(
      `DNS resolution failed for SSH host "${normalized}": ${message}`,
    );
  }

  if (!addresses || addresses.length === 0) {
    throw new SshHostBlockedError(
      `DNS resolution returned no records for SSH host "${normalized}"`,
    );
  }

  // Validate every resolved address; reject hostname if *any* is blocked
  let firstPublic: string | undefined;
  let firstEffective: string | undefined;
  for (const { address, family } of addresses) {
    const mapped = extractIpv4Mapped(address);
    const effectiveAddr = mapped ?? address;
    const effectiveFamily = mapped ? 4 : family;

    if (effectiveFamily === 4) {
      const classification = classifyIpv4(effectiveAddr);
      assertClassificationAllowed(
        classification,
        config,
        `${effectiveAddr} (from ${normalized})`,
      );
      if (!firstEffective) firstEffective = effectiveAddr;
      if (!firstPublic && classification === "public") {
        firstPublic = effectiveAddr;
      }
    } else {
      // IPv6
      const classification = classifyIpv6(effectiveAddr);
      assertClassificationAllowed(
        classification,
        config,
        `${effectiveAddr} (from ${normalized})`,
      );
      if (!firstEffective) firstEffective = effectiveAddr;
      if (!firstPublic && classification === "public") {
        firstPublic = effectiveAddr;
      }
    }
  }

  // Return the first validated address as the connection target (preferring public)
  const target = firstPublic ?? firstEffective ?? addresses[0].address;
  return target;
}

// ---------------------------------------------------------------------------
// SSH Host Key Verification
// ---------------------------------------------------------------------------

/**
 * Compute the canonical OpenSSH-style fingerprint from a raw host key Buffer.
 * Format: `SHA256:<base64-no-padding>`
 */
export function computeFingerprint(rawKey: Buffer): string {
  const hash = createHash("sha256").update(rawKey).digest();
  const base64 = hash.toString("base64").replace(/=+$/, "");
  return `SHA256:${base64}`;
}

// ---------------------------------------------------------------------------
// Pin matching helper
// ---------------------------------------------------------------------------

/**
 * Check whether `fingerprint` matches a pin entry which can be a single string
 * or an array of strings (supporting key rotation).
 */
function pinMatches(fingerprint: string, pinEntry: string | string[]): boolean {
  const pins = Array.isArray(pinEntry) ? pinEntry : [pinEntry];
  for (const raw of pins) {
    const normalized = raw.startsWith("SHA256:")
      ? raw
      : `SHA256:${raw.replace(/^SHA256:/i, "")}`;
    if (fingerprint === normalized) return true;
  }
  return false;
}

/**
 * Options for {@link createHostVerifier}.
 */
export interface HostVerifierOptions {
  /** VPS record id (used as first-priority pin lookup key). */
  vpsId: string;
  /** Original hostname or IP from the VPS record (used for host:port pin lookup). */
  host: string;
  /** SSH port. */
  port: number;
  /** Pin map keyed by vpsId and/or host:port strings. Values are strings or arrays of strings. */
  pins: Record<string, string | string[]>;
  /** `strict` rejects when no matching pin is found; `permissive` allows unpinned. */
  policy: "strict" | "permissive";
}

/**
 * Create an ssh2 `hostVerifier` callback that checks the server host key against
 * configured pins.
 *
 * Pin lookup priority:
 * 1. `vpsId` key
 * 2. `${host}:${port}` key
 *
 * Values can be a single fingerprint string or an array of strings (key rotation).
 *
 * In `strict` mode, if no pin matches for the VPS, the connection is rejected.
 * In `permissive` mode, unpinned connections are allowed (but a warning is logged).
 */
export function createHostVerifier(
  options: HostVerifierOptions,
): (key: Buffer, verify: (permitted: boolean) => void) => void {
  const { vpsId, host, port, pins, policy } = options;

  // Pre-resolve pin candidates
  const vpsPin = pins[vpsId];
  const hostPortKey = `${host}:${port}`;
  const hostPortPin = pins[hostPortKey];

  return (key: Buffer, verify: (permitted: boolean) => void): void => {
    const fingerprint = computeFingerprint(key);

    // Try vpsId pin first, then host:port pin
    const pinEntry = vpsPin ?? hostPortPin;

    if (pinEntry !== undefined) {
      if (pinMatches(fingerprint, pinEntry)) {
        verify(true);
        return;
      }

      // Mismatch — log details and reject
      console.error(
        `[ssh] HOST KEY MISMATCH for ${host}:${port} (vps=${vpsId}). ` +
          `Expected pins: ${JSON.stringify(pinEntry)}. ` +
          `Received: ${fingerprint}.`,
      );
      verify(false);
      return;
    }

    // No pin configured for this host
    if (policy === "strict") {
      console.error(
        `[ssh] HOST KEY REJECTED for ${host}:${port} (vps=${vpsId}): ` +
          `no host key pin configured and policy is strict. ` +
          `Observed fingerprint: ${fingerprint}. ` +
          `Set SSH_HOST_KEY_PINS['${vpsId}'] or SSH_HOST_KEY_PINS['${hostPortKey}'] to this fingerprint.`,
      );
      verify(false);
      return;
    }

    // Permissive: allow but log warning
    console.warn(
      `[ssh] WARNING: No host key pin for ${host}:${port} (vps=${vpsId}). ` +
        `Observed fingerprint: ${fingerprint}. Policy is permissive — allowing connection.`,
    );
    verify(true);
  };
}
