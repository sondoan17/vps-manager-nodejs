export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: "success" | "failure" | "blocked";
  timestamp: string;
  metadata?: Record<string, unknown>;
};
