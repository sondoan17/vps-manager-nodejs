import { nanoid } from "nanoid";
import { readJsonFile, writeJsonFile, withFileLock } from "./json-file.js";

// ── Types ──────────────────────────────────────────────────────────────

export type SessionRecord = {
  id: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  ipAddress?: string;
};

export type SessionRepository = {
  create(input: Omit<SessionRecord, "id" | "createdAt">): Promise<SessionRecord>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | undefined>;
  revoke(id: string): Promise<void>;
  cleanup(): Promise<number>;
};

// ── JSON implementation ────────────────────────────────────────────────

type SessionFile = { sessions: SessionRecord[] };

export function createJsonSessionRepository(filePath = "data/sessions.json"): SessionRepository {
  return {
    async create(input) {
      return withFileLock(filePath, async () => {
        const data = await readJsonFile<SessionFile>(filePath, { sessions: [] });
        const session: SessionRecord = {
          ...input,
          id: `sess_${nanoid(12)}`,
          createdAt: new Date().toISOString(),
        };
        data.sessions.push(session);
        await writeJsonFile(filePath, data);
        return session;
      });
    },

    async findByTokenHash(tokenHash) {
      const data = await readJsonFile<SessionFile>(filePath, { sessions: [] });
      const now = new Date().toISOString();
      return data.sessions.find(
        (s) => s.tokenHash === tokenHash && !s.revokedAt && s.expiresAt > now,
      );
    },

    async revoke(id) {
      await withFileLock(filePath, async () => {
        const data = await readJsonFile<SessionFile>(filePath, { sessions: [] });
        const session = data.sessions.find((s) => s.id === id);
        if (session) {
          session.revokedAt = new Date().toISOString();
        }
        await writeJsonFile(filePath, data);
      });
    },

    async cleanup() {
      return withFileLock(filePath, async () => {
        const data = await readJsonFile<SessionFile>(filePath, { sessions: [] });
        const before = data.sessions.length;
        const now = new Date().toISOString();
        data.sessions = data.sessions.filter((s) => s.expiresAt > now && !s.revokedAt);
        await writeJsonFile(filePath, data);
        return before - data.sessions.length;
      });
    },
  };
}
