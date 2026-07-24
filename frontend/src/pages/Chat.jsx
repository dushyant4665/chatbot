import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

import MarkdownMessage from '../components/MarkdownMessage.jsx';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../lib/api.js';
import { getErrorMessage } from '../lib/error.js';
import { clearToken, getToken } from '../lib/session.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── Icons ────────────────────────────────────────────────────
const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconStop = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

const IconPaperclip = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Main ─────────────────────────────────────────────────────
export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const bottomRef = useRef(null);
  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  const typingQueueRef = useRef('');
  const typingTimerRef = useRef(null);
  const userScrolledUpRef = useRef(false); // smart scroll

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]); // [{id, title, chats:[]}]
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);

  // Modal state
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  const activeChat = projects.flatMap(p => p.chats || []).find(c => c.id === chatId);
  const activeProject = chatId ? projects.find(p => p.chats?.some(c => c.id === chatId)) : null;

  // ─── Load projects + chats ────────────────────────────────
  const loadProjects = useCallback(async () => {
    try {
      const [projRes, meRes] = await Promise.all([
        api.get('/projects'),
        api.get('/auth/me'),
      ]);
      const rawProjects = projRes.data.data || [];
      setUserName(meRes.data.data?.name || '');

      // Load chats for each project
      const projectsWithChats = await Promise.all(
        rawProjects.map(async (p) => {
          const chatRes = await api.get(`/chat/project/${p.id}/chats`);
          return { ...p, chats: chatRes.data.data || [] };
        })
      );
      setProjects(projectsWithChats);
      return projectsWithChats;
    } catch (err) {
      if (err?.response?.status === 401) { handleLogout(); }
      return [];
    }
  }, []);

  // ─── Load messages for active chat ───────────────────────
  const loadMessages = useCallback(async (id) => {
    if (!id) { setMessages([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/chat/${id}/messages`);
      setMessages(res.data.data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) { navigate('/'); return; }
    loadProjects().then(projs => {
      // If no chatId in URL but there are chats, go to first chat
      if (!chatId && projs.length > 0) {
        const firstChat = projs[0]?.chats?.[0];
        if (firstChat) navigate(`/chat/${firstChat.id}`, { replace: true });
      }
    });
  }, []);

  useEffect(() => {
    loadMessages(chatId);
    setStreamingText('');
    typingQueueRef.current = '';
    userScrolledUpRef.current = false;
  }, [chatId]);

  // ─── Smart scroll ─────────────────────────────────────────
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distFromBottom > 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingText]);

  // ─── Auto-resize textarea ─────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 280) + 'px';
  }, [draft]);

  // ─── Typing drip (ChatGPT speed ~10ms per char) ───────────
  const startDrip = () => {
    if (typingTimerRef.current) return;
    typingTimerRef.current = setInterval(() => {
      if (!typingQueueRef.current.length) return;
      // Release 2 chars per tick for ChatGPT-like speed
      const chunk = typingQueueRef.current.slice(0, 2);
      typingQueueRef.current = typingQueueRef.current.slice(2);
      setStreamingText(prev => prev + chunk);
    }, 10);
  };

  const stopDrip = () => {
    clearInterval(typingTimerRef.current);
    typingTimerRef.current = null;
  };

  const waitForQueue = () => new Promise(resolve => {
    const check = setInterval(() => {
      if (!typingQueueRef.current.length) { clearInterval(check); resolve(); }
    }, 15);
  });

  // ─── File handler ─────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading state if needed (or just let it block briefly, usually fast)
    try {
      let content = '';
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          content += textContent.items.map(item => item.str).join(' ') + '\n';
        }
      } else if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else {
        // Plain text fallback
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      setAttachedFile({ name: file.name, content: content || 'No readable text found.' });
    } catch (err) {
      setError('Could not read file: ' + err.message);
    }

    e.target.value = '';
  };

  // ─── Send message ─────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if ((!text && !attachedFile) || sending || !chatId) return;

    let userMessageText = text;
    if (attachedFile) {
      userMessageText = `${text}\n\n[File: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content.slice(0, 8000)}\n\`\`\``;
    }

    setDraft('');
    setAttachedFile(null);
    setStreamingText('');
    typingQueueRef.current = '';
    setSending(true);
    setError('');
    userScrolledUpRef.current = false;

    setMessages(prev => [...prev, { role: 'USER', content: userMessageText }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ chatId, message: userMessageText }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let savedByServer = false;

      startDrip();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          const eventLine = lines.find(l => l.startsWith('event: '));
          const dataLine = lines.find(l => l.startsWith('data: '));
          if (!dataLine) continue;

          const eventName = eventLine?.slice(7).trim() || '';
          const raw = dataLine.slice(6);
          if (raw === '[DONE]') continue;

          let parsed;
          try { parsed = JSON.parse(raw); } catch { continue; }

          if (eventName === 'chunk' && parsed.text) {
            fullResponse += parsed.text;
            typingQueueRef.current += parsed.text;
          }

          if (eventName === 'done' && parsed.message) {
            savedByServer = true;
            await waitForQueue();
            stopDrip();
            setStreamingText('');
            setMessages(prev => [...prev, {
              id: parsed.message.id,
              role: 'ASSISTANT',
              content: parsed.message.content || fullResponse,
            }]);
            // Refresh sidebar to update chat title
            loadProjects();
          }

          if (eventName === 'error') throw new Error(parsed.message || 'AI error');
        }
      }

      if (!savedByServer && fullResponse) {
        await waitForQueue();
        stopDrip();
        setStreamingText('');
        setMessages(prev => [...prev, { role: 'ASSISTANT', content: fullResponse }]);
      }
    } catch (err) {
      stopDrip();
      typingQueueRef.current = '';
      if (err.name !== 'AbortError') {
        setError(getErrorMessage(err));
      }
    } finally {
      stopDrip();
      typingQueueRef.current = '';
      setSending(false);
      setStreamingText('');
      abortRef.current = null;
    }
  };

  const handleStop = () => abortRef.current?.abort();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleLogout = () => { clearToken(); navigate('/'); };

  // ─── Project / Chat CRUD ──────────────────────────────────
  const handleNewProject = async (e) => {
    e.preventDefault();
    setSavingProject(true);
    try {
      const res = await api.post('/projects', { title: newProjectTitle });
      const proj = { ...res.data.data, chats: [] };
      setProjects(prev => [proj, ...prev]);
      setShowNewProject(false);
      setNewProjectTitle('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProject(false);
    }
  };

  const handleNewChat = async (projectId) => {
    try {
      const res = await api.post(`/chat/project/${projectId}/chats`, { title: 'New Chat' });
      const chat = res.data.data;
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, chats: [chat, ...(p.chats || [])] } : p
      ));
      navigate(`/chat/${chat.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await api.delete(`/chat/${id}`);
      setProjects(prev => prev.map(p => ({
        ...p, chats: (p.chats || []).filter(c => c.id !== id)
      })));
      if (id === chatId) {
        // Go to another chat or home
        const allChats = projects.flatMap(p => p.chats || []).filter(c => c.id !== id);
        navigate(allChats.length ? `/chat/${allChats[0].id}` : '/home');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete project and all its chats?')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      const proj = projects.find(p => p.id === projectId);
      const hadActiveChat = proj?.chats?.some(c => c.id === chatId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (hadActiveChat) {
        const remaining = projects.filter(p => p.id !== projectId).flatMap(p => p.chats || []);
        navigate(remaining.length ? `/chat/${remaining[0].id}` : '/home');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="workspace">
      <Sidebar
        isOpen={sidebarOpen}
        projects={projects}
        activeChatId={chatId}
        onChatClick={id => navigate(`/chat/${id}`)}
        onNewChat={handleNewChat}
        onNewProject={() => setShowNewProject(true)}
        onDeleteChat={handleDeleteChat}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
        userName={userName}
        onToggle={() => setSidebarOpen(v => !v)}
      />

      <main className="main">
        {/* Topbar */}
        <div className="main-topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button className="topbar-btn" type="button" onClick={() => setSidebarOpen(true)}>
                <IconMenu />
              </button>
            )}
            {activeChat && (
              <span className="topbar-project-name">
                {activeProject?.title && `${activeProject.title} / `}{activeChat.title}
              </span>
            )}
          </div>
          {chatId && (
            <div className="topbar-right">
              <button
                className="topbar-btn"
                type="button"
                title="New chat in this project"
                onClick={() => activeProject && handleNewChat(activeProject.id)}
                disabled={!activeProject}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="chat-main" ref={chatScrollRef}>
          <div className="chat-inner">
            {error && <div className="error-bar">{error}</div>}

            {!chatId ? (
              <div className="welcome-state">
                <div className="welcome-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 4l16 16m0-16L4 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="welcome-title">Welcome to AI Chat</h2>
                <p className="welcome-sub">Create a project and start a new chat to begin.</p>
              </div>
            ) : loading ? (
              <div className="welcome-state">
                <div className="loading-dots"><span /><span /><span /></div>
              </div>
            ) : messages.length === 0 && !streamingText && !sending ? (
              <div className="welcome-state">
                <div className="welcome-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 4l16 16m0-16L4 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="welcome-title">Ask anything</h2>
                <p className="welcome-sub">Type a message or attach a file below.</p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'USER';
                  return (
                    <div key={msg.id || i} className="msg-row">
                      <div className={`msg-avatar ${isUser ? 'msg-avatar-user' : 'msg-avatar-ai'}`}>
                        {isUser
                          ? (userName ? userName.charAt(0).toUpperCase() : 'U')
                          : <svg viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16m0-16L4 20" stroke="black" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        }
                      </div>
                      <div className="msg-content">
                        {isUser
                          ? <div className="msg-text-user">{msg.content}</div>
                          : <MarkdownMessage text={msg.content} />
                        }
                      </div>
                    </div>
                  );
                })}

                {(streamingText || (sending && !streamingText)) && (
                  <div className="msg-row">
                    <div className="msg-avatar msg-avatar-ai">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16m0-16L4 20" stroke="black" strokeWidth="2.5" strokeLinecap="round" /></svg>
                    </div>
                    <div className="msg-content">
                      {streamingText
                        ? <MarkdownMessage text={streamingText} />
                        : <div className="loading-dots"><span /><span /><span /></div>
                      }
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} style={{ height: '24px' }} />
          </div>
        </div>

        {/* Composer */}
        {chatId && (
          <div className="composer-wrap">
            <div className="composer-inner">
              <div className="composer-box">
                {attachedFile && (
                  <div className="composer-file-preview">
                    <div className="file-preview-chip">
                      <IconFile />
                      <span className="file-preview-name">{attachedFile.name}</span>
                      <button className="file-remove-btn" type="button" onClick={() => setAttachedFile(null)}>
                        <IconX />
                      </button>
                    </div>
                  </div>
                )}
                <div className="composer-row">
                  <button className="composer-attach-btn" type="button" title="Attach file" onClick={() => fileInputRef.current?.click()}>
                    <IconPaperclip />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.js,.jsx,.ts,.tsx,.py,.json,.csv,.html,.css,.java,.go,.sh,.yaml,.yml,.xml,.sql"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <textarea
                    ref={textareaRef}
                    className="composer-textarea"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message AI Chat"
                    rows={1}
                    disabled={sending}
                  />
                </div>
                <div className="composer-actions">
                  {sending
                    ? <button className="send-btn stop-btn" type="button" onClick={handleStop}><IconStop /></button>
                    : <button className="send-btn" type="button" onClick={handleSend} disabled={!draft.trim() && !attachedFile}><IconSend /></button>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProject && (
        <Modal
          title="New Project"
          onClose={() => setShowNewProject(false)}
          footer={
            <>
              <button className="btn-ghost" type="button" onClick={() => setShowNewProject(false)}>Cancel</button>
              <button className="btn-modal-primary" type="submit" form="new-proj-form" disabled={savingProject}>
                {savingProject ? 'Creating…' : 'Create'}
              </button>
            </>
          }
        >
          <form id="new-proj-form" onSubmit={handleNewProject}>
            <label className="modal-label" htmlFor="new-proj-input">Project name</label>
            <input
              id="new-proj-input"
              className="modal-input"
              type="text"
              value={newProjectTitle}
              onChange={e => setNewProjectTitle(e.target.value)}
              placeholder="e.g. My Workspace"
              required
              autoFocus
            />
          </form>
        </Modal>
      )}
    </div>
  );
}