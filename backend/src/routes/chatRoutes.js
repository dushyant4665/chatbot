import express from 'express';
import { createChat, deleteChat, getMessages, listChats, sendMessageStream } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', listChats);
router.post('/', createChat);

router.get('/:chatId/messages', getMessages);
router.delete('/:chatId', deleteChat);

router.post('/stream', sendMessageStream);

export default router;