export type VpsRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  keyProvisionedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateVpsInput = {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
};

export type UpdateVpsInput = Partial<Omit<CreateVpsInput, "password">>;
