import prisma from '../config/database.js';

function sendEvent(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const createChat = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { projectId, title } = req.body;

    if (projectId) {
      const project = await prisma.project.findFirst({ 
        where: { id: projectId, userId } 
      });
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found' });
      }
    }

    const chat = await prisma.chat.create({
      data: { 
        userId,
        projectId: projectId || null, 
        title: title || 'New Chat' 
      }
    });

    res.status(201).json({ status: 'success', data: chat });
  } catch (error) {
    next(error);
  }
};

export const listChats = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { 
          orderBy: { createdAt: 'desc' }, 
          take: 1 
        }
      }
    });

    res.status(200).json({ status: 'success', data: chats });
  } catch (error) {
    next(error);
  }
};

export const deleteChat = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { chatId } = req.params;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ status: 'error', message: 'Chat not found' });
    }

    await prisma.chat.delete({ where: { id: chatId } });

    res.status(200).json({ status: 'success', message: 'Chat deleted' });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { chatId } = req.params;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ status: 'error', message: 'Chat not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    res.status(200).json({ status: 'success', data: messages });
  } catch (error) {
    next(error);
  }
};

export const sendMessageStream = async (req, res, next) => {
  const { chatId, message } = req.body;
  const { userId } = req.user;

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ status: 'error', message: 'Chat not found' });
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const userMessage = await prisma.chatMessage.create({
      data: { role: 'USER', content: message, chatId }
    });
    sendEvent(res, 'start', { message: userMessage });

    const history = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 15
    });

    const messages = history.map(msg => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content
    }));

    let systemPrompt = 'You are a helpful AI assistant. Always format your responses using clean Markdown.';
    if (chat.projectId) {
      const projectPrompt = await prisma.prompt.findFirst({
        where: { projectId: chat.projectId },
        orderBy: { createdAt: 'desc' }
      });
      if (projectPrompt?.content) systemPrompt = projectPrompt.content;
    }
    messages.unshift({ role: 'system', content: systemPrompt });

    const apiKey = process.env.COMET_API_KEY || process.env.GROQ_API_KEY;
    const isGroq = apiKey?.startsWith('gsk_') || false;
    const baseUrl = isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.cometapi.com/v1';
    const model = isGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, stream: true })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      sendEvent(res, 'error', { message: errorData.error?.message || 'AI API Error' });
      return res.end();
    }

    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const dataString = line.slice(5).trim();
        if (dataString === '[DONE]') continue;

        try {
          const data = JSON.parse(dataString);
          const content = data.choices?.[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            sendEvent(res, 'chunk', { text: content });
          }
        } catch {}
      }
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: { role: 'ASSISTANT', content: fullResponse, chatId }
    });

    if (chat.title === 'New Chat' && message.length > 0) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: message.slice(0, 40) }
      });
    }

    sendEvent(res, 'done', { message: assistantMessage });
    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) return next(error);
    sendEvent(res, 'error', { message: 'Something went wrong' });
    res.end();
  }
};