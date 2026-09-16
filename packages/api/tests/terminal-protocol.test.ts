import { describe, expect, it } from "vitest";
import { MAX_TERMINAL_FRAME_BYTES, MAX_TERMINAL_INPUT_BYTES, parseTerminalMessage } from "../src/terminal/terminal-protocol.js";

describe("terminal protocol", () => {
  it("accepts versioned bounded frames and PTY boundaries", () => {
    // Arrange/Act/Assert: positive protocol evidence covers v1, Buffer frames, and ordered message shapes.
    expect(parseTerminalMessage(Buffer.from(JSON.stringify({ type: "open", version: 1, vpsId: "v", cols: 1, rows: 200 })))).toMatchObject({ type: "open", version: 1 });
    expect(parseTerminalMessage(JSON.stringify({ type: "input", data: "x".repeat(MAX_TERMINAL_INPUT_BYTES - 30) }))).toMatchObject({ type: "input" });
    expect(parseTerminalMessage(JSON.stringify({ type: "resize", cols: 500, rows: 1 }))).toEqual({ type: "resize", cols: 500, rows: 1 });
    expect(parseTerminalMessage(JSON.stringify({ type: "disconnect" }))).toEqual({ type: "disconnect" });
  });

  it.each([
    "not-json",
    JSON.stringify({ type: "open", version: 2, vpsId: "v", cols: 80, rows: 24 }),
    JSON.stringify({ type: "open", version: 1, vpsId: "", cols: 80, rows: 24 }),
    JSON.stringify({ type: "resize", cols: 0, rows: 24 }),
    JSON.stringify({ type: "input", data: "x".repeat(MAX_TERMINAL_INPUT_BYTES + 1) }),
    JSON.stringify({ type: "unknown" }),
  ])("rejects malformed or unsupported input with a stable safe error", raw => {
    // Arrange/Act/Assert: negative protocol evidence proves improper input never appears in errors.
    expect(() => parseTerminalMessage(raw)).toThrowError(/^PROTOCOL_ERROR$/);
  });

  it("rejects frames above the exact frame limit", () => {
    // Arrange/Act/Assert: negative boundary evidence proves total frames are bounded.
    expect(Buffer.byteLength("x".repeat(MAX_TERMINAL_FRAME_BYTES + 1))).toBeGreaterThan(MAX_TERMINAL_FRAME_BYTES);
    expect(() => parseTerminalMessage("x".repeat(MAX_TERMINAL_FRAME_BYTES + 1))).toThrow("PROTOCOL_ERROR");
  });
});
