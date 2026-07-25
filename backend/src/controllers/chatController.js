import prisma from '../config/database.js';

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const createChat = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;
    const { title } = req.body;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const chat = await prisma.chat.create({
      data: { projectId, title: title || 'New Chat' }
    });

    res.status(201).json({ status: 'success', data: chat });
  } catch (error) {
    next(error);
  }
};

export const listChats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const chats = await prisma.chat.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    res.status(200).json({ status: 'success', data: chats });
  } catch (error) {
    next(error);
  }
};

export const deleteChat = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, project: { userId } }
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    await prisma.chatMessage.deleteMany({ where: { chatId } });
    await prisma.chat.delete({ where: { id: chatId } });

    res.status(200).json({ status: 'success', message: 'Chat deleted' });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, project: { userId } }
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

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
  const userId = req.user.userId;

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, project: { userId } }
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const userMessage = await prisma.chatMessage.create({
      data: { role: 'USER', content: message, chatId }
    });
    sse(res, 'start', { message: userMessage });

    const history = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 15
    });

    const aiMessages = history.map(m => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content
    }));

    const systemPrompt = await prisma.prompt.findFirst({
      where: { projectId: chat.projectId },
      orderBy: { createdAt: 'desc' }
    });
    aiMessages.unshift({
      role: 'system',
      content: systemPrompt?.content || 'You are a helpful AI assistant. Always format your responses using clean Markdown. Use numbered lists, bullet points, and bold text to structure your answers clearly.'
    });

    const apiKey = process.env.COMET_API_KEY || process.env.GROQ_API_KEY;
    const isGroq = apiKey?.startsWith('gsk_');
    const baseUrl = isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.cometapi.com/v1';
    const model = isGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages: aiMessages, stream: true })
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      sse(res, 'error', { message: err.error?.message || 'AI API Error' });
      return res.end();
    }

    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        for (const line of event.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const payload = JSON.parse(dataStr);
            const text = payload.choices?.[0]?.delta?.content || '';
            if (text) {
              fullResponse += text;
              sse(res, 'chunk', { text });
            }
          } catch { error}
        }
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

    sse(res, 'done', { message: assistantMessage });
    res.end();

  } catch (error) {
    if (!res.headersSent) return next(error);
    sse(res, 'error', { message: 'Something went wrong' });
    res.end();
  }
};
