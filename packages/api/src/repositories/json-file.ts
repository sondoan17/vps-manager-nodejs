import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

// ── Per-file in-process serialization ───────────────────────────────────
// Ensures read-modify-write cycles for the same file do not interleave.
// Uses a chain of promises: each writer waits for the previous one to finish.
const locks = new Map<string, Promise<void>>();

/**
 * Acquire a per-file lock, execute `fn`, then release.
 * All concurrent callers for the same file path are queued and run serially.
 */
export async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(filePath) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(filePath, next);
  await prev;
  try {
    return await fn();
  } finally {
    release!();
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function uniqueTempPath(filePath: string): string {
  // pid + timestamp + random hex avoids collisions across concurrent writes
  return `${filePath}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}.tmp`;
}

// ── Public API ──────────────────────────────────────────────────────────

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = uniqueTempPath(filePath);
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, filePath);
}

/**
 * Serialized variant: ensures exclusive access per file path so that
 * concurrent read-modify-write cycles do not interleave.
 */
export async function writeJsonFileSerialized<T>(filePath: string, data: T): Promise<void> {
  return withFileLock(filePath, () => writeJsonFile(filePath, data));
}

/**
 * Serialized read-modify-write: acquires a per-file lock, reads the file,
 * passes the data to the `modify` callback, then writes the result back.
 * This ensures the entire read-modify-write cycle is atomic per file.
 */
export async function readModifyWriteJsonFile<T>(
  filePath: string,
  fallback: T,
  modify: (data: T) => T,
): Promise<T> {
  return withFileLock(filePath, async () => {
    const data = await readJsonFile(filePath, fallback);
    const modified = modify(data);
    await writeJsonFile(filePath, modified);
    return modified;
  });
}
