import prisma from '../config/database.js';
import { findProjectForUser } from './projectService.js';

export const createPrompt = async ({ title, content, projectId, userId }) => {
  const project = await findProjectForUser(projectId, userId);

  if (!project) {
    const error = new Error('project not found');
    error.statusCode = 403;
    throw error;
  }

  return prisma.prompt.create({
    data: {
      title,
      content,
      projectId,
    },
  });
};

export const listProjectPrompts = async ({ projectId, userId }) => {
  const project = await findProjectForUser(projectId, userId);

  if (!project) {
    const error = new Error('project not found');
    error.statusCode = 404;
    throw error;
  }

  return prisma.prompt.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
};