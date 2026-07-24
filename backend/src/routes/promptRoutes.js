import express from 'express';

import { createPrompt, getProjectPrompts } from '../controllers/promptController.js';
import { protect } from '../middleware/auth.js';
import { validate, validateBody } from '../middleware/validate.js';
import { createPromptSchema, listProjectPromptsSchema } from '../validator/promptValidators.js';

const router = express.Router();

router.get('/project/:projectId', protect, validate(listProjectPromptsSchema), getProjectPrompts);
router.post('/', protect, validateBody(createPromptSchema), createPrompt);

export default router;