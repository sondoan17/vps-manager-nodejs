import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import type { AgentCredential, AgentCredentialStatus, AgentMetricPayload } from "./agent.models.js";
import type { MetricSample } from "../metrics/metrics.models.js";
import type { AgentRepository } from "../persistence/repositories/agent.repository.js";
import type { MetricRepository } from "../persistence/repositories/metric.repository.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import { AGENT_REPOSITORY, METRIC_REPOSITORY, VPS_REPOSITORY } from "../tokens.js";
import { agentMetricPayloadSchema } from "./agent.schemas.js";
import { VpsNotFoundError } from "../common/errors.js";

// ── Token format ────────────────────────────────────────────────────────
//   vma_<credentialId>_<secret>
//   The <secret> is 32 random bytes hex-encoded (64 hex chars).
//   Only the SHA-256 hash of the secret is stored server-side.

const TOKEN_PREFIX = "vma_";

/**
 * Extract the credential id from a raw agent token.
 * Token format: vma_<credentialId>_<secret>
 * Uses lastIndexOf('_') to separate credentialId (may contain underscores
 * from nanoid) from the secret (hex-encoded, no underscores).
 * Returns undefined if the token format is invalid.
 */
function parseToken(token: string): { credentialId: string; secret: string } | undefined {
  if (!token.startsWith(TOKEN_PREFIX)) return undefined;
  const body = token.slice(TOKEN_PREFIX.length);
  // Last underscore separates credentialId from secret (secret is hex, no underscores)
  const lastUnderscore = body.lastIndexOf("_");
  if (lastUnderscore < 1) return undefined;
  return {
    credentialId: body.slice(0, lastUnderscore),
    secret: body.slice(lastUnderscore + 1),
  };
}

/**
 * Hash a secret using SHA-256 and return the hex digest.
 */
function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

// ── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class AgentService {
  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agentRepository: AgentRepository,
    @Inject(METRIC_REPOSITORY) private readonly metricRepository: MetricRepository,
    @Inject(VPS_REPOSITORY) private readonly vpsRepository: VpsRepository,
  ) {}

  /**
   * Create a new agent credential and return the raw token.
   * The raw token is only returned once — the secret is hashed before storage.
   * Never log or persist the raw token.
   * Throws VpsNotFoundError if the VPS does not exist.
   */
  async createCredential(
    vpsId: string,
    status?: AgentCredentialStatus,
  ): Promise<{ credential: AgentCredential; token: string }> {
    // Verify VPS exists before creating credential
    const vps = await this.vpsRepository.get(vpsId);
    if (!vps) {
      throw new VpsNotFoundError();
    }

    const secret = randomBytes(32).toString("hex");
    const secretHash = hashSecret(secret);

    const credential = await this.agentRepository.createCredential({
      vpsId,
      secretHash,
      status: status ?? "active",
    });

    const token = `${TOKEN_PREFIX}${credential.id}_${secret}`;
    return { credential, token };
  }

  /**
   * Verify a bearer token header and return the associated credential.
   * Throws UnauthorizedException if the token is invalid, revoked, or malformed.
   */
  async verifyBearerToken(header: string | undefined): Promise<AgentCredential> {
    if (!header) {
      throw new UnauthorizedException({ error: { message: "Missing authorization header" } });
    }
    if (!header.startsWith("Bearer ")) {
      throw new UnauthorizedException({ error: { message: "Invalid authorization header format" } });
    }

    const rawToken = header.slice("Bearer ".length).trim();
    const parsed = parseToken(rawToken);
    if (!parsed) {
      throw new UnauthorizedException({ error: { message: "Invalid token format" } });
    }

    const credential = await this.agentRepository.getCredential(parsed.credentialId);
    if (!credential) {
      throw new UnauthorizedException({ error: { message: "Invalid token" } });
    }

    // Hash the provided secret and compare using timing-safe equality
    const providedHash = hashSecret(parsed.secret);
    const storedHash = credential.secretHash;

    if (providedHash.length !== storedHash.length) {
      throw new UnauthorizedException({ error: { message: "Invalid token" } });
    }

    if (!timingSafeEqual(Buffer.from(providedHash, "hex"), Buffer.from(storedHash, "hex"))) {
      throw new UnauthorizedException({ error: { message: "Invalid token" } });
    }

    if (credential.status === "revoked") {
      throw new UnauthorizedException({ error: { message: "Token has been revoked" } });
    }

    return credential;
  }

  /**
   * Revoke a credential by id.
   */
  async revokeCredential(id: string): Promise<void> {
    await this.agentRepository.revokeCredential(id);
  }

  /**
   * Ingest a metric payload from an authenticated agent.
   *
   * - Auto-activates pending credentials on first use.
   * - Updates credential lastUsedAt / lastUsedIp.
   * - Updates agent state (status, version, lastSeenAt).
   * - Validates the payload against the strict schema.
   * - Appends the metric sample to the repository.
   *
   * Never logs or returns the raw token.
   */
  async ingestMetric(
    credential: AgentCredential,
    payload: AgentMetricPayload,
    ip?: string,
  ): Promise<MetricSample> {
    // 1. Validate payload
    let parsed: AgentMetricPayload;
    try {
      parsed = agentMetricPayloadSchema.parse(payload);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw error;
      }
      throw error;
    }

    // 2. Verify the VPS still exists
    const vps = await this.vpsRepository.get(credential.vpsId);
    if (!vps) {
      throw new VpsNotFoundError();
    }

    // 3. If vpsId is provided in payload, it must match the credential owner
    if (parsed.vpsId !== undefined && parsed.vpsId !== credential.vpsId) {
      throw new UnauthorizedException({ error: { message: "VPS ID mismatch" } });
    }

    const now = new Date().toISOString();

    // 4. Auto-activate pending credentials
    if (credential.status === "pending") {
      await this.agentRepository.updateCredential(credential.id, {
        status: "active",
        activatedAt: now,
      });
    }

    // 5. Update credential usage (fire-and-forget style via Promise)
    await this.agentRepository.updateCredential(credential.id, {
      lastUsedAt: now,
      lastUsedIp: ip,
    });

    // 6. Upsert agent state
    const existingState = await this.agentRepository.getState(credential.vpsId);
    await this.agentRepository.upsertState({
      vpsId: credential.vpsId,
      status: "online",
      version: parsed.agentVersion,
      installedAt: existingState?.installedAt,
      lastSeenAt: now,
      lastError: existingState?.lastError,
      lastInstallJobId: existingState?.lastInstallJobId,
    });

    // 7. Build metric sample and append
    const sample: MetricSample = {
      vpsId: credential.vpsId,
      cpu: parsed.cpu,
      memory: parsed.memory,
      disk: parsed.disk,
      loadAverage: parsed.loadAverage,
      networkRx: parsed.networkRx,
      networkTx: parsed.networkTx,
      uptime: parsed.uptime,
      collectedAt: parsed.collectedAt,
      receivedAt: now,
      source: "agent",
      agentVersion: parsed.agentVersion,
    };

    await this.metricRepository.append(sample);
    return sample;
  }
}
