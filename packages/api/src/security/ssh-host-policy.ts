import { isIP } from "node:net";
import type { AppConfig } from "../config/app-config.js";
import { SshHostBlockedError } from "../errors.js";

function ipv4ToNumber(host: string): number | undefined {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined;
  return parts.reduce((value, part) => (value << 8) + part, 0) >>> 0;
}

function inRange(value: number, cidrBase: string, bits: number): boolean {
  const base = ipv4ToNumber(cidrBase);
  if (base === undefined) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (base & mask);
}

export function assertSshHostAllowed(host: string, config: AppConfig): void {
  const normalized = host.trim().toLowerCase();

  if (normalized === "localhost") throw new SshHostBlockedError("Localhost SSH targets are blocked");
  if (normalized === "::1") throw new SshHostBlockedError("Localhost SSH targets are blocked");

  const ipVersion = isIP(normalized);
  if (ipVersion === 6) {
    if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
      throw new SshHostBlockedError("Private-network SSH targets require explicit local config");
    }
    return;
  }

  const ipv4 = ipv4ToNumber(normalized);
  if (ipVersion === 4 && ipv4 !== undefined) {
    if (inRange(ipv4, "127.0.0.0", 8)) throw new SshHostBlockedError("Localhost SSH targets are blocked");
    if (inRange(ipv4, "169.254.0.0", 16)) throw new SshHostBlockedError("Metadata/link-local SSH targets are blocked");
    const isPrivate = inRange(ipv4, "10.0.0.0", 8) || inRange(ipv4, "172.16.0.0", 12) || inRange(ipv4, "192.168.0.0", 16);
    if (isPrivate && !(config.mode === "local" && config.allowPrivateNetworkTargets)) {
      throw new SshHostBlockedError("Private-network SSH targets require explicit local config");
    }
  }
}
