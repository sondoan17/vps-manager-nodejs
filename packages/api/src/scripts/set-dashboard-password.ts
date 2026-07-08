/**
 * CLI script to set or rotate the dashboard admin password.
 *
 * Compiled to dist/scripts/set-dashboard-password.js during `npm run build`.
 * For production runtime: node dist/scripts/set-dashboard-password.js --stdin
 * For local dev:          npm run set-dashboard-password -- --stdin
 *
 * Usage:
 *   node dist/scripts/set-dashboard-password.js --stdin           < password.txt
 *   node dist/scripts/set-dashboard-password.js --stdin --skip-if-same < password.txt
 *   node dist/scripts/set-dashboard-password.js --password "str"
 *
 * --skip-if-same: only rotate if the provided password differs from the stored
 *                 hash. If unchanged, prints "Password unchanged" and exits 0
 *                 without writing a new hash or revoking sessions.
 *
 * The script:
 *   1. Loads app config (reads .env via loadAppConfig).
 *   2. Creates the credential repository matching the active storage driver.
 *   3. Hashes the password using scrypt.
 *   4. Upserts the credential (or skips if --skip-if-same and hash matches).
 *   5. Revokes all existing dashboard sessions when password actually changes.
 *   6. Never prints the password or hash.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input } from "node:process";
import { isAbsolute, join } from "node:path";
import { loadAppConfig } from "../config/app-config.js";
import { createDatabasePool } from "../db/pool.js";
import {
  createJsonAdminCredentialRepository,
  type AdminCredentialRepository,
} from "../persistence/repositories/admin-credential.repository.js";
import { createPostgresAdminCredentialRepository } from "../persistence/repositories/admin-credential.postgres.repository.js";
import {
  createJsonSessionRepository,
  type SessionRepository,
} from "../persistence/repositories/session.repository.js";
import { createPostgresSessionRepository } from "../persistence/repositories/session.postgres.repository.js";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
} from "../auth/password-hash.js";

export async function setDashboardPasswordFromCli() {
  const config = loadAppConfig();

  if (config.mode !== "local") {
    console.error(
      "Dashboard password can only be set in local mode (APP_MODE=local).",
    );
    process.exit(1);
  }

  // Parse flags
  const passwordFlagIndex = process.argv.indexOf("--password");
  const stdinFlag = process.argv.includes("--stdin");
  const skipIfSame = process.argv.includes("--skip-if-same");

  // Read password
  let password: string;

  if (passwordFlagIndex !== -1 && process.argv.length > passwordFlagIndex + 1) {
    password = process.argv[passwordFlagIndex + 1]!;
    console.error(
      "WARNING: --password exposes the password in the process list.",
    );
    console.error("Prefer piping to --stdin for non-interactive use.");
  } else if (stdinFlag) {
    if (input.isTTY) {
      console.error("WARNING: --stdin reads from pipe but stdin is a TTY.");
      console.error("Pipe a password or use --password instead.");
    }
    const rl = createInterface({ input });
    password = await new Promise<string>((resolve) => {
      let data = "";
      rl.on("line", (line) => {
        data = line;
      });
      rl.on("close", () => resolve(data));
    });
    rl.close();
    if (!password) {
      console.error("No password read from stdin.");
      process.exit(1);
    }
  } else {
    console.error("Usage:");
    console.error(
      "  echo 'my-secret' | node dist/scripts/set-dashboard-password.js --stdin",
    );
    console.error(
      "  echo 'my-secret' | node dist/scripts/set-dashboard-password.js --stdin --skip-if-same",
    );
    console.error(
      "  node dist/scripts/set-dashboard-password.js --password 'my-secret'  (visible in process list)",
    );
    process.exit(1);
  }

  // Validate
  const validationError = validatePassword(password);
  if (validationError) {
    console.error(`Invalid password: ${validationError}`);
    process.exit(1);
  }

  // Create credential and session repositories
  const dataDir = isAbsolute(config.dataDir)
    ? config.dataDir
    : join(process.cwd(), config.dataDir);
  let credentialRepo: AdminCredentialRepository;
  let sessionRepo: SessionRepository;
  let pool: Awaited<ReturnType<typeof createDatabasePool>> | undefined;

  try {
    if (config.storageDriver === "postgres") {
      pool = createDatabasePool(config);
      credentialRepo = createPostgresAdminCredentialRepository(pool);
      sessionRepo = createPostgresSessionRepository(pool);
    } else {
      credentialRepo = createJsonAdminCredentialRepository(
        join(dataDir, "admin-credential.json"),
      );
      sessionRepo = createJsonSessionRepository(join(dataDir, "sessions.json"));
    }

    // Check existing credential for --skip-if-same
    if (skipIfSame) {
      const existing = await credentialRepo.get();
      if (existing && verifyPassword(password, existing.passwordHash)) {
        console.error(
          "Password unchanged — skipping update and session revocation.",
        );
        process.exit(0);
      }
    }

    // Hash — scrypt with random salt
    const passwordHash = hashPassword(password);
    // Clear password from memory as soon as possible
    (password as string) = "";

    await credentialRepo.upsert({
      passwordHash,
      passwordAlgorithm: "scrypt",
      passwordParams: JSON.stringify({ N: 16384, r: 8, p: 1 }),
    });

    // Only revoke if password actually changed (skip-if-same already handled above)
    const revoked = await sessionRepo.revokeAll();
    console.error(
      `Dashboard password set successfully. ${revoked} session(s) revoked.`,
    );
  } finally {
    if (pool) await pool.end();
  }

  process.exit(0);
}

// Allow both direct execution and import from the dev wrapper
const isDirectRun =
  process.argv[1]?.endsWith("set-dashboard-password.js") ||
  process.argv[1]?.endsWith("set-dashboard-password.ts");
if (isDirectRun) {
  setDashboardPasswordFromCli().catch((error: unknown) => {
    console.error(
      "Failed to set dashboard password:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}
