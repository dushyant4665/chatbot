import express from 'express';
import { createChat, deleteChat, getMessages, listChats, sendMessageStream } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Chats inside a project
router.get('/project/:projectId/chats', listChats);
router.post('/project/:projectId/chats', createChat);

// Individual chat
router.get('/:chatId/messages', getMessages);
router.delete('/:chatId', deleteChat);

// Stream
router.post('/stream', sendMessageStream);

export default router;