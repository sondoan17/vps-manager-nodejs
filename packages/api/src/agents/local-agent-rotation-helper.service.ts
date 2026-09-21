import { spawn } from "node:child_process";
import { Injectable } from "@nestjs/common";

/**
 * Invokes the host-side privileged helper through argv-only spawn.
 * The helper path is configured by LOCAL_AGENT_ROTATION_HELPER and receives
 * the credential over stdin; it must atomically update the host config and
 * restart the systemd agent. Missing configuration fails closed.
 */
@Injectable()
export class LocalAgentRotationHelper {
  async applyCredential(vpsId: string, token: string): Promise<void> {
    const command = process.env.LOCAL_AGENT_ROTATION_HELPER?.trim();
    if (!command) {
      throw new Error("Local agent rotation helper is not configured");
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, [], { stdio: ["pipe", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr = (stderr + chunk).slice(-512);
      });
      child.once("error", (error) => reject(new Error(`Rotation helper failed to start: ${error.message}`)));
      child.once("close", (code) => {
        if (code === 0) return resolve();
        reject(new Error(`Rotation helper exited with code ${code ?? "unknown"}${stderr ? `: ${stderr.trim()}` : ""}`));
      });
      child.stdin.end(JSON.stringify({ vpsId, token }) + "\n");
    });
  }
}
