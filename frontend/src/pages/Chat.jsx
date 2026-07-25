import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import MarkdownMessage from '../components/MarkdownMessage.jsx';
import ProjectModal from '../components/ProjectModal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../lib/api.js';
import { getErrorMessage } from '../lib/error.js';
import { clearToken, getToken } from '../lib/session.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function parseStreamBlock(block) {
  const lines = block.replace(/\r/g, '').split('\n');
  let eventName = '';
  let dataText = '';
  for (const line of lines) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    if (line.startsWith('data:')) {
      const val = line.slice(5).trimStart();
      dataText = dataText ? `${dataText}\n${val}` : val;
    }
  }
  return { eventName, dataText };
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

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [activeChatId, setActiveChatId] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [error, setError] = useState('');

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) navigate('/');
  }, [navigate]);

  // ─── Load data when projectId changes ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        setMessages([]);
        setActiveChatId('');
        shouldAutoScrollRef.current = true;

        // always load projects list for sidebar
        const projRes = await api.get('/projects');
        const projectList = projRes.data.data || [];
        if (!cancelled) setProjects(projectList);

        if (!projectId) {
          if (!cancelled) setProjectTitle('');
          return;
        }

        const active = projectList.find((p) => p.id === projectId);
        if (!cancelled) setProjectTitle(active?.title || 'Project');

        // get or create the first chat for this project
        const chatsRes = await api.get(`/chat/project/${projectId}/chats`);
        let chats = chatsRes.data.data || [];

        let chat;
        if (chats.length === 0) {
          // auto-create a default chat
          const newChatRes = await api.post(`/chat/project/${projectId}/chats`, { title: 'Chat' });
          chat = newChatRes.data.data;
        } else {
          chat = chats[0];
        }

        if (cancelled) return;
        setActiveChatId(chat.id);

        // load messages for that chat
        const msgsRes = await api.get(`/chat/${chat.id}/messages`);
        if (!cancelled) setMessages(msgsRes.data.data || []);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) { clearToken(); navigate('/'); return; }
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
  }, [navigate, projectId]);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatStageRef.current || !shouldAutoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 180)}px`;
  }, [draft]);

  const handleScroll = () => {
    const node = chatStageRef.current;
    if (!node) return;
    const dist = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = dist < 120;
  };

  const handleLogout = () => { clearToken(); navigate('/'); };

  const openProject = (id) => {
    if (!id || id === projectId) return;
    navigate(`/chat/${id}`);
  };

  // ─── Create project ─────────────────────────────────────────────────────────
  const handleCreateProject = async (data) => {
    setSavingProject(true);
    setError('');
    try {
      const res = await api.post('/projects', data);
      const proj = res.data.data;
      setProjects((cur) => [proj, ...cur]);
      setShowProjectModal(false);
      navigate(`/chat/${proj.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProject(false);
    }
  };

  // ─── Send message ───────────────────────────────────────────────────────────
  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeChatId) return;

    const controller = new AbortController();
    streamAbortRef.current = controller;

    const tempAssistantId = `assistant-${Date.now()}`;
    let assistantText = '';
    let assistantDone = false;

    setDraft('');
    setError('');
    setSending(true);
    shouldAutoScrollRef.current = true;

    // show user message immediately
    setMessages((cur) => [...cur, { id: `user-${Date.now()}`, role: 'USER', content: text }]);

    try {
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ chatId: activeChatId, message: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const txt = await res.text();
        let msg = 'Stream failed';
        try { msg = JSON.parse(txt)?.message || msg; } catch { msg = txt || msg; }
        if (res.status === 401) { handleLogout(); return; }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          const { eventName, dataText } = parseStreamBlock(block);
          if (!eventName) continue;

          if (eventName === 'start') {
            // show typing placeholder
            setMessages((cur) => {
              if (cur.some((m) => m.id === tempAssistantId)) return cur;
              return [...cur, { id: tempAssistantId, role: 'ASSISTANT', content: '', streaming: true }];
            });
          }

          if (eventName === 'chunk') {
            const parsed = readJson(dataText);
            const chunk = parsed?.text || '';
            if (!chunk) continue;
            assistantText += chunk;
            setMessages((cur) => cur.map((m) =>
              m.id === tempAssistantId ? { ...m, content: assistantText, streaming: true } : m
            ));
          }

          if (eventName === 'done') {
            const parsed = readJson(dataText);
            const serverMsg = parsed?.message;
            const finalId = serverMsg?.id || tempAssistantId;
            const finalText = serverMsg?.content || assistantText;
            setMessages((cur) => cur.map((m) =>
              m.id === tempAssistantId ? { id: finalId, role: 'ASSISTANT', content: finalText, streaming: false } : m
            ));
            assistantDone = true;
          }

          if (eventName === 'error') {
            const parsed = readJson(dataText);
            throw new Error(parsed?.message || 'AI error');
          }
        }
      }

      if (!assistantDone && assistantText) {
        setMessages((cur) => cur.map((m) =>
          m.id === tempAssistantId ? { ...m, streaming: false } : m
        ));
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setMessages((cur) => cur.filter((m) => m.id !== tempAssistantId));
      setError(getErrorMessage(err));
    } finally {
      if (streamAbortRef.current === controller) streamAbortRef.current = null;
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderMessage = (msg) => {
    const isUser = msg.role === 'USER';
    return (
      <div key={msg.id} className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-assistant'}`}>
        {renderAvatar(msg.role)}
        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
          {isUser ? (
            <div className="msg-text-user">{msg.content}</div>
          ) : msg.streaming && !msg.content ? (
            <div className="typing-pill" aria-live="polite">
              <span>AI is responding</span>
              <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
            </div>
          ) : (
            <MarkdownMessage text={msg.content} />
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="welcome-state">
          <div className="loading-dots" aria-hidden="true"><span /><span /><span /></div>
          <p className="welcome-sub">Loading...</p>
        </div>
      );
    }
    if (!projectId) {
      return (
        <div className="welcome-state">
          <div className="welcome-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="welcome-title">Create or select a project to start.</h2>
          <p className="welcome-sub">Your projects live in the sidebar.</p>
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

  // ─── JSX ────────────────────────────────────────────────────────────────────
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
              <span className="topbar-project-name">
                {projectId ? projectTitle : 'Projects'}
              </span>
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
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message"
                    rows="1"
                    aria-label="Message input"
                  />
                  <div className="composer-actions">
                    <p className="composer-help">Enter to send · Shift+Enter for new line</p>
                    <button
                      className="send-btn"
                      type="submit"
                      disabled={sending || !draft.trim()}
                      aria-label="Send message"
                    >
                      {sending ? 'Sending...' : 'Send'}
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
        subtitle="Give your agent a name and a system prompt."
        submitLabel={savingProject ? 'Creating...' : 'Create'}
        saving={savingProject}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
