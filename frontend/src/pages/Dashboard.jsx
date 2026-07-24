import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar.jsx';
import Modal from '../components/Modal.jsx';
import api from '../lib/api.js';
import { getErrorMessage } from '../lib/error.js';
import { clearToken, getToken } from '../lib/session.js';

// ── Icons ───────────────────────────────────────────────────
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!getToken()) {
      navigate('/');
      return;
    }

    let ignore = false;

    Promise.all([
      api.get('/projects'),
      api.get('/auth/me')
    ]).then(([projRes, meRes]) => {
      if (!ignore) {
        setProjects(projRes.data.data || []);
        setUserName(meRes.data.data?.name || '');
      }
    }).catch((err) => {
      if (!ignore) {
        if (err?.response?.status === 401) { clearToken(); navigate('/'); return; }
        setError(getErrorMessage(err));
      }
    }).finally(() => {
      if (!ignore) setLoading(false);
    });

    return () => { ignore = true; };
  }, [navigate]);

  const handleLogout = () => {
    clearToken();
    navigate('/');
  };

  const openProject = (id) => {
    if (id) navigate(`/chat/${id}`);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await api.post('/projects', { title });
      const newProject = res.data.data;
      setProjects((prev) => [newProject, ...prev]);
      setShowModal(false);
      setTitle('');
      navigate(`/chat/${newProject.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace">
      <Sidebar
        isOpen={sidebarOpen}
        projects={projects}
        onProjectClick={openProject}
        onNewProject={() => setShowModal(true)}
        onLogout={handleLogout}
        userName={userName}
      />

      <main className="main">
        <div className="main-topbar">
          <button className="panel-toggle" type="button" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <IconMenu />
          </button>
        </div>

        <div className="chat-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: '#fff', borderRadius: '16px', marginBottom: '24px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24"><path d="M4 4l16 16m0-16L4 20" stroke="black" strokeWidth="3" strokeLinecap="round" /></svg>
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '12px' }}>Welcome back.</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px' }}>
              Select a project from the sidebar to continue your work, or create a new one.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <button 
              style={{
                background: 'white',
                color: 'black',
                border: 'none',
                padding: '14px 24px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => setShowModal(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Start new project
            </button>
          </div>
          
        </div>
      </main>

      {showModal && (
        <Modal
          title="New project"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn-ghost" type="button" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-modal-primary" type="submit" form="create-project-form" disabled={saving}>
                {saving ? 'Creating...' : 'Create'}
              </button>
            </>
          }
        >
          <form id="create-project-form" onSubmit={handleCreate}>
            <label className="modal-label" htmlFor="proj-title">Project name</label>
            <input
              id="proj-title"
              className="modal-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Code refactor assistant"
              required
              autoFocus
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
