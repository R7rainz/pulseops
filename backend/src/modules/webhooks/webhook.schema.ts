import { z } from "zod";

export const WEBHOOK_EVENTS = [
  "incident.opened",
  "incident.resolved",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const createWebhookSchema = z.object({
  url: z.string().url({ message: "Invalid webhook URL" }),
  name: z.string().max(100).optional(),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Select at least one event")
    .optional(),
});

export const updateWebhookSchema = z.object({
  name: z.string().max(100).optional(),
  url: z.string().url({ message: "Invalid webhook URL" }).optional(),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Select at least one event")
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
