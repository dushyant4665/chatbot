import express from 'express';

import { createProject, deleteProject, getProjects } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createProjectSchema } from '../validator/projectValidators.js';

const router = express.Router();

router.get('/', protect, getProjects);
router.post('/', protect, validateBody(createProjectSchema), createProject);
router.delete('/:projectId', protect, deleteProject);

export default router;