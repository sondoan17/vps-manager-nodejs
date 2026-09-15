#!/usr/bin/env node

/**
 * Cross-platform build script for the Go agent.
 * Sets GOOS=linux GOARCH=amd64 to produce a Linux binary on any host.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const agentDir = join(root, "packages", "agent");
const outputDir = join(agentDir, "dist");
const outputPath = join(outputDir, "vps-agent-linux-amd64");

if (!existsSync(agentDir)) {
  console.error(`Error: ${agentDir} does not exist`);
  process.exit(1);
}

console.log("Building vps-agent for linux/amd64...");
mkdirSync(outputDir, { recursive: true });

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const agentVersion = process.env.AGENT_VERSION || packageJson.version || "dev";
const ldflags = `-X github.com/vps-manager/agent/internal/version.Value=${agentVersion}`;

try {
  execSync('go build -ldflags "' + ldflags + '" -o "' + outputPath + '" ./cmd/vps-agent', {
    cwd: agentDir,
    stdio: "inherit",
    env: { ...process.env, GOOS: "linux", GOARCH: "amd64", CGO_ENABLED: "0" },
  });
} catch (err) {
  console.error("Build failed.");
  process.exit(1);
}

const stats = statSync(outputPath);
const sizeKB = (stats.size / 1024).toFixed(1);
console.log(
  `\n✓ Built: packages/agent/dist/vps-agent-linux-amd64 (${sizeKB} KB)`,
);
