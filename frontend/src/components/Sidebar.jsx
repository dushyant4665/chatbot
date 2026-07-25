import { useEffect, useState } from 'react';

export default function Sidebar({
  projects,
  chats,
  activeChatId,
  activeProjectId,
  onChatClick,
  onNewChat,
  onNewProjectChat,
  onNewProject,
  onDeleteChat,
  onDeleteProject,
  onLogout,
  userName,
  isOpen,
}) {
  const [openProjects, setOpenProjects] = useState([]);

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }

    setOpenProjects((current) => {
      if (current.includes(activeProjectId)) {
        return current;
      }

      return [activeProjectId, ...current];
    });
  }, [activeProjectId]);

  const toggleProject = (projectId) => {
    setOpenProjects((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      return [projectId, ...current];
    });
  };

  const projectChats = (projectId) => chats.filter((chat) => chat.projectId === projectId);
  const normalChats = chats.filter((chat) => !chat.projectId);

  return (
    <aside className={`sidebar ${!isOpen ? 'closed' : ''}`}>
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span>Chatbot</span>
          </div>
        </div>

        <div className="sidebar-body">
          <div className="sidebar-section-title">
            <span>Projects</span>
            <button className="icon-btn" type="button" onClick={onNewProject} title="Create Project">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="sidebar-empty">No projects yet.</p>
          ) : (
            projects.map((project) => {
              const isOpen = openProjects.includes(project.id);
              const chatsInProject = projectChats(project.id);

              return (
                <div key={project.id} className="project-group">
                  <div className={`project-row project-group-row ${project.id === activeProjectId ? 'active' : ''}`}>
                    <button
                      className="project-btn project-group-btn"
                      type="button"
                      onClick={() => toggleProject(project.id)}
                      aria-expanded={isOpen}
                      title={isOpen ? 'Collapse project' : 'Expand project'}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        width="15"
                        height="15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`project-chevron ${isOpen ? 'open' : ''}`}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <span className="project-name">{project.title}</span>
                    </button>

                    <button
                      className="project-action-btn"
                      type="button"
                      onClick={() => onNewProjectChat(project.id)}
                      title="New chat in this project"
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>

                    <button
                      className="delete-icon-btn"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      title="Delete project"
                    >
                      ×
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="project-children">
                      {chatsInProject.length === 0 ? (
                        <p className="project-child-empty">No chats yet.</p>
                      ) : (
                        chatsInProject.map((chat) => (
                          <div key={chat.id} className={`project-row project-child-row ${chat.id === activeChatId ? 'active' : ''}`}>
                            <button
                              className="project-btn project-child-btn"
                              type="button"
                              onClick={() => onChatClick(chat.id, chat.projectId)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                              </svg>
                              <span className="project-name">{chat.title}</span>
                            </button>
                            <button
                              className="delete-icon-btn"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                              title="Delete chat"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <div className="sidebar-section-title" style={{ marginTop: '20px' }}>
            <span>Chats</span>
            <button className="icon-btn" type="button" onClick={onNewChat} title="Create Chat">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          {normalChats.length === 0 ? (
            <p className="sidebar-empty">No chats yet.</p>
          ) : (
            normalChats.map((chat) => (
              <div key={chat.id} className={`project-row ${chat.id === activeChatId ? 'active' : ''}`}>
                <button
                  className="project-btn"
                  type="button"
                  onClick={() => onChatClick(chat.id, chat.projectId)}
                >
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="project-name">{chat.title}</span>
                </button>
                <button
                  className="delete-icon-btn"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  title="Delete chat"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-bottom">
          <button className="user-row" type="button" onClick={onLogout}>
            <div className="user-avatar">{userName ? userName[0].toUpperCase() : 'U'}</div>
            <span className="user-name">{userName || 'Logout'}</span>
            <span className="user-logout-icon" aria-hidden="true" title="Logout">
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
