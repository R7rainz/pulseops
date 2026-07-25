import { z } from "zod";

const monitorFields = z
  .object({
    name: z
      .string()
      .min(2, { message: "Monitor name must be atleast 2 characters long" })
      .max(80, { message: "Monitor name length cannot exceed 80 characters" }),

    type: z.enum(["HTTP", "HEARTBEAT"]).default("HTTP"),

    // Required for HTTP monitors, ignored for HEARTBEAT (which have no URL to
    // ping). Enforced by the superRefine below.
    url: z
      .preprocess(
        (v) => (typeof v === "string" && v && !/^https?:\/\//i.test(v) ? `https://${v}` : v),
        z.string().url({ message: "Invalid URL format" }),
      )
      .optional(),

    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),

    intervalSeconds: z
      .number()
      .int()
      .min(30, { message: "Interval must be atleast 30 seconds long" }),

    timeoutMs: z
      .number()
      .int()
      .min(1000, { message: "Timeout must be atleast 1000ms" })
      .max(30000, { message: "Timeout cannot exceed 30000ms" })
      .default(5000),

    expectedStatus: z
      .number()
      .int()
      .min(100, { message: "Expected status must be atleast 100" })
      .max(500, { message: "Expected status cannot exceed 500" })
      .default(200),

    // Extra slack (seconds) a heartbeat may be late before it's marked DOWN.
    gracePeriodSeconds: z
      .number()
      .int()
      .min(0, { message: "Grace period cannot be negative" })
      .max(86400, { message: "Grace period cannot exceed 24 hours" })
      .default(60),

    maintenanceStartAt: z.string().nullable().optional(),
    maintenanceEndAt: z.string().nullable().optional(),

    // Alert suppression. Cooldown debounces a flapping monitor; reminders
    // re-notify while an incident stays open (0 = off); mutedUntil snoozes
    // alerting without pausing the checks themselves.
    alertCooldownSeconds: z
      .number()
      .int()
      .min(0, { message: "Alert cooldown cannot be negative" })
      .max(86400, { message: "Alert cooldown cannot exceed 24 hours" })
      .optional(),

    reminderIntervalSeconds: z
      .number()
      .int()
      .min(0, { message: "Reminder interval cannot be negative" })
      .max(86400, { message: "Reminder interval cannot exceed 24 hours" })
      .refine((v) => v === 0 || v >= 300, {
        message: "Reminder interval must be 0 (off) or at least 5 minutes",
      })
      .optional(),

    mutedUntil: z.string().nullable().optional(),
  });

export const createMonitorSchema = monitorFields.superRefine((data, ctx) => {
  if (data.type === "HTTP" && !data.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: "URL is required for HTTP monitors",
    });
  }
});

export const updateMonitorSchema = monitorFields.partial(); //this means use the same validation rule as createMonitorSchema but make every field optional

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
