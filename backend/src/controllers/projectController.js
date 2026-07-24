import prisma from '../config/database.js';

export const createProject = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { title, description } = req.body;

    const project = await prisma.project.create({
      data: { title, description, userId }
    });

    res.status(201).json({ status: 'success', data: project });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ status: 'success', data: projects });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;

    // Make sure project belongs to this user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Rely on Cascade delete for associated chats and messages

    await prisma.project.delete({ where: { id: projectId } });

    res.status(200).json({ status: 'success', message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};
