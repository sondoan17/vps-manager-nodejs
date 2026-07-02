import { nanoid } from "nanoid";
import { redactValue } from "../common/redaction.js";
import type { DatabasePool } from "../db/pool.js";
import type { AuditEvent } from "../models/audit.js";
import type { AuditRepository } from "./audit.repository.js";
import { requiredIsoString, toDateOrNull, toJsonOrNull } from "./postgres-mappers.js";

type AuditRow = {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  result: AuditEvent["result"];
  timestamp: Date | string;
  metadata: Record<string, unknown> | null;
  severity: AuditEvent["severity"] | null;
  server_label: string | null;
  action_label: string | null;
  event_code: string | null;
  source_ip: string | null;
  request_id: string | null;
  client: string | null;
  job_id: string | null;
  duration_ms: number | null;
  auth_method: string | null;
  reason: string | null;
};

export function createPostgresAuditRepository(pool: DatabasePool): AuditRepository {
  return {
    async list() {
      const result = await pool.query<AuditRow>("SELECT * FROM audit_events ORDER BY timestamp DESC");
      return result.rows.map(rowToAudit);
    },
    async append(input) {
      const event: AuditEvent = {
        ...input,
        id: input.id ?? `audit_${nanoid(12)}`,
        timestamp: input.timestamp ?? new Date().toISOString(),
        metadata: redactValue(input.metadata) as Record<string, unknown> | undefined
      };
      const result = await pool.query<AuditRow>(
        `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, result, timestamp, metadata,
          severity, server_label, action_label, event_code, source_ip, request_id, client, job_id, duration_ms,
          auth_method, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          event.id,
          event.actor,
          event.action,
          event.resourceType,
          event.resourceId ?? null,
          event.result,
          new Date(event.timestamp),
          toJsonOrNull(event.metadata),
          event.severity ?? null,
          event.serverLabel ?? null,
          event.actionLabel ?? null,
          event.eventCode ?? null,
          event.sourceIp ?? null,
          event.requestId ?? null,
          event.client ?? null,
          event.jobId ?? null,
          event.durationMs ?? null,
          event.authMethod ?? null,
          event.reason ?? null
        ]
      );
      return rowToAudit(result.rows[0]!);
    }
  };
}

function rowToAudit(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id ?? undefined,
    result: row.result,
    timestamp: requiredIsoString(row.timestamp),
    metadata: row.metadata ?? undefined,
    severity: row.severity ?? undefined,
    serverLabel: row.server_label ?? undefined,
    actionLabel: row.action_label ?? undefined,
    eventCode: row.event_code ?? undefined,
    sourceIp: row.source_ip ?? undefined,
    requestId: row.request_id ?? undefined,
    client: row.client ?? undefined,
    jobId: row.job_id ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    authMethod: row.auth_method ?? undefined,
    reason: row.reason ?? undefined
  };
}
