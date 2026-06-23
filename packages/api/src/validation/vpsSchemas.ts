import { z } from "zod";

export const createVpsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(22),
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(4096).optional()
});

export const updateVpsSchema = createVpsSchema.omit({ password: true }).partial();

export const provisionKeySchema = z.object({
  password: z.string().min(1).max(4096)
});
