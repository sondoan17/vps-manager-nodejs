import { spawn } from "node:child_process";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { VpsNotFoundError, SshHostBlockedError } from "../common/errors.js";
import { assertSshHostAllowedAsync } from "./ssh-host-policy.js";
import { computeFingerprint } from "./ssh-host-policy.js";
import type { HostKeyPinRepository } from "./host-key-pin.repository.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import type { HostKeyPin, KeyScanResult } from "./host-key-pin.models.js";
import { APP_CONFIG, HOST_KEY_PIN_REPOSITORY, VPS_REPOSITORY } from "../tokens.js";

@Injectable()
export class HostKeyPinService {
  private readonly logger = new Logger(HostKeyPinService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(HOST_KEY_PIN_REPOSITORY) private readonly repo: HostKeyPinRepository,
    @Inject(VPS_REPOSITORY) private readonly vpsRepo: VpsRepository,
  ) {}

  // ── Resolution order ───────────────────────────────────────────────
  // 1. DB vps_id
  // 2. DB host:port
  // 3. Env vpsId
  // 4. Env host:port

  /**
   * Resolve the configured host key pin for a VPS, if any.
   * Returns the pin entry (string or string[] from env, or single fingerprint from DB).
   */
  async resolvePin(
    vpsId: string,
    host: string,
    port: number,
  ): Promise<string | string[] | undefined> {
    // 1. DB vps_id
    const dbPin = await this.repo.findByVpsId(vpsId);
    if (dbPin) return dbPin.fingerprint;

    // 2. DB host:port
    const dbHostPort = await this.repo.findByHostPort(host, port);
    if (dbHostPort) return dbHostPort.fingerprint;

    // 3. Env vpsId
    const envPins = this.config.sshHostKeyPins;
    if (envPins[vpsId]) return envPins[vpsId];

    // 4. Env host:port
    const hostPortKey = `${host}:${port}`;
    if (envPins[hostPortKey]) return envPins[hostPortKey];

    return undefined;
  }

  /**
   * Check whether a fingerprint matches the resolved pin.
   */
  async isFingerprintTrusted(
    vpsId: string,
    host: string,
    port: number,
    fingerprint: string,
  ): Promise<boolean> {
    const pin = await this.resolvePin(vpsId, host, port);
    if (!pin) return false;
    const pins = Array.isArray(pin) ? pin : [pin];
    return pins.some((p) => {
      const normalized = p.startsWith("SHA256:")
        ? p
        : `SHA256:${p.replace(/^SHA256:/i, "")}`;
      return fingerprint === normalized;
    });
  }

  // ── ssh-keyscan ───────────────────────────────────────────────────

  /**
   * Run ssh-keyscan against a VPS host:port with a 10-second timeout.
   * Returns parsed keys with computed fingerprints.
   */
  async scanHostKey(vpsId: string, host: string, port: number): Promise<KeyScanResult> {
    if (this.config.mode === "demo") {
      return {
        vpsId,
        host,
        port,
        keys: [
          {
            type: "ssh-ed25519",
            key: "AAAAC3NzaC1lZDI1NTE5AAAAIDemoKeyOnlyForTesting",
            fingerprint: "SHA256:DemoKeyForTestingPurposesOnly",
          },
        ],
      };
    }

    // Validate host policy before scanning
    await assertSshHostAllowedAsync(host, this.config);

    const target = `${host}`;
    const args = ["-T", "10", "-p", String(port), target];

    this.logger.debug(`Running ssh-keyscan ${args.join(" ")}`);

    const stdout = await this.runSshKeyScan(args);

    return this.parseKeyScanOutput(vpsId, host, port, stdout);
  }

  private runSshKeyScan(args: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const child = spawn("ssh-keyscan", args, {
        timeout: 15_000,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("ssh-keyscan timed out after 15s"));
      }, 15_000);

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0 && stdout.trim()) {
          resolve(stdout);
        } else if (code !== 0) {
          reject(
            new Error(
              `ssh-keyscan failed (exit ${code}): ${stderr.trim() || "no keys returned"}`,
            ),
          );
        } else {
          reject(new Error("ssh-keyscan returned no keys"));
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`ssh-keyscan spawn error: ${err.message}`));
      });
    });
  }

  private parseKeyScanOutput(
    vpsId: string,
    host: string,
    port: number,
    output: string,
  ): KeyScanResult {
    const keys: KeyScanResult["keys"] = [];
    const seen = new Set<string>();

    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      // Format: host key-type base64-key [comment]
      // e.g. "203.0.113.20 ssh-ed25519 AAAAC3... comment"
      // or "[203.0.113.20]:22 ssh-ed25519 AAAAC3..."
      const parts = trimmed.split(/\s+/);
      if (parts.length < 3) continue;

      // Skip the host part (first), remaining is key-type base64 [comment...]
      const keyType = parts[1];
      const keyB64 = parts[2];

      if (!keyType || !keyB64 || seen.has(keyB64)) continue;
      seen.add(keyB64);

      try {
        const rawKey = Buffer.from(keyB64, "base64");
        const fingerprint = computeFingerprint(rawKey);
        keys.push({ type: keyType, key: keyB64, fingerprint });
      } catch {
        // Skip unparseable keys
        continue;
      }
    }

    return { vpsId, host, port, keys };
  }

  // ── Trust management ──────────────────────────────────────────────

  async trustKey(
    vpsId: string,
    host: string,
    port: number,
    fingerprint: string,
    keyType?: string,
  ): Promise<HostKeyPin> {
    const scan = await this.scanHostKey(vpsId, host, port);
    const matchingKey = scan.keys.find((key) => key.fingerprint === fingerprint);
    if (!matchingKey) {
      throw new Error("Submitted SSH host key fingerprint does not match the current host key scan");
    }
    return this.repo.upsert({ vpsId, host, port, fingerprint, keyType });
  }

  async revokeTrust(vpsId: string): Promise<boolean> {
    return this.repo.deleteByVpsId(vpsId);
  }

  /**
   * Check if the VPS has a trusted host key (via DB or env pins).
   * Returns the trusted fingerprint(s) if any.
   */
  async getTrustedFingerprints(
    vpsId: string,
    host: string,
    port: number,
  ): Promise<string[]> {
    const pin = await this.resolvePin(vpsId, host, port);
    if (!pin) return [];
    return Array.isArray(pin) ? pin : [pin];
  }
}
