import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import promptRoutes from './routes/promptRoutes.js';
import chatRoutes from './routes/chatRoutes.js';  // <-- Yeh line add karo

import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'server is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/chat', chatRoutes); 

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'route not found'
  });
});

app.use(errorHandler);

export default app;