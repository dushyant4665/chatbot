import prisma from '../config/database.js';

export const createProject = async ({ title, description, userId }) => {
  return prisma.project.create({
    data: {
      title,
      description: description || null,
      userId,
    },
  });
};

export const listProjects = async (userId) => {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const findProjectForUser = async (projectId, userId, include = undefined) => {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include,
  });
};
