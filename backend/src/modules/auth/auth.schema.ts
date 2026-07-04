import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),

  email: z.email({ message: "Invalid email address format" }),

  password: z
    .string()
    .min(8, { message: "Password length should be atleast 8 characters" })
    .max(128, { message: "Password length cannot exceed 32 characters" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[@$!%*?&]/, {
      message: "Password must contain at least one special character (@$!%*?&)",
    }),
});

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address format" }),

  password: z.string().min(1, {
    message: "Password is required",
  }),
});

export const updateMeSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" })
    .optional(),
  email: z.email({ message: "Invalid email address format" }).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, { message: "Password length should be at least 8 characters" })
    .max(128, { message: "Password length cannot exceed 128 characters" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[@$!%*?&]/, {
      message: "Password must contain at least one special character (@$!%*?&)",
    })
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email address format" }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  password: z
    .string()
    .min(8, { message: "Password length should be at least 8 characters" })
    .max(128, { message: "Password length cannot exceed 128 characters" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[@$!%*?&]/, {
      message: "Password must contain at least one special character (@$!%*?&)",
    }),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

export const magicLinkRequestSchema = z.object({
  email: z.email({ message: "Invalid email address format" }),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
});

export const oauthExchangeSchema = z.object({
  code: z.string().min(1, { message: "Code is required" }),
});

// 6-digit TOTP code, or a longer alphanumeric recovery code.
const otpCode = z
  .string()
  .min(6, { message: "Enter your 6-digit code" })
  .max(20, { message: "Invalid code" });

export const twoFactorEnableSchema = z.object({
  secret: z.string().min(1, { message: "Secret is required" }),
  code: otpCode,
});

export const twoFactorVerifySchema = z.object({
  mfaToken: z.string().min(1, { message: "MFA token is required" }),
  code: otpCode,
});

export const twoFactorDisableSchema = z.object({
  code: otpCode,
});

export const deleteAccountSchema = z.object({
  // Required only for accounts that have a password (enforced in the service);
  // OAuth-only / passwordless accounts can delete without one.
  password: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerifyInput = z.infer<typeof magicLinkVerifySchema>;
export type TwoFactorEnableInput = z.infer<typeof twoFactorEnableSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
