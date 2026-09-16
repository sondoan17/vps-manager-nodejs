export const TERMINAL_PROTOCOL_VERSION = 1;
export const MAX_TERMINAL_FRAME_BYTES = 64 * 1024;
export const MAX_TERMINAL_INPUT_BYTES = 64 * 1024;
export const PTY_LIMITS = { minCols: 1, maxCols: 500, minRows: 1, maxRows: 200 } as const;

export type TerminalClientMessage =
  | { type: "open"; version: 1; vpsId: string; cols: number; rows: number }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "disconnect" };

export type TerminalServerMessage =
  | { type: "ready"; terminalSessionId: string; startedAt: string; expiresAt: string }
  | { type: "output"; data: string }
  | { type: "error"; code: string; message: string; retryable: boolean; closeReason?: string }
  | { type: "closed"; reason: string; exitCode?: number };

const codes = new Set(["open", "input", "resize", "disconnect"]);
const keys: Record<string, readonly string[]> = {
  open: ["type", "version", "vpsId", "cols", "rows"],
  input: ["type", "data"],
  resize: ["type", "cols", "rows"],
  disconnect: ["type"],
};
function exactKeys(value: Record<string, unknown>, type: string): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys[type]].sort();
  return actual.length === expected.length && actual.every((key, i) => key === expected[i]);
}
function boundedInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function parseTerminalMessage(raw: string | Buffer): TerminalClientMessage {
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  if (Buffer.isBuffer(raw) && !Buffer.from(text, "utf8").equals(raw)) throw new Error("PROTOCOL_ERROR");
  if (Buffer.byteLength(text) > MAX_TERMINAL_FRAME_BYTES) throw new Error("PROTOCOL_ERROR");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("PROTOCOL_ERROR"); }
  if (!value || typeof value !== "object" || !codes.has((value as any).type)) throw new Error("PROTOCOL_ERROR");
  const message = value as Record<string, any>;
  if (!exactKeys(message, message.type)) throw new Error("PROTOCOL_ERROR");
  if (message.type === "open") {
    if (message.version !== 1 || typeof message.vpsId !== "string" || !message.vpsId.trim() || message.vpsId !== message.vpsId.trim() || message.vpsId.length > 200 || !validPty(message.cols, message.rows)) throw new Error("PROTOCOL_ERROR");
    return { type: "open", version: 1, vpsId: message.vpsId, cols: message.cols, rows: message.rows };
  }
  if (message.type === "input") {
    if (typeof message.data !== "string" || Buffer.byteLength(message.data) > MAX_TERMINAL_INPUT_BYTES) throw new Error("PROTOCOL_ERROR");
    return { type: "input", data: message.data };
  }
  if (message.type === "resize") {
    if (!validPty(message.cols, message.rows)) throw new Error("PROTOCOL_ERROR");
    return { type: "resize", cols: message.cols, rows: message.rows };
  }
  return { type: "disconnect" };
}

export function validPty(cols: unknown, rows: unknown): boolean {
  return boundedInt(cols, PTY_LIMITS.minCols, PTY_LIMITS.maxCols) && boundedInt(rows, PTY_LIMITS.minRows, PTY_LIMITS.maxRows);
}

export function encodeTerminalMessage(message: TerminalServerMessage): string { return JSON.stringify(message); }
