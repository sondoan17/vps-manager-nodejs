import { z } from "zod";

// ── Schema ──────────────────────────────────────────────────────────────

const TEN_MINUTES_MS = 10 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

const agentSystemOsInfoSchema = z
  .object({
    family: z.string().max(512).optional(),
    name: z.string().max(512).optional(),
    version: z.string().max(512).optional(),
    prettyName: z.string().max(512).optional(),
  })
  .strict();

const agentSystemKernelInfoSchema = z
  .object({
    release: z.string().max(512).optional(),
    version: z.string().max(512).optional(),
    arch: z.string().max(512).optional(),
  })
  .strict();

const agentSystemCpuInfoSchema = z
  .object({
    cores: z.number().int().min(0).max(4096).optional(),
    model: z.string().max(512).optional(),
  })
  .strict();

const agentSystemMemoryInfoSchema = z
  .object({
    totalBytes: z.number().int().finite().min(0).safe().optional(),
    availableBytes: z.number().int().finite().min(0).safe().optional(),
  })
  .strict();

const agentSystemRootDiskInfoSchema = z
  .object({
    mountPoint: z.string().min(1).max(255),
    fsType: z.string().max(512).optional(),
    totalBytes: z.number().int().finite().min(0).safe().optional(),
    usedBytes: z.number().int().finite().min(0).safe().optional(),
    freeBytes: z.number().int().finite().min(0).safe().optional(),
  })
  .strict();

const agentSystemInfoInputSchema = z
  .object({
    os: agentSystemOsInfoSchema.optional(),
    kernel: agentSystemKernelInfoSchema.optional(),
    cpu: agentSystemCpuInfoSchema.optional(),
    memory: agentSystemMemoryInfoSchema.optional(),
    rootDisk: agentSystemRootDiskInfoSchema.optional(),
  })
  .strict();

// ── Docker metrics sub-schemas ─────────────────────────────────────────

const agentDockerContainerMetricSchema = z
  .object({
    id: z.string().max(16),
    name: z.string().max(255),
    image: z.string().max(255),
    status: z.string().max(255).optional(),
    state: z.string().max(255),
    createdAt: z.string().max(255).optional(),
    cpuPercent: z.number().finite().min(0).max(100000),
    memoryUsageBytes: z.number().int().finite().min(0).safe(),
    memoryLimitBytes: z.number().int().finite().min(0).safe().optional(),
    networkRxBytes: z.number().int().finite().min(0).safe(),
    networkTxBytes: z.number().int().finite().min(0).safe(),
    blockReadBytes: z.number().int().finite().min(0).safe(),
    blockWriteBytes: z.number().int().finite().min(0).safe(),
    pids: z.number().int().finite().min(0).safe(),
  })
  .strict();

const agentDockerMetricsInputSchema = z
  .object({
    collectedAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: "docker.collectedAt must be a parseable date" })
      .refine(
        (val) => {
          const ts = new Date(val).getTime();
          const now = Date.now();
          return ts >= now - TEN_MINUTES_MS && ts <= now + TWO_MINUTES_MS;
        },
        { message: "docker.collectedAt must be within -10m / +2m of now" },
      ),
    agentVersion: z.string().max(255).optional(),
    schemaVersion: z.literal(1),
    available: z.boolean(),
    errorCode: z
      .enum(["socket_missing", "permission_denied", "timeout", "daemon_unreachable", "unsupported_os", "bad_response"])
      .optional(),
    containerTotal: z.number().int().finite().min(0).safe(),
    containerRunning: z.number().int().finite().min(0).safe(),
    cpuPercent: z.number().finite().min(0).max(100000),
    memoryUsageBytes: z.number().int().finite().min(0).safe(),
    memoryLimitBytes: z.number().int().finite().min(0).safe().optional(),
    networkRxBytes: z.number().int().finite().min(0).safe(),
    networkTxBytes: z.number().int().finite().min(0).safe(),
    blockReadBytes: z.number().int().finite().min(0).safe(),
    blockWriteBytes: z.number().int().finite().min(0).safe(),
    pids: z.number().int().finite().min(0).safe(),
    containers: z.array(agentDockerContainerMetricSchema).max(20).default([]),
  })
  .strict();

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
    system: agentSystemInfoInputSchema.optional(),
    docker: agentDockerMetricsInputSchema.optional(),
  })
  .strict(); // reject unknown fields

export type AgentMetricPayloadInput = z.infer<typeof agentMetricPayloadSchema>;
