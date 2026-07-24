import { useEffect, useState } from 'react';

export default function WorkspaceLayout({
  projects,
  activeProjectId,
  onProjectClick,
  onNewProject,
  onLogout,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeProjectId]);

  return (
    <div className="workspace-shell">
      <button
        className={`mobile-drawer-backdrop ${sidebarOpen ? 'mobile-drawer-backdrop-open' : ''}`}
        type="button"
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`workspace-sidebar ${sidebarOpen ? 'workspace-sidebar-open' : ''}`}>
        <div className="brand-row sidebar-brand">
          <div className="brand-mark">A</div>
          <div className="brand-text">
            <p className="kicker">AI Chat</p>
            <strong>Workspace</strong>
          </div>
        </div>

        <button className="mobile-close-button" type="button" onClick={() => setSidebarOpen(false)}>
          Close
        </button>

        <div className="sidebar-section">
          <p className="sidebar-title">Projects</p>
          <div className="sidebar-list">
            {projects.length === 0 ? (
              <p className="small-note">No projects yet.</p>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`sidebar-item ${project.id === activeProjectId ? 'sidebar-item-active' : ''}`}
                  onClick={() => onProjectClick(project.id)}
                >
                  <span>{project.title}</span>
                  <span className="sidebar-arrow">Open</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-section sidebar-actions">
          <button className="button button-secondary" type="button" onClick={onNewProject}>
            New Project
          </button>
          <button className="button button-secondary" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="workspace-mobile-topbar">
        <button className="icon-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
          Menu
        </button>
        <div className="brand-row">
          <div className="brand-mark">A</div>
          <div className="brand-text">
            <p className="kicker">AI Chat</p>
            <strong>Workspace</strong>
          </div>
        </div>
      </div>

      <main className="workspace-main">{children}</main>
    </div>
  );
}
