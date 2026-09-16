export type TerminalErrorCode =
  | "TERMINAL_DISABLED" | "SESSION_UNAUTHORIZED" | "SESSION_EXPIRED" | "VPS_NOT_FOUND"
  | "VPS_NOT_ELIGIBLE" | "KEY_UNAVAILABLE" | "SSH_FAILURE" | "LIMIT_EXCEEDED"
  | "PROTOCOL_ERROR" | "INTERNAL_ERROR";

export class TerminalError extends Error {
  readonly name = "TerminalError";
  constructor(readonly code: TerminalErrorCode, message: string, readonly retryable: boolean, readonly closeReason = code.toLowerCase()) {
    super(message);
  }
}

export function terminalError(code: TerminalErrorCode, cause?: unknown): TerminalError {
  const table: Record<TerminalErrorCode, [string, boolean, string]> = {
    TERMINAL_DISABLED: ["Terminal access is disabled.", false, "disabled"], SESSION_UNAUTHORIZED: ["Dashboard session is unauthorized.", false, "unauthorized"],
    SESSION_EXPIRED: ["Dashboard session has expired.", false, "session_expired"], VPS_NOT_FOUND: ["VPS was not found.", false, "vps_not_found"],
    VPS_NOT_ELIGIBLE: ["VPS is not eligible for terminal access.", false, "vps_not_eligible"], KEY_UNAVAILABLE: ["VPS key is unavailable.", false, "key_unavailable"],
    SSH_FAILURE: ["SSH connection failed.", true, "ssh_failure"], LIMIT_EXCEEDED: ["Terminal limit exceeded.", true, "limit_exceeded"],
    PROTOCOL_ERROR: ["Invalid terminal message.", false, "protocol_error"], INTERNAL_ERROR: ["Terminal operation failed.", true, "internal_error"],
  };
  const [message, retryable, reason] = table[code];
  return new TerminalError(code, message, retryable, reason);
}
