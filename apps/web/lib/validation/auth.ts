import { z } from "zod";

// Minimum policy: 8+ chars, at least one letter and one number. Deliberately
// not stricter — no invented complexity rules beyond what CLAUDE.md/OWASP
// baseline calls for.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const deleteAccountRequestSchema = z.object({
  currentPassword: z.string().min(1, "Enter your password to confirm"),
});
