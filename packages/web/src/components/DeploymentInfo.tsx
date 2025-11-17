import { useState } from 'react';
import { Copy, Check, Server, Lock, ExternalLink } from 'lucide-react';
import type { Project } from '@kirby-gen/shared';

interface DeploymentInfoProps {
  project: Project | null;
}

export default function DeploymentInfo({ project }: DeploymentInfoProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!project?.deployment) {
    return (
      <div className="deployment-info">
        <h2>Deployment Information</h2>
        <p className="info-message">
          Deployment information will be available once generation is complete.
        </p>
      </div>
    );
  }

  const { deployment } = project;

  return (
    <div className="deployment-info">
      <h2>Deployment Information</h2>

      <div className="info-card">
        <div className="info-header">
          <Server size={18} />
          <h3>CMS Access</h3>
        </div>

        <div className="info-field">
          <label>Panel URL</label>
          <div className="info-value-group">
            <input
              type="text"
              value={deployment.panelUrl || 'Not available'}
              readOnly
              className="input-readonly"
            />
            <button
              className="btn-icon btn-small"
              onClick={() =>
                deployment.panelUrl &&
                handleCopy(deployment.panelUrl, 'panelUrl')
              }
              disabled={!deployment.panelUrl}
            >
              {copiedField === 'panelUrl' ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
            {deployment.panelUrl && (
              <a
                href={deployment.panelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon btn-small"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>

        <div className="info-field">
          <label>Username</label>
          <div className="info-value-group">
            <input
              type="text"
              value={deployment.credentials?.username || 'admin'}
              readOnly
              className="input-readonly"
            />
            <button
              className="btn-icon btn-small"
              onClick={() =>
                deployment.credentials?.username &&
                handleCopy(deployment.credentials.username, 'username')
              }
            >
              {copiedField === 'username' ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>

        <div className="info-field">
          <label>
            <Lock size={14} />
            Password
          </label>
          <div className="info-value-group">
            <input
              type="password"
              value={deployment.credentials?.password || ''}
              readOnly
              className="input-readonly"
            />
            <button
              className="btn-icon btn-small"
              onClick={() =>
                deployment.credentials?.password &&
                handleCopy(deployment.credentials.password, 'password')
              }
            >
              {copiedField === 'password' ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          <p className="field-hint">
            Save these credentials - you'll need them to access the CMS panel
          </p>
        </div>
      </div>

      <div className="info-card">
        <div className="info-header">
          <ExternalLink size={18} />
          <h3>Next Steps</h3>
        </div>

        <ol className="info-steps">
          <li>
            <strong>Access the CMS Panel</strong>
            <p>Log in using the credentials above to manage your content</p>
          </li>
          <li>
            <strong>Add & Edit Content</strong>
            <p>Create new projects, update images, and refine your portfolio</p>
          </li>
          <li>
            <strong>Deploy to Production</strong>
            <p>
              Download the portfolio and deploy to your hosting provider
              (Netlify, Vercel, etc.)
            </p>
          </li>
        </ol>
      </div>

      <div className="info-warning">
        <p>
          <strong>Important:</strong> This is a local development instance.
          Download the portfolio files and deploy them to your own hosting
          for production use.
        </p>
      </div>
    </div>
  );
}
