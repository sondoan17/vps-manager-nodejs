export type VpsRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  provider?: string;
  region?: string;
  tags?: string[];
  status?: "unknown" | "healthy" | "warning" | "unreachable";
  lastSeenAt?: string;
  notes?: string;
  keyProvisionedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateVpsInput = {
  name: string;
  host: string;
  port: number;
  username: string;
  provider?: string;
  region?: string;
  tags?: string[];
  status?: "unknown" | "healthy" | "warning" | "unreachable";
  notes?: string;
  password?: string;
};

export type UpdateVpsInput = Partial<Omit<CreateVpsInput, "password">>;
