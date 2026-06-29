import { nanoid } from "nanoid";
import type { AuditEvent } from "../models/audit.js";
import { redactValue } from "../common/redaction.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";

type AuditFile = { audit: AuditEvent[] };

export type AuditRepository = {
  list(): Promise<AuditEvent[]>;
  append(
    event: Omit<AuditEvent, "id" | "timestamp"> & {
      id?: string;
      timestamp?: string;
    },
  ): Promise<AuditEvent>;
};

export function createJsonAuditRepository(
  filePath = "data/audit.json",
): AuditRepository {
  return {
    async list() {
      return (await readJsonFile<AuditFile>(filePath, { audit: [] })).audit;
    },
    async append(input) {
      const data = await readJsonFile<AuditFile>(filePath, { audit: [] });
      const event: AuditEvent = {
        ...input,
        id: input.id ?? `audit_${nanoid(12)}`,
        timestamp: input.timestamp ?? new Date().toISOString(),
        metadata: redactValue(input.metadata) as
          | Record<string, unknown>
          | undefined,
      };
      data.audit.push(event);
      await writeJsonFile(filePath, data);
      return event;
    },
  };
}
