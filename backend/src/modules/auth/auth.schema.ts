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

//this says - "TypeScript, look at my Zod schema and create a TypeScript type from it."
export type SignupInput = z.infer<typeof signupSchema>;
