import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import MarkdownMessage from '../components/MarkdownMessage.jsx';
import ProjectModal from '../components/ProjectModal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../lib/api.js';
import { getErrorMessage } from '../lib/error.js';
import { clearToken, getToken } from '../lib/session.js';

function readJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseStreamBlock(block) {
  const lines = block.replace(/\r/g, '').split('\n');
  let eventName = '';
  let dataText = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    }

    if (line.startsWith('data:')) {
      const value = line.slice(5).trimStart();
      dataText = dataText ? `${dataText}\n${value}` : value;
    }
  }

  return { eventName, dataText };
}

function upsertAssistantMessage(messages, assistantId, content, finalId) {
  const messageId = finalId || assistantId;
  const index = messages.findIndex((item) => item.id === assistantId || item.id === messageId);
  const nextMessage = {
    id: messageId,
    role: 'ASSISTANT',
    content,
    streaming: false,
  };

  if (index === -1) {
    return [...messages, nextMessage];
  }

  const nextMessages = [...messages];
  nextMessages[index] = nextMessage;
  return nextMessages;
}

function removeAssistantMessage(messages, assistantId) {
  return messages.filter((item) => item.id !== assistantId);
}

// Avatars removed for clean ChatGPT-like layout

export default function Chat({ simpleMode = false }) {
  const { chatId = '' } = useParams();
  const navigate = useNavigate();
  const chatStageRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const streamAbortRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const [projects, setProjects] = useState([]);
  const [chats, setChats] = useState([]);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const saved = sessionStorage.getItem('sidebar-open');
    return saved === null ? true : saved === '1';
  });

  const activeChat = chats.find((chat) => chat.id === chatId);
  const activeProject = activeChat?.projectId ? projects.find((project) => project.id === activeChat.projectId) : null;

  useEffect(() => {
    if (!getToken()) {
      navigate('/');
      return;
    }

    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [meRes, projectsRes, chatsRes] = await Promise.all([
          api.get('/auth/me').catch(() => null),
          api.get('/projects'),
          api.get('/chat'),
        ]);

        if (ignore) {
          return;
        }

        const allChats = chatsRes.data.data || [];
        const currentChat = chatId ? allChats.find((chat) => chat.id === chatId) : null;

        if (currentChat) {
          if (simpleMode && currentChat.projectId) {
            navigate(`/chat/${chatId}`, { replace: true });
            return;
          }

          if (!simpleMode && !currentChat.projectId) {
            navigate(`/simple-chat/${chatId}`, { replace: true });
            return;
          }
        }

        if (meRes?.data?.data?.name) {
          setUserName(meRes.data.data.name);
        }

        setProjects(projectsRes.data.data || []);
        setChats(allChats);

        if (chatId) {
          const messageRes = await api.get(`/chat/${chatId}/messages`);
          if (ignore) {
            return;
          }

          setMessages(messageRes.data.data || []);
        } else {
          setMessages([]);
        }
      } catch (err) {
        if (ignore) {
          return;
        }

        if (err?.response?.status === 401) {
          handleLogout();
          return;
        }

        setError(getErrorMessage(err));
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
      streamAbortRef.current?.abort();
    };
  }, [navigate, chatId, simpleMode]);

  useEffect(() => {
    const node = chatStageRef.current;
    if (!node || !shouldAutoScrollRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    sessionStorage.setItem('sidebar-open', isSidebarOpen ? '1' : '0');
  }, [isSidebarOpen]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }

    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [draft]);

  const handleScroll = () => {
    const node = chatStageRef.current;
    if (!node) {
      return;
    }

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((current) => !current);
  };

  const handleLogout = () => {
    clearToken();
    navigate('/');
  };

  const handleNewChat = async () => {
    try {
      const response = await api.post('/chat', { title: 'New Chat' });
      const newChat = response.data.data;

      setChats((current) => [newChat, ...current]);
      navigate(`/simple-chat/${newChat.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleNewProjectChat = async (projectId) => {
    try {
      const response = await api.post('/chat', { projectId, title: 'New Chat' });
      const newChat = response.data.data;
      setChats((current) => [newChat, ...current]);
      navigate(`/chat/${newChat.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreateProject = async (data) => {
    setSavingProject(true);
    setError('');

    try {
      const response = await api.post('/projects', data);
      const newProject = response.data.data;
      setProjects((current) => [newProject, ...current]);
      setShowProjectModal(false);
      handleNewProjectChat(newProject.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteChat = async (id) => {
    if (!window.confirm('Delete this chat?')) {
      return;
    }

    try {
      await api.delete(`/chat/${id}`);
      setChats((current) => current.filter((chat) => chat.id !== id));

      if (chatId === id) {
        navigate(simpleMode ? '/simple-chat' : '/home');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project and all its chats?')) {
      return;
    }

    try {
      await api.delete(`/projects/${id}`);
      setProjects((current) => current.filter((project) => project.id !== id));
      setChats((current) => current.filter((chat) => chat.projectId !== id));

      if (activeProject?.id === id) {
        navigate('/home');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateAssistantText = (assistantId, content, finalId) => {
    setMessages((current) => upsertAssistantMessage(current, assistantId, content, finalId));
  };

  const addAssistantPlaceholder = (assistantId) => {
    setMessages((current) => {
      if (current.some((item) => item.id === assistantId)) {
        return current;
      }

      return [...current, { id: assistantId, role: 'ASSISTANT', content: '', streaming: true }];
    });
  };

  const handleSend = async (event) => {
    event.preventDefault();

    const messageText = draft.trim();
    if (!messageText || sending) {
      return;
    }

    let targetChatId = chatId;

    if (!targetChatId) {
      try {
        const response = await api.post('/chat', { title: messageText.slice(0, 40) });
        const newChat = response.data.data;
        setChats((current) => [newChat, ...current]);
        targetChatId = newChat.id;
        window.history.pushState(null, '', `/simple-chat/${targetChatId}`);
      } catch (err) {
        setError(getErrorMessage(err));
        return;
      }
    }

    const controller = new AbortController();
    streamAbortRef.current = controller;
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    let assistantText = '';
    let assistantDone = false;

    setDraft('');
    setError('');
    setSending(true);
    shouldAutoScrollRef.current = true;
    setMessages((current) => [...current, { id: userMessageId, role: 'USER', content: messageText }]);

    try {
      const base = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${base}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ chatId: targetChatId, message: messageText }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed) {
            continue;
          }

          const { eventName, dataText } = parseStreamBlock(trimmed);
          if (!eventName) {
            continue;
          }

          if (eventName === 'start') {
            addAssistantPlaceholder(assistantMessageId);
          } else if (eventName === 'chunk') {
            const parsed = readJson(dataText);
            const chunkText = parsed?.text || '';
            if (chunkText) {
              // Add slight delay for typing effect
              await new Promise(resolve => setTimeout(resolve, 20));
              assistantText += chunkText;
              addAssistantPlaceholder(assistantMessageId);
              updateAssistantText(assistantMessageId, assistantText, assistantMessageId);
            }
          } else if (eventName === 'done') {
            const parsed = readJson(dataText);
            const serverMessage = parsed?.message;
            const finalText = serverMessage?.content || assistantText;
            const finalId = serverMessage?.id || assistantMessageId;
            updateAssistantText(assistantMessageId, finalText || '', finalId);
            assistantDone = true;
          } else if (eventName === 'error') {
            const parsed = readJson(dataText);
            throw new Error(parsed?.message || 'AI error');
          }
        }
      }

      if (!assistantDone && assistantText) {
        updateAssistantText(assistantMessageId, assistantText, assistantMessageId);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setMessages((current) => removeAssistantMessage(current, assistantMessageId));
        setError(getErrorMessage(err));
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }

      setSending(false);

      if (!chatId && targetChatId) {
        navigate(`/simple-chat/${targetChatId}`);
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'USER';

    return (
      <div key={message.id} className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-assistant'}`}>
        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
          {isUser ? (
            <div className="msg-text-user">{message.content}</div>
          ) : (
            <MarkdownMessage text={message.content || '...'} />
          )}
        </div>
      </div>
    );
  };

  const topbarLabel = simpleMode
    ? (activeChat?.title || 'Simple Chat')
    : (activeProject ? `Agent: ${activeProject.title}` : 'Project Chat');

  const welcomeSubText = simpleMode
    ? 'Start a direct conversation.'
    : (activeProject ? `Chatting with Agent: ${activeProject.title}` : 'Open a project to begin chatting.');

  return (
    <>
      <div className="workspace">
        <div 
          className={`sidebar-backdrop ${isSidebarOpen ? 'active' : ''}`}
          onClick={handleToggleSidebar}
          aria-hidden="true"
        />
        
        <Sidebar
          projects={projects}
          chats={chats}
          activeChatId={chatId}
          activeProjectId={activeProject?.id}
          onChatClick={(id, projectId) => navigate(projectId ? `/chat/${id}` : `/simple-chat/${id}`)}
          onNewChat={handleNewChat}
          onNewProjectChat={handleNewProjectChat}
          onNewProject={() => setShowProjectModal(true)}
          onDeleteChat={handleDeleteChat}
          onDeleteProject={handleDeleteProject}
          onLogout={handleLogout}
          userName={userName}
          isOpen={isSidebarOpen}
        />

        <main className="main">
          <div className="main-topbar">
            <div className="topbar-left">
              <button className="topbar-btn sidebar-toggle-btn" type="button" onClick={handleToggleSidebar} aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </svg>
              </button>
              <span className="topbar-project-name">{topbarLabel}</span>
            </div>
          </div>

          <div className="chat-main" ref={chatStageRef} onScroll={handleScroll}>
            <div className="chat-inner">
              {error && <div className="error-bar">{error}</div>}

              {loading ? (
                <div className="welcome-state">
                  <div className="loading-dots" aria-hidden="true"><span /><span /><span /></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="welcome-state">
                  <div className="welcome-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h2 className="welcome-title">How can I help today?</h2>
                  <p className="welcome-sub">{welcomeSubText}</p>
                </div>
              ) : (
                <div className="chat-list">{messages.map(renderMessage)}</div>
              )}
              <div ref={bottomRef} style={{ height: '24px' }} />
            </div>
          </div>

          <footer className="composer-wrap">
            <div className="composer-inner">
              <form className="composer-box" onSubmit={handleSend}>
                <div className="composer-row">
                  <textarea
                    ref={textareaRef}
                    className="composer-textarea"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    rows="1"
                  />
                </div>
                <div className="composer-actions">
                  <p className="composer-help">Enter to send · Shift + Enter for new line</p>
                  <button className="send-btn" type="submit" disabled={sending || !draft.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </footer>
        </main>
      </div>

      <ProjectModal
        open={showProjectModal}
        title="Create New Agent"
        subtitle="Give your agent a name and description."
        submitLabel={savingProject ? 'Creating...' : 'Create'}
        saving={savingProject}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}

