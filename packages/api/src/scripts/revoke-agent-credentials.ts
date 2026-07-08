/**
 * Revoke active agent credentials for one VPS except an explicit credential id.
 *
 * Used by the host-agent installer after a new config has been installed
 * successfully. This keeps token rotation two-phase: issue a new token first,
 * install it, then revoke old credentials only after the install step succeeds.
 */

import { loadAppConfig } from "../config/app-config.js";
import { createRepositories } from "../persistence/repositories/create-repositories.js";

const DEFAULT_LOCAL_HOST_ID = "vps_local_host";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function usage(exitCode = 0): never {
  const output = exitCode === 0 ? console.log : console.error;
  output(`Usage: node dist/scripts/revoke-agent-credentials.js --keep-credential-id <id> [--vps-id <id>]

Options:
  --keep-credential-id <id>  Active credential id to keep.
  --vps-id <id>              VPS/host id (default: vps_local_host).
  --help                     Show this help.
`);
  process.exit(exitCode);
}

export async function revokeAgentCredentialsFromCli() {
  if (process.argv.includes("--help")) usage();

  const keepCredentialId = argValue("--keep-credential-id");
  if (!keepCredentialId) usage(1);

  const vpsId = argValue("--vps-id") ?? DEFAULT_LOCAL_HOST_ID;
  const config = loadAppConfig();
  const repos = createRepositories(config);
  const { agent: agentRepository, pool } = repos;

  try {
    const credentials = await agentRepository.listCredentialsByVps(vpsId);
    const toRevoke = credentials.filter(
      (credential) =>
        credential.status === "active" && credential.id !== keepCredentialId,
    );

    for (const credential of toRevoke) {
      await agentRepository.revokeCredential(credential.id);
    }

    console.log(
      JSON.stringify({
        vpsId,
        keptCredentialId: keepCredentialId,
        revokedCount: toRevoke.length,
      }),
    );
  } finally {
    if (pool) await pool.end();
  }
}

const isDirectRun =
  process.argv[1]?.endsWith("revoke-agent-credentials.js") ||
  process.argv[1]?.endsWith("revoke-agent-credentials.ts");
if (isDirectRun) {
  revokeAgentCredentialsFromCli().catch((error: unknown) => {
    console.error(
      "Failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}
