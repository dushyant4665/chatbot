import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  email: z.string().trim().email('enter a valid email'),
  password: z.string().min(6, 'password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('enter a valid email'),
  password: z.string().min(1, 'password is required'),
});