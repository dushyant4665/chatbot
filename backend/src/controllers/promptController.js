import prisma from '../config/database.js';

export const createPrompt = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { title, content, projectId } = req.body;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const prompt = await prisma.prompt.create({
      data: { title, content, projectId }
    });

    res.status(201).json({ status: 'success', data: prompt });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getProjectPrompts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const prompts = await prisma.prompt.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ status: 'success', data: prompts });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};