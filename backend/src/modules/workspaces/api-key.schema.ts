import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
