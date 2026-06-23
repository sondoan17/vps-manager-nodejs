import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const AUTH_MAGIC = Buffer.from("openssh-key-v1\0", "utf8");

function sshString(value: Buffer | string): Buffer {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(buffer.length, 0);
  return Buffer.concat([length, buffer]);
}

function ed25519PublicKeyToOpenSsh(publicKeyPem: string): string {
  const jwk = createPublicKey(publicKeyPem).export({ format: "jwk" }) as JsonWebKey;
  if (!jwk.x) throw new Error("Invalid ed25519 public key");
  const raw = Buffer.from(jwk.x, "base64url");
  return `ssh-ed25519 ${Buffer.concat([sshString("ssh-ed25519"), sshString(raw)]).toString("base64")}`;
}

export function createKeyService(baseDir = "private/keys") {
  function paths(id: string) {
    return { privateKeyPath: join(baseDir, id), publicKeyPath: join(baseDir, `${id}.pub`) };
  }

  return {
    async ensureKeyPair(id: string) {
      const keyPaths = paths(id);
      try {
        const [privateKey, publicKey] = await Promise.all([
          readFile(keyPaths.privateKeyPath, "utf8"),
          readFile(keyPaths.publicKeyPath, "utf8")
        ]);
        return { ...keyPaths, privateKey, publicKey: publicKey.trim() };
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }

      const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "pem" }
      });
      const openSshPublicKey = ed25519PublicKeyToOpenSsh(publicKey);
      await mkdir(baseDir, { recursive: true, mode: 0o700 });
      await writeFile(keyPaths.privateKeyPath, privateKey, { mode: 0o600 });
      await writeFile(keyPaths.publicKeyPath, `${openSshPublicKey}\n`, { mode: 0o644 });
      return { ...keyPaths, privateKey, publicKey: openSshPublicKey };
    },
    async readPrivateKey(id: string) {
      return readFile(paths(id).privateKeyPath, "utf8");
    }
  };
}

export type KeyService = ReturnType<typeof createKeyService>;
