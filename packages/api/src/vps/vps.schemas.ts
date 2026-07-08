import { z } from "zod";

export const createVpsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(22),
  username: z.string().trim().min(1).max(64),
  provider: z.string().trim().min(1).max(80).optional(),
  region: z.string().trim().min(1).max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  status: z.enum(["unknown", "healthy", "warning", "unreachable"]).optional(),
  notes: z.string().trim().max(1000).optional(),
  password: z.string().min(1).max(4096).optional(),
});

export const updateVpsSchema = createVpsSchema
  .omit({ password: true })
  .partial()
  .extend({
    dockerMetricsEnabled: z.boolean().optional(),
  });

/** Strict schema for local/system-managed VPS: only dockerMetricsEnabled allowed. */
export const updateLocalVpsSchema = z
  .object({
    dockerMetricsEnabled: z.boolean(),
  })
  .strict();

export const provisionKeySchema = z.object({
  password: z.string().min(1).max(4096),
});

export const installAgentSchema = z.object({
  password: z.string().min(1).max(4096).optional(),
});
