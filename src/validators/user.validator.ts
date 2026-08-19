import { z } from 'zod';

export const syncUserSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .min(1, 'name cannot be empty')
    .max(100, 'name cannot exceed 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'email is required' })
    .email('email must be a valid email address')
    .toLowerCase()
    .trim(),
  imageUrl: z.string().url('imageUrl must be a valid URL').optional(),
});

export type SyncUserInput = z.infer<typeof syncUserSchema>;
