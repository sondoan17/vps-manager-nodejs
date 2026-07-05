import { nanoid } from "nanoid";
import type { AuditEvent } from "../../audit/audit.models.js";
import type { PaginationParams } from "../../common/pagination.js";
import { redactValue } from "../../common/redaction.js";
import { readJsonFile, writeJsonFile, withFileLock } from "./json-file.js";

type AuditFile = { audit: AuditEvent[] };

export type AuditListOptions = {
  page?: PaginationParams;
  filter?: {
    resourceId?: string;
    action?: string;
    result?: string;
  };
};

export type AuditRepository = {
  list(options?: AuditListOptions): Promise<AuditEvent[]>;
  append(
    event: Omit<AuditEvent, "id" | "timestamp"> & {
      id?: string;
      timestamp?: string;
    },
    historyLimit?: number,
  ): Promise<AuditEvent>;
};

/**
 * Sort audit events newest-first by timestamp (desc), then id (desc).
 */
function sortAuditDesc(events: AuditEvent[]): AuditEvent[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return b.id.localeCompare(a.id);
  });
}

export function createJsonAuditRepository(
  filePath = "data/audit.json",
): AuditRepository {
  return {
    async list(options) {
      let events = (await readJsonFile<AuditFile>(filePath, { audit: [] })).audit;
      if (options?.filter?.resourceId) {
        events = events.filter((event) => event.resourceId === options.filter!.resourceId);
      }
      if (options?.filter?.action) {
        events = events.filter((event) => event.action === options.filter!.action);
      }
      if (options?.filter?.result) {
        events = events.filter((event) => event.result === options.filter!.result);
      }
      events = sortAuditDesc(events);
      if (options?.page) {
        return events.slice(options.page.offset, options.page.offset + options.page.limit);
      }
      return events;
    },

    async append(input, historyLimit) {
      return withFileLock(filePath, async () => {
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
        // Trim to history cap (keep newest)
        if (historyLimit !== undefined && data.audit.length > historyLimit) {
          data.audit = sortAuditDesc(data.audit).slice(0, historyLimit);
        }
        await writeJsonFile(filePath, data);
        return event;
      });
    },
  };
}
