import { z } from "zod";

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Refinement that rejects non-finite numbers (NaN, Infinity, -Infinity).
 * Zod's built-in `.finite()` validates the value is finite at parse time.
 */

// ── Schema ──────────────────────────────────────────────────────────────

const TEN_MINUTES_MS = 10 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

export const agentMetricPayloadSchema = z
  .object({
    cpu: z.number().finite().min(0).max(100),
    memory: z.number().finite().min(0).max(100),
    disk: z.number().finite().min(0).max(100),
    loadAverage: z.number().finite().min(0),
    networkRx: z.number().finite().min(0),
    networkTx: z.number().finite().min(0),
    uptime: z.number().finite().min(0),
    collectedAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: "collectedAt must be a parseable date" })
      .refine(
        (val) => {
          const ts = new Date(val).getTime();
          const now = Date.now();
          return ts >= now - TEN_MINUTES_MS && ts <= now + TWO_MINUTES_MS;
        },
        { message: "collectedAt must be within -10m / +2m of now" },
      ),
    agentVersion: z.string().min(1, "agentVersion is required"),
    vpsId: z.string().optional(),
  })
  .strict(); // reject unknown fields

export type AgentMetricPayloadInput = z.infer<typeof agentMetricPayloadSchema>;
