import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const updateMeSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    avatarUrl: z.string().max(2_500_000).optional(),
    /** Base64 data URL or raw base64 from client avatar picker */
    avatar: z.string().max(2_500_000).optional(),
  })
  .refine((d) => d.name !== undefined || d.avatarUrl !== undefined || d.avatar !== undefined, {
    message: 'At least one field is required',
  });

export const verifyOtpBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6).max(6),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type VerifyOtpBodyInput = z.infer<typeof verifyOtpBodySchema>;
