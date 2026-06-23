import { config as loadDotenv } from "dotenv";
import { z } from "zod";

export type AppMode = "demo" | "local";

export type AppConfig = {
  mode: AppMode;
  localAuthToken?: string;
  enableWebTerminal: boolean;
  allowPrivateNetworkTargets: boolean;
  dataDir: string;
  privateDir: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
};

const booleanSchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const envSchema = z.object({
  APP_MODE: z.enum(["demo", "local"]).default("demo"),
  LOCAL_AUTH_TOKEN: z.string().trim().min(1).optional(),
  ENABLE_WEB_TERMINAL: booleanSchema.default("false"),
  ALLOW_PRIVATE_NETWORK_TARGETS: booleanSchema.default("false"),
  DATA_DIR: z.string().trim().min(1).default("data"),
  PRIVATE_DIR: z.string().trim().min(1).default("private"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120)
});

export function parseAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  if (parsed.APP_MODE === "local" && !parsed.LOCAL_AUTH_TOKEN) {
    throw new Error("LOCAL_AUTH_TOKEN is required when APP_MODE=local");
  }

  if (parsed.ENABLE_WEB_TERMINAL && parsed.APP_MODE !== "local") {
    throw new Error("ENABLE_WEB_TERMINAL requires APP_MODE=local");
  }

  return {
    mode: parsed.APP_MODE,
    localAuthToken: parsed.LOCAL_AUTH_TOKEN,
    enableWebTerminal: parsed.ENABLE_WEB_TERMINAL,
    allowPrivateNetworkTargets: parsed.ALLOW_PRIVATE_NETWORK_TARGETS,
    dataDir: parsed.DATA_DIR,
    privateDir: parsed.PRIVATE_DIR,
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: parsed.RATE_LIMIT_MAX
  };
}

export function loadAppConfig(): AppConfig {
  loadDotenv();
  return parseAppConfig();
}
