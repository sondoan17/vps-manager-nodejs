import { createHash } from "node:crypto";
import { z } from "zod";
import { DOCKER_MANAGEMENT_ACTIONS } from "./docker-management.models.js";

export const DOCKER_MANAGEMENT_DIGEST_VERSION = 1;

const opaqueId = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9._~-]+$/);

export const dockerManagementOperationIdSchema = opaqueId(128);
export const dockerManagementIdempotencyKeySchema = opaqueId(64);

export const dockerManagementTargetSchema = z
  .object({
    containerKey: opaqueId(32),
    agentInstanceId: opaqueId(32).optional(),
  })
  .strict();

export const dockerManagementConfirmationSchema = z
  .object({
    confirmed: z.literal(true),
  })
  .strict();

export const dockerManagementCreateSchema = z
  .object({
    action: z.enum(DOCKER_MANAGEMENT_ACTIONS),
    target: dockerManagementTargetSchema,
    confirmation: dockerManagementConfirmationSchema,
    idempotencyKey: dockerManagementIdempotencyKeySchema,
  })
  .strict();

export const dockerManagementClaimSchema = z
  .object({
    claimedBy: opaqueId(64),
  })
  .strict();

export const dockerManagementResultSchema = z
  .object({
    ok: z.boolean(),
    exitCode: z.number().int().min(0).max(255).optional(),
    message: z.string().min(1).max(500).optional(),
  })
  .strict();

export type DockerManagementCreateInput = z.infer<
  typeof dockerManagementCreateSchema
>;
export type DockerManagementClaimInput = z.infer<
  typeof dockerManagementClaimSchema
>;
export type DockerManagementResultInput = z.infer<
  typeof dockerManagementResultSchema
>;

/** Canonical JSON for deterministic request digests (sorted object keys). */
export function canonicalManagementJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(canonicalManagementJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalManagementJson(
            (value as Record<string, unknown>)[key],
          )}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}

/** Digest covers action + target only: confirmation/key are transport metadata. */
export function dockerManagementRequestDigest(value: unknown): string {
  return createHash("sha256")
    .update(`docker-management-v${DOCKER_MANAGEMENT_DIGEST_VERSION}:`)
    .update(canonicalManagementJson(value))
    .digest("hex");
}
