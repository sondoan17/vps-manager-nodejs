#!/usr/bin/env tsx

import { createHash, randomBytes } from "node:crypto";
import { join } from "node:path";
import { loadAppConfig } from "../packages/api/src/config/app-config.js";
import { createJsonAgentRepository } from "../packages/api/src/repositories/agent.repository.js";
import { createVpsStore } from "../packages/api/src/store/vpsStore.js";

function usage(): never {
  console.error(`Usage: npm run create-agent-token -- -- --vps-id <vps_id>

Creates a one-time-display agent token for an existing VPS record.
The raw token is printed once; only its hash is stored server-side.

Options:
  --vps-id <id>   Existing VPS id to bind the token to
  --help          Show this help
`);
  process.exit(1);
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

async function main() {
  if (process.argv.includes("--help")) usage();
  const vpsId = argValue("--vps-id");
  if (!vpsId) usage();

  const config = loadAppConfig();
  const vpsRepository = createVpsStore(join(config.dataDir, "vps.json"));
  const agentRepository = createJsonAgentRepository(join(config.dataDir, "agents.json"));

  const vps = await vpsRepository.get(vpsId);
  if (!vps) {
    throw new Error(`VPS not found: ${vpsId}`);
  }

  const secret = randomBytes(32).toString("hex");
  const credential = await agentRepository.createCredential({
    vpsId: vps.id,
    secretHash: createHash("sha256").update(secret).digest("hex"),
    status: "active",
  });
  const token = `vma_${credential.id}_${secret}`;

  console.log(JSON.stringify({
    vpsId: vps.id,
    credentialId: credential.id,
    token,
    configExample: {
      backendUrl: config.agentPublicBaseUrl || "http://localhost:3000",
      vpsId: vps.id,
      token,
      intervalSeconds: config.agentInstallIntervalSeconds,
      requestTimeoutSeconds: 5,
    },
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to create agent token");
  process.exit(1);
});
