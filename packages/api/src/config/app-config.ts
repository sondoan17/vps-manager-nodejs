import { config as loadDotenv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export type AppMode = "demo" | "local";
export type StorageDriver = "json" | "postgres";

export type AppConfig = {
  mode: AppMode;
  localAuthToken?: string;
  enableWebTerminal: boolean;
  allowPrivateNetworkTargets: boolean;
  dataDir: string;
  privateDir: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  agentPublicBaseUrl?: string;
  agentBinaryPath?: string;
  agentInstallIntervalSeconds: number;
  allowInsecureAgentHttp: boolean;
  storageDriver: StorageDriver;
  databaseUrl?: string;
  dbSsl: boolean;
  dbPoolMax: number;
};

const booleanSchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const envSchema = z.object({
  APP_MODE: z.enum(["demo", "local"]).default("demo"),
  LOCAL_AUTH_TOKEN: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(1).optional()),
  ENABLE_WEB_TERMINAL: booleanSchema.default("false"),
  ALLOW_PRIVATE_NETWORK_TARGETS: booleanSchema.default("false"),
  DATA_DIR: z.string().trim().min(1).default("data"),
  PRIVATE_DIR: z.string().trim().min(1).default("private"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AGENT_PUBLIC_BASE_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().url().optional()),
  AGENT_BINARY_PATH: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().optional()),
  AGENT_INSTALL_INTERVAL_SECONDS: z.coerce.number().int().min(1).default(1),
  ALLOW_INSECURE_AGENT_HTTP: booleanSchema.default("false"),
  STORAGE_DRIVER: z.enum(["json", "postgres"]).default("json"),
  DATABASE_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(1).optional()),
  DB_SSL: booleanSchema.default("false"),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10)
});

export function parseAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  if (parsed.APP_MODE === "local" && !parsed.LOCAL_AUTH_TOKEN) {
    throw new Error("LOCAL_AUTH_TOKEN is required when APP_MODE=local");
  }

  if (parsed.ENABLE_WEB_TERMINAL && parsed.APP_MODE !== "local") {
    throw new Error("ENABLE_WEB_TERMINAL requires APP_MODE=local");
  }

  if (parsed.STORAGE_DRIVER === "postgres" && !parsed.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when STORAGE_DRIVER=postgres");
  }

  return {
    mode: parsed.APP_MODE,
    localAuthToken: parsed.LOCAL_AUTH_TOKEN,
    enableWebTerminal: parsed.ENABLE_WEB_TERMINAL,
    allowPrivateNetworkTargets: parsed.ALLOW_PRIVATE_NETWORK_TARGETS,
    dataDir: parsed.DATA_DIR,
    privateDir: parsed.PRIVATE_DIR,
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    agentPublicBaseUrl: parsed.AGENT_PUBLIC_BASE_URL,
    agentBinaryPath: parsed.AGENT_BINARY_PATH,
    agentInstallIntervalSeconds: parsed.AGENT_INSTALL_INTERVAL_SECONDS,
    allowInsecureAgentHttp: parsed.ALLOW_INSECURE_AGENT_HTTP,
    storageDriver: parsed.STORAGE_DRIVER,
    databaseUrl: parsed.DATABASE_URL,
    dbSsl: parsed.DB_SSL,
    dbPoolMax: parsed.DB_POOL_MAX
  };
}

export function loadAppConfig(): AppConfig {
  loadDotenv({ path: findProjectRootEnvPath() });
  return parseAppConfig();
}

function findProjectRootEnvPath(): string {
  const startDirectories = [process.cwd(), dirname(fileURLToPath(import.meta.url))];

  for (const startDirectory of startDirectories) {
    const projectRoot = findProjectRoot(startDirectory);
    if (projectRoot) return join(projectRoot, ".env");
  }

  return join(process.cwd(), ".env");
}

function findProjectRoot(startDirectory: string): string | undefined {
  let currentDirectory = startDirectory;

  while (true) {
    const packageJsonPath = join(currentDirectory, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { workspaces?: unknown };
        if (Array.isArray(packageJson.workspaces)) return currentDirectory;
      } catch {
        // Keep walking upward if package.json is not readable or parseable.
      }
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return undefined;
    currentDirectory = parentDirectory;
  }
}
