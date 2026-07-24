import { z } from 'zod';

export const createPromptSchema = z.object({
  title: z.string().trim().min(1, 'prompt title is required'),
  content: z.string().trim().min(1, 'prompt content is required'),
  projectId: z.string().cuid('project id must be a valid cuid'),
});

export const listProjectPromptsSchema = z.object({
  params: z.object({
    projectId: z.string().cuid('project id must be a valid cuid'),
  }),
});
