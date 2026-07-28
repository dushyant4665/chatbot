import prisma from "../config/database.js";

export const createProject = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { title, description } = req.body;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        userId,
      },
    });

    if (description?.trim()) {
      await prisma.prompt.create({
        data: {
          title: "System Prompt",
          content: description.trim(),
          projectId: project.id,
        },
      });
    }

    res.status(201).json({
      status: "success",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Project deleted",
    });
  } catch (error) {
    next(error);
  }
};