import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  // v1 keys are read-only in practice (no write endpoint accepts a key), but
  // the scope is stored/displayed now so READ_WRITE can be enforced in v2.
  scope: z.enum(["READ_ONLY", "READ_WRITE"]).default("READ_ONLY"),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
