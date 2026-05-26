import { z } from "zod";

export const createWebhookSchema = z.object({
  url: z.string().url({
    message: "Invalid webhook URL",
  }),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
