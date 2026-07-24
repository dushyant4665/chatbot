import { useState } from 'react';

export default function Sidebar({
  isOpen,
  projects,        // [{ id, title, chats: [{id, title}] }]
  activeChatId,
  onChatClick,
  onNewChat,       // (projectId) => void
  onNewProject,
  onDeleteChat,    // (chatId) => void
  onDeleteProject, // (projectId) => void
  onLogout,
  userName,
  onToggle,
}) {
  const [expandedProjects, setExpandedProjects] = useState({});

  const toggleProject = (id) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className={`sidebar ${!isOpen ? 'closed' : ''}`}>
      <div className="sidebar-inner">

        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 4l16 16m0-16L4 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            AI Chat
          </div>
          <button className="sidebar-icon-btn" type="button" onClick={onToggle} title="Close sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* New Project button */}
        <div style={{ padding: '0 8px 8px' }}>
          <button className="new-project-btn" type="button" onClick={onNewProject}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>

        {/* Projects list */}
        <div className="sidebar-body">
          {projects.length === 0 && (
            <p className="sidebar-empty">No projects yet. Create one above.</p>
          )}

          {projects.map(project => {
            const isExpanded = expandedProjects[project.id] !== false; // default open
            const chats = project.chats || [];

            return (
              <div key={project.id} className="project-group">
                {/* Project row */}
                <div className="project-row">
                  {/* Expand toggle + name */}
                  <button
                    type="button"
                    className="project-btn"
                    onClick={() => toggleProject(project.id)}
                  >
                    <svg className={`chevron ${isExpanded ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="project-name">{project.title}</span>
                  </button>

                  {/* New chat in this project */}
                  <button
                    type="button"
                    className="project-action-btn"
                    title="New chat"
                    onClick={() => { onNewChat(project.id); setExpandedProjects(p => ({ ...p, [project.id]: true })); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>

                  {/* Delete project */}
                  <button
                    type="button"
                    className="project-action-btn project-delete-btn"
                    title="Delete project"
                    onClick={() => onDeleteProject(project.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>

                {/* Chats under this project */}
                {isExpanded && (
                  <div className="chat-list">
                    {chats.length === 0 && (
                      <p className="no-chats-hint">No chats yet — press + to start</p>
                    )}
                    {chats.map(chat => (
                      <div
                        key={chat.id}
                        className={`chat-item-row ${chat.id === activeChatId ? 'active' : ''}`}
                      >
                        <button
                          type="button"
                          className="chat-item-btn"
                          onClick={() => onChatClick(chat.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="chat-item-title">{chat.title || 'New Chat'}</span>
                        </button>
                        <button
                          type="button"
                          className="chat-delete-btn"
                          title="Delete chat"
                          onClick={() => onDeleteChat(chat.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User row */}
        <div className="sidebar-bottom">
          <div className="user-row" onClick={onLogout} role="button" tabIndex={0}>
            <div className="user-avatar">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="user-name">{userName || 'Account'}</span>
            <span className="user-logout-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
          </div>
        </div>

      </div>
    </aside>
  );
}
