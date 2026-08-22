export type VpsRecord = {
  id: string;
  name: string;
  displayName?: string;
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
  kind?: "remote" | "local";
  managedBy?: "user" | "system";
  dockerMetricsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateVpsInput = {
  name: string;
  displayName?: string;
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

export type UpdateVpsInput = Partial<Omit<CreateVpsInput, "password">> & {
  dockerMetricsEnabled?: boolean;
};
