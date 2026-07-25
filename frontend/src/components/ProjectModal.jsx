import { useEffect, useState } from 'react';

import Modal from './Modal.jsx';

export default function ProjectModal({
  open,
  title,
  subtitle,
  submitLabel,
  saving,
  onClose,
  onSubmit,
}) {
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setProjectTitle('');
      setProjectDescription('');
    }
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      title: projectTitle,
      description: projectDescription,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <>
          <button className="btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-modal-primary" type="submit" form="project-form" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </button>
        </>
      )}
    >
      <form id="project-form" className="stack" onSubmit={handleSubmit}>
        <div>
          <label className="modal-label" htmlFor="projectTitle">
            Project name
          </label>
          <input
            id="projectTitle"
            className="modal-input"
            type="text"
            value={projectTitle}
            onChange={(event) => setProjectTitle(event.target.value)}
            placeholder="e.g. My Workspace"
            required
            autoFocus
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <label className="modal-label" htmlFor="projectDescription">
            Description
          </label>
          <textarea
            id="projectDescription"
            className="modal-textarea"
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="Short note about this project"
            rows="4"
          />
        </div>
      </form>
    </Modal>
  );
}
