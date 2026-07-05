import { z } from "zod";

export const deviceTokenSchema = z.object({
  deviceCode: z.string().min(1, "deviceCode is required"),
});

export const deviceApproveSchema = z.object({
  userCode: z.string().min(1, "userCode is required"),
});

export type DeviceTokenInput = z.infer<typeof deviceTokenSchema>;
export type DeviceApproveInput = z.infer<typeof deviceApproveSchema>;
