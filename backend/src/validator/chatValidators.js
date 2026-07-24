import { z } from 'zod';

const messageBody = z.object({
  projectId: z.string().cuid('project id must be a valid cuid'),
  message: z.string().trim().min(1, 'message is required').max(4000, 'message too long'),
  promptId: z.string().cuid('prompt id must be a valid cuid').optional(),
});

export const sendMessageSchema = z.object({
  body: messageBody,
});

export const sendMessageStreamSchema = z.object({
  body: messageBody,
});

export const getMessagesSchema = z.object({
  params: z.object({
    projectId: z.string().cuid('project id must be a valid cuid'),
  }),
});

export const clearChatSchema = z.object({
  params: z.object({
    projectId: z.string().cuid('project id must be a valid cuid'),
  }),
});

