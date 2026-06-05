import { z } from "zod";

export const createMonitorSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Monitor name must be atleast 2 characters long" })
    .max(80, { message: "Monitor name length cannot exceed 80 characters" }),

  url: z.string().url({ message: "Invalid URL format" }),

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

  maintenanceStartAt: z.string().nullable().optional(),
  maintenanceEndAt: z.string().nullable().optional(),
});

export const updateMonitorSchema = createMonitorSchema.partial(); //this means use the same validation rule as createMonitorSchema but make every field optional

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
