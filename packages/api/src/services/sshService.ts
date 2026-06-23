import { Client } from "ssh2";
import type { VpsRecord } from "../models/vps.js";

const ENSURE_AUTHORIZED_KEYS_COMMAND = "umask 077; mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys";
const APPEND_KEY_COMMAND = "grep -qxF -- \"$PUBLIC_KEY\" ~/.ssh/authorized_keys || printf '%s\\n' \"$PUBLIC_KEY\" >> ~/.ssh/authorized_keys";
const VERIFY_COMMAND = "true";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function connect(config: { host: string; port: number; username: string; password?: string; privateKey?: string }) {
  return new Promise<Client>((resolve, reject) => {
    const client = new Client();
    client.once("ready", () => resolve(client));
    client.once("error", reject);
    client.connect({ ...config, readyTimeout: 15_000 });
  });
}

function exec(client: Client, command: string) {
  return new Promise<void>((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) return reject(error);
      let stderr = "";
      stream.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      stream.on("close", (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || "Remote command failed"));
      });
    });
  });
}

export async function provisionPublicKey(vps: VpsRecord, password: string, publicKey: string) {
  const client = await connect({ host: vps.host, port: vps.port, username: vps.username, password });
  try {
    await exec(client, ENSURE_AUTHORIZED_KEYS_COMMAND);
    await exec(client, `PUBLIC_KEY=${shellQuote(publicKey)}; ${APPEND_KEY_COMMAND}`);
  } finally {
    client.end();
  }
}

export async function verifyPrivateKey(vps: VpsRecord, privateKey: string) {
  const client = await connect({ host: vps.host, port: vps.port, username: vps.username, privateKey });
  try {
    await exec(client, VERIFY_COMMAND);
  } finally {
    client.end();
  }
}
