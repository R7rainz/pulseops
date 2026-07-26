import { z } from "zod";

const monitorFields = z
  .object({
    name: z
      .string()
      .min(2, { message: "Monitor name must be atleast 2 characters long" })
      .max(80, { message: "Monitor name length cannot exceed 80 characters" }),

    type: z.enum(["HTTP", "HEARTBEAT", "TCP", "DNS", "KEYWORD"]).default("HTTP"),

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

    // Status matcher. A bare Int made "any 2xx" inexpressible; this accepts an
    // exact code, a class ("2xx"), a range ("200-299"), or a list ("200,204").
    expectedStatusMatch: z
      .string()
      .regex(/^\s*(\d{3}|\dxx|\d{3}\s*-\s*\d{3})(\s*,\s*(\d{3}|\dxx|\d{3}\s*-\s*\d{3}))*\s*$/i, {
        message: 'Use a code (200), a class (2xx), a range (200-299), or a list (200,204)',
      })
      .nullable()
      .optional(),

    // TCP
    tcpPort: z
      .number()
      .int()
      .min(1, { message: "Port must be between 1 and 65535" })
      .max(65535, { message: "Port must be between 1 and 65535" })
      .nullable()
      .optional(),

    // DNS
    dnsRecordType: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]).nullable().optional(),
    dnsExpectedValue: z.string().max(255).nullable().optional(),

    // Keyword
    keyword: z.string().min(1).max(255).nullable().optional(),
    keywordShouldExist: z.boolean().optional(),

    sslWarningDays: z
      .number()
      .int()
      .min(1, { message: "SSL warning threshold must be at least 1 day" })
      .max(365, { message: "SSL warning threshold cannot exceed 365 days" })
      .nullable()
      .optional(),
  });

// Each check type needs different config; the base object can't express that,
// so the per-type requirements are asserted here.
function requireTypeFields(
  data: { type?: string; url?: string | null; tcpPort?: number | null; keyword?: string | null },
  ctx: z.RefinementCtx,
) {
  const type = data.type;

  // Everything except HEARTBEAT is pull-based and needs a target.
  if (type && type !== "HEARTBEAT" && !data.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: `A target is required for ${type} monitors`,
    });
  }

  if (type === "TCP" && !data.tcpPort) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tcpPort"],
      message: "A port is required for TCP monitors",
    });
  }

  if (type === "KEYWORD" && !data.keyword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["keyword"],
      message: "A keyword is required for keyword monitors",
    });
  }
}

export const createMonitorSchema = monitorFields.superRefine(requireTypeFields);

export const updateMonitorSchema = monitorFields.partial().superRefine(requireTypeFields); //this means use the same validation rule as createMonitorSchema but make every field optional

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
