import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./test/setup";
import { App } from "./App";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("React dashboard", () => {
  it("loads VPS list and renders Vietnamese empty state", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);

    expect(await screen.findByText("Chưa có VPS nào. Thêm server đầu tiên ở form phía trên.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/vps", expect.any(Object));
  });

  it("creates a VPS then provisions key only when one-time password is submitted", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: "vps_1", name: "prod", host: "203.0.113.20", port: 22, username: "root", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { id: "vps_1", name: "prod" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);
    await screen.findByText("Chưa có VPS nào. Thêm server đầu tiên ở form phía trên.");

    await userEvent.type(screen.getByLabelText(/Tên/i), "prod");
    await userEvent.type(screen.getByLabelText(/Host/i), "203.0.113.20");
    await userEvent.type(screen.getByLabelText(/Username/i), "root");
    await userEvent.type(screen.getByLabelText(/Password tùy chọn/i), "secret-once");
    await userEvent.click(screen.getByRole("button", { name: /Tạo VPS/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/vps/vps_1/provision-key", expect.objectContaining({ method: "POST", body: JSON.stringify({ password: "secret-once" }) })));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
