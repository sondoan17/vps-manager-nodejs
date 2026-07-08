import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const sshUtils = (require("ssh2") as typeof import("ssh2")).utils;

function isLegacyUnsupportedPrivateKey(privateKey: string) {
  return privateKey.includes("-----BEGIN PRIVATE KEY-----");
}

function generateOpenSshKeyPair() {
  const keyPair = sshUtils.generateKeyPairSync("ed25519");
  return { privateKey: keyPair.private, publicKey: keyPair.public };
}

export function createKeyService(baseDir = "private/keys") {
  function paths(id: string) {
    return {
      privateKeyPath: join(baseDir, id),
      publicKeyPath: join(baseDir, `${id}.pub`),
    };
  }

  async function writeNewKeyPair(id: string) {
    const keyPaths = paths(id);
    const { privateKey, publicKey } = generateOpenSshKeyPair();
    await mkdir(baseDir, { recursive: true, mode: 0o700 });
    await writeFile(keyPaths.privateKeyPath, privateKey, { mode: 0o600 });
    await writeFile(keyPaths.publicKeyPath, `${publicKey.trim()}\n`, {
      mode: 0o644,
    });
    return { ...keyPaths, privateKey, publicKey: publicKey.trim() };
  }

  return {
    async ensureKeyPair(id: string) {
      const keyPaths = paths(id);
      try {
        const [privateKey, publicKey] = await Promise.all([
          readFile(keyPaths.privateKeyPath, "utf8"),
          readFile(keyPaths.publicKeyPath, "utf8"),
        ]);
        if (!isLegacyUnsupportedPrivateKey(privateKey)) {
          return { ...keyPaths, privateKey, publicKey: publicKey.trim() };
        }
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }

      return writeNewKeyPair(id);
    },
    async readPrivateKey(id: string) {
      return readFile(paths(id).privateKeyPath, "utf8");
    },
  };
}

export type KeyService = ReturnType<typeof createKeyService>;
