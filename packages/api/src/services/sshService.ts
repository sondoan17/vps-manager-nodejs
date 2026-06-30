import { Client, type SFTPWrapper } from "ssh2";
import { SshOperationError } from "../errors.js";
import type { VpsRecord } from "../models/vps.js";

const VERIFY_COMMAND = "true";
const SSH_READY_TIMEOUT_MS = 15_000;
const SSH_COMMAND_TIMEOUT_MS = 20_000;
const SSH_DIR_PATH = ".ssh";
const AUTHORIZED_KEYS_PATH = `${SSH_DIR_PATH}/authorized_keys`;

function connect(config: { host: string; port: number; username: string; password?: string; privateKey?: string }) {
  return new Promise<Client>((resolve, reject) => {
    const client = new Client();
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.end();
      reject(new SshOperationError("SSH connection timed out. Check network reachability, firewall rules, and SSH port."));
    }, SSH_READY_TIMEOUT_MS + 2_000);
    client.once("ready", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(client);
    });
    client.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(toSshOperationError(error));
    });
    try {
      client.connect({ ...config, readyTimeout: SSH_READY_TIMEOUT_MS });
    } catch (error: unknown) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(toSshOperationError(error));
    }
  });
}

function toSshOperationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const level = typeof error === "object" && error && "level" in error ? String((error as { level?: unknown }).level) : "";

  if (level === "client-authentication" || /authentication|auth|permission denied/i.test(message)) {
    return new SshOperationError("SSH authentication failed. Check username, password, and whether password login is enabled on the VPS.");
  }

  if (code === "ECONNREFUSED") {
    return new SshOperationError("SSH connection refused. Check the VPS host, SSH port, and whether sshd is running.");
  }

  if (code === "ETIMEDOUT" || /timed out|timeout/i.test(message)) {
    return new SshOperationError("SSH connection timed out. Check network reachability, firewall rules, and SSH port.");
  }

  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return new SshOperationError("SSH host could not be resolved.");
  }

  if (code === "EHOSTUNREACH" || code === "ENETUNREACH") {
    return new SshOperationError("SSH host is unreachable from the API server.");
  }

  return new SshOperationError("SSH operation failed. Check host, port, credentials, and server SSH configuration.");
}

function exec(client: Client, command: string) {
  return new Promise<void>((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) return reject(toSshOperationError(error));
      let settled = false;
      let stderr = "";
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        stream.close();
        reject(new SshOperationError("Remote SSH command timed out."));
      }, SSH_COMMAND_TIMEOUT_MS);
      stream.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      stream.on("close", (code: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new SshOperationError(stderr.trim() || "Remote SSH command failed"));
      });
      stream.on("error", (streamError: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(toSshOperationError(streamError));
      });
    });
  });
}

function openSftp(client: Client) {
  return new Promise<SFTPWrapper>((resolve, reject) => {
    client.sftp((error, sftp) => {
      if (error) return reject(toSshOperationError(error));
      resolve(sftp);
    });
  });
}

function sftpMkdir(sftp: SFTPWrapper, path: string, mode: number) {
  return new Promise<void>((resolve, reject) => {
    sftp.mkdir(path, { mode }, (error) => {
      if (!error || isRemoteExistsError(error)) return resolve();
      reject(toSshOperationError(error));
    });
  });
}

function sftpChmod(sftp: SFTPWrapper, path: string, mode: number) {
  return new Promise<void>((resolve, reject) => {
    sftp.chmod(path, mode, (error) => {
      if (error) return reject(toSshOperationError(error));
      resolve();
    });
  });
}

function sftpReadFile(sftp: SFTPWrapper, path: string) {
  return new Promise<string>((resolve, reject) => {
    sftp.readFile(path, "utf8", (error, data) => {
      if (error) {
        if (isRemoteNotFoundError(error)) return resolve("");
        return reject(toSshOperationError(error));
      }
      resolve(typeof data === "string" ? data : data.toString("utf8"));
    });
  });
}

function sftpWriteFile(sftp: SFTPWrapper, path: string, data: string) {
  return new Promise<void>((resolve, reject) => {
    sftp.writeFile(path, data, { encoding: "utf8", mode: 0o600 }, (error) => {
      if (error) return reject(toSshOperationError(error));
      resolve();
    });
  });
}

function isRemoteExistsError(error: unknown) {
  return typeof error === "object" && error && "code" in error && Number((error as { code?: unknown }).code) === 4;
}

function isRemoteNotFoundError(error: unknown) {
  return typeof error === "object" && error && "code" in error && Number((error as { code?: unknown }).code) === 2;
}

async function installPublicKeyViaSftp(client: Client, publicKey: string) {
  const sftp = await openSftp(client);
  await sftpMkdir(sftp, SSH_DIR_PATH, 0o700);
  await sftpChmod(sftp, SSH_DIR_PATH, 0o700);
  const existing = await sftpReadFile(sftp, AUTHORIZED_KEYS_PATH);
  const lines = existing.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.includes(publicKey.trim())) lines.push(publicKey.trim());
  await sftpWriteFile(sftp, AUTHORIZED_KEYS_PATH, `${lines.join("\n")}\n`);
  await sftpChmod(sftp, AUTHORIZED_KEYS_PATH, 0o600);
}

export async function provisionPublicKey(vps: VpsRecord, password: string, publicKey: string) {
  const client = await connect({ host: vps.host, port: vps.port, username: vps.username, password });
  try {
    await installPublicKeyViaSftp(client, publicKey);
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
