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
        <div className="inline-actions end">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" form="project-form" disabled={saving}>
            {submitLabel}
          </button>
        </div>
      )}
    >
      <form id="project-form" className="stack" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="projectTitle">
            Project title
          </label>
          <input
            id="projectTitle"
            className="field"
            type="text"
            value={projectTitle}
            onChange={(event) => setProjectTitle(event.target.value)}
            placeholder="My first project"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="projectDescription">
            Description
          </label>
          <textarea
            id="projectDescription"
            className="textarea"
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
