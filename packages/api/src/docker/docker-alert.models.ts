import type {
  DockerAlertActive,
  DockerAlertObservation,
  DockerAlertRuleKind,
  DockerAlertSeverity,
  DockerAlertTransition,
  DockerAlertObservation as DockerAlertEvidence,
  DockerTypedAlertResult,
  DockerTypedAlertState,
} from "./docker-alert-evaluator.js";

export type {
  DockerAlertActive,
  DockerAlertEvidence,
  DockerAlertObservation,
  DockerAlertRuleKind,
  DockerAlertSeverity,
  DockerAlertTransition,
  DockerTypedAlertResult,
  DockerTypedAlertState,
};

export type DockerAlertScope = "host" | "container";
export type DockerAlertLifecycle = "open" | "acknowledged" | "resolved";
export type DockerAlertEvidenceKind = "sample" | "event" | "storage" | "gap";

export type DockerAlertContext = {
  version: 1;
  evidence: DockerAlertEvidenceKind;
  complete: boolean;
  gap: boolean;
  agentInstanceId?: string;
  containerKey?: string;
};

export type DockerAlertRuleDefinition = {
  kind: DockerAlertRuleKind;
  severity: DockerAlertSeverity;
  openThreshold: number;
  windowSize: number;
  clearThreshold: number;
};

export type DockerAlertEvaluation = DockerTypedAlertResult;
export type DockerAlertState = DockerTypedAlertState;
