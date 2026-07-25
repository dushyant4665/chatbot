export default function Sidebar({
  projects,
  activeProjectId,
  onProjectClick,
  onNewProject,
  onLogout,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l2.4 6.9L21 12l-6.6 3.1L12 22l-2.4-6.9L3 12l6.6-3.1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>AI Chat</span>
          </div>
        </div>

        <div style={{ padding: '0 8px 8px' }}>
          <button className="new-project-btn" type="button" onClick={onNewProject}>
            + New Project
          </button>
        </div>

        <div className="sidebar-body">
          {projects.length === 0 ? (
            <p className="sidebar-empty">No projects yet. Create one above.</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="project-group">
                <div className={`project-row ${project.id === activeProjectId ? 'active' : ''}`}>
                  <button
                    className="project-btn"
                    type="button"
                    onClick={() => onProjectClick(project.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="project-name">{project.title}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-bottom">
          <button className="user-row" type="button" onClick={onLogout}>
            <div className="user-avatar">U</div>
            <span className="user-name">Logout</span>
            <span className="user-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 3v18" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
