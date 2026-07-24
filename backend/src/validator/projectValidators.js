import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'project title is required'),
  description: z.string().trim().optional(),
});
