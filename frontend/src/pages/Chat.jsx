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

function renderAvatar(role) {
  if (role === 'USER') {
    return <div className="msg-avatar msg-avatar-user">U</div>;
  }

  return (
    <div className="msg-avatar msg-avatar-ai" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 6.9L21 12l-6.6 3.1L12 22l-2.4-6.9L3 12l6.6-3.1z" />
      </svg>
    </div>
  );
}

export default function Chat() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const chatStageRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const streamAbortRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [projectTitle, setProjectTitle] = useState('Conversation');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      navigate('/');
      return;
    }

    let ignore = false;

    const loadChat = async () => {
      try {
        setLoading(true);
        setError('');
        shouldAutoScrollRef.current = true;

        const projectsResponse = await api.get('/projects');
        const projectList = projectsResponse.data.data || [];

        if (ignore) {
          return;
        }

        setProjects(projectList);

        const activeProject = projectList.find((item) => item.id === projectId);
        setProjectTitle(activeProject?.title || 'Conversation');

        if (!projectId) {
          setMessages([]);
          return;
        }

        const messagesResponse = await api.get(`/chat/project/${projectId}`);

        if (ignore) {
          return;
        }

        setMessages(messagesResponse.data.data || []);
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

    loadChat();

    return () => {
      ignore = true;
      streamAbortRef.current?.abort();
    };
  }, [navigate, projectId]);

  useEffect(() => {
    const node = chatStageRef.current;

    if (!node || !shouldAutoScrollRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const node = textareaRef.current;

    if (!node) {
      return;
    }

    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 180)}px`;
  }, [draft]);

  const handleScroll = () => {
    const node = chatStageRef.current;

    if (!node) {
      return;
    }

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  };

  const handleLogout = () => {
    clearToken();
    navigate('/');
  };

  const openProject = (id) => {
    if (!id || id === projectId) {
      return;
    }

    navigate(`/chat/${id}`);
  };

  const handleCreateProject = async (data) => {
    setSavingProject(true);
    setError('');

    try {
      const response = await api.post('/projects', data);
      const newProject = response.data.data;

      setProjects((current) => [newProject, ...current]);
      setShowProjectModal(false);
      navigate(`/chat/${newProject.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProject(false);
    }
  };

  const updateAssistantText = (assistantId, content, finalId) => {
    setMessages((current) => upsertAssistantMessage(current, assistantId, content, finalId));
  };

  const addAssistantPlaceholder = (assistantId) => {
    setMessages((current) => {
      const exists = current.some((item) => item.id === assistantId);

      if (exists) {
        return current;
      }

      return [...current, { id: assistantId, role: 'ASSISTANT', content: '', streaming: true }];
    });
  };

  const handleSend = async (event) => {
    event.preventDefault();

    const messageText = draft.trim();

    if (!messageText || sending || !projectId) {
      return;
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

    setMessages((current) => [
      ...current,
      { id: userMessageId, role: 'USER', content: messageText },
    ]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          projectId,
          message: messageText,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        let message = 'stream failed';

        if (text) {
          try {
            const parsed = JSON.parse(text);
            message = parsed.message || message;
          } catch {
            message = text;
          }
        }

        if (response.status === 401 && message.toLowerCase().includes('token')) {
          handleLogout();
          return;
        }

        throw new Error(message);
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
            continue;
          }

          if (eventName === 'chunk') {
            const parsed = readJson(dataText);
            const chunkText = parsed?.text || '';

            if (!chunkText) {
              continue;
            }

            assistantText += chunkText;
            addAssistantPlaceholder(assistantMessageId);
            updateAssistantText(assistantMessageId, assistantText, assistantMessageId);
            continue;
          }

          if (eventName === 'done') {
            const parsed = readJson(dataText);
            const serverMessage = parsed?.message;
            const finalText = serverMessage?.content || assistantText;
            const finalId = serverMessage?.id || assistantMessageId;

            if (!assistantText && !serverMessage) {
              updateAssistantText(assistantMessageId, '', finalId);
            } else {
              updateAssistantText(assistantMessageId, finalText, finalId);
            }

            assistantDone = true;
            continue;
          }

          if (eventName === 'error') {
            const parsed = readJson(dataText);
            throw new Error(parsed?.message || 'AI is unavailable right now');
          }
        }
      }

      if (!assistantDone && assistantText) {
        updateAssistantText(assistantMessageId, assistantText, assistantMessageId);
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return;
      }

      setMessages((current) => removeAssistantMessage(current, assistantMessageId));
      setError(getErrorMessage(err));
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }

      setSending(false);
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
    const isStreaming = Boolean(message.streaming);

    return (
      <div key={message.id} className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-assistant'}`}>
        {renderAvatar(message.role)}

        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
          {isUser ? (
            <div className="msg-text-user">{message.content}</div>
          ) : isStreaming && !message.content ? (
            <div className="typing-pill" aria-live="polite">
              <span>AI is responding</span>
              <span className="typing-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : (
            <MarkdownMessage text={message.content} />
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="welcome-state">
          <div className="loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="welcome-sub">Loading conversation...</p>
        </div>
      );
    }

    if (!projectId) {
      return (
        <div className="welcome-state">
          <div className="welcome-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l16 16" />
              <path d="M20 4L4 20" />
            </svg>
          </div>
          <h2 className="welcome-title">Create or open a project to start chatting.</h2>
          <p className="welcome-sub">Your projects stay in the sidebar.</p>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="welcome-state">
          <div className="welcome-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="welcome-title">How can I help today?</h2>
          <p className="welcome-sub">Send a message to start the conversation.</p>
        </div>
      );
    }

    return <div className="chat-list">{messages.map(renderMessage)}</div>;
  };

  return (
    <>
      <div className="workspace">
        <Sidebar
          projects={projects}
          activeProjectId={projectId}
          onProjectClick={openProject}
          onNewProject={() => setShowProjectModal(true)}
          onLogout={handleLogout}
        />

        <main className="main">
          <div className="main-topbar">
            <div className="topbar-left">
              <span className="topbar-project-name">{projectId ? projectTitle : 'Projects'}</span>
            </div>
          </div>

          <div className="chat-main" ref={chatStageRef} onScroll={handleScroll}>
            <div className="chat-inner">
              {error ? <div className="error-bar">{error}</div> : null}
              {renderContent()}
              <div ref={bottomRef} style={{ height: '24px' }} />
            </div>
          </div>

          {projectId ? (
            <footer className="composer-wrap">
              <div className="composer-inner">
                <form className="composer-box" onSubmit={handleSend}>
                  <textarea
                    ref={textareaRef}
                    className="composer-textarea"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message"
                    rows="1"
                    aria-label="Message input"
                  />

                  <div className="composer-actions">
                    <p className="composer-help">Enter to send, Shift + Enter for a new line.</p>
                    <button className="send-btn" type="submit" disabled={sending || !draft.trim()} aria-label="Send message">
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </footer>
          ) : null}
        </main>
      </div>

      <ProjectModal
        open={showProjectModal}
        title="New Project"
        subtitle="Create a clean space for one conversation."
        submitLabel={savingProject ? 'Creating...' : 'Create'}
        saving={savingProject}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
