import { Inject, Injectable } from "@nestjs/common";
import type { AuditEvent } from "../models/audit.js";
import type { AuditRepository } from "../repositories/audit.repository.js";
import { AUDIT_REPOSITORY } from "../tokens.js";

@Injectable()
export class AuditService {
  constructor(@Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository) {}

  record(event: Omit<AuditEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
    return this.repository.append(event);
  }
}
