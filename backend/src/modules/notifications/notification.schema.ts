import { z } from "zod";
import { NOTIFICATION_EVENTS } from "./types";

export const CHANNEL_TYPES = ["EMAIL", "SLACK", "DISCORD", "PAGERDUTY", "WEBHOOK"] as const;

// Per-type config. Kept as a discriminated union so a Slack channel can't be
// saved with a PagerDuty routing key, and so the error message names the field
// the user actually got wrong.
const configSchemas = {
  EMAIL: z.object({
    to: z.string().min(3, "Recipient address is required"),
  }),
  SLACK: z.object({
    webhookUrl: z.string().url("Must be a valid Slack incoming webhook URL"),
  }),
  DISCORD: z.object({
    webhookUrl: z.string().url("Must be a valid Discord webhook URL"),
  }),
  PAGERDUTY: z.object({
    routingKey: z.string().min(20, "Routing key looks too short"),
  }),
  WEBHOOK: z.object({
    url: z.string().url("Must be a valid URL"),
    secret: z.string().optional(),
  }),
} as const;

const base = z.object({
  name: z.string().min(1, "Name is required").max(80),
  type: z.enum(CHANNEL_TYPES),
  config: z.record(z.string(), z.unknown()),
  events: z
    .array(z.enum(NOTIFICATION_EVENTS))
    .min(1, "Select at least one event")
    .default(["incident.opened", "incident.resolved"]),
  isActive: z.boolean().default(true),
});

// Validates `config` against the schema for the chosen `type`.
function refineConfig<T extends { type?: string; config?: unknown }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (!data.type || data.config === undefined) return;
  const schema = configSchemas[data.type as keyof typeof configSchemas];
  if (!schema) return;

  const parsed = schema.safeParse(data.config);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", ...issue.path],
        message: issue.message,
      });
    }
  }
}

export const createChannelSchema = base.superRefine(refineConfig);

export const updateChannelSchema = base.partial().superRefine(refineConfig);

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
