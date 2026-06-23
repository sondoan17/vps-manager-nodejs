export type VpsRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  createdAt: string;
  updatedAt: string;
  keyProvisionedAt?: string;
};

export type CreateVpsPayload = {
  name: string;
  host: string;
  port: number;
  username: string;
};

type ApiResponse<T> = { data?: T; error?: { message?: string } };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });

  if (response.status === 204) return null as T;
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok) throw new Error(payload.error?.message || "Request failed");
  return payload.data as T;
}

export function listVps() {
  return request<VpsRecord[]>("/api/vps");
}

export function createVps(payload: CreateVpsPayload) {
  return request<VpsRecord>("/api/vps", { method: "POST", body: JSON.stringify(payload) });
}

export function provisionKey(id: string, password: string) {
  return request<VpsRecord>(`/api/vps/${id}/provision-key`, { method: "POST", body: JSON.stringify({ password }) });
}

export function verifyKey(id: string) {
  return request<{ ok: true }>(`/api/vps/${id}/verify-key`, { method: "POST" });
}

export function deleteVps(id: string) {
  return request<null>(`/api/vps/${id}`, { method: "DELETE" });
}
