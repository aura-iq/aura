import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'الاسم قصير جداً').max(80),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  message: z.string().min(10, 'الرسالة قصيرة جداً').max(2000),
});
