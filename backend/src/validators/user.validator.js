import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  bio: z.string().max(300).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});
