import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Download } from 'lucide-react';
import DeploymentInfo from '../components/DeploymentInfo';
import { useProject } from '../hooks/useProject';
import type { Project } from '@kirby-gen/shared';

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProject } = useProject();

  const [project, setProject] = useState<Project | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const projectData = await getProject(projectId);
      setProject(projectData);

      // Get preview URL from backend
      const response = await fetch(`/api/projects/${projectId}/preview-url`);
      const data = await response.json();
      setPreviewUrl(data.url);
    } catch (error) {
      console.error('Failed to load project:', error);
      navigate('/error', { state: { error: 'Failed to load project' } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-${projectId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download portfolio:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="page preview-page">
        <div className="page-container">
          <div className="loading-state">
            <p>Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page preview-page">
      <div className="page-container">
        <header className="page-header">
          <button
            className="btn-secondary btn-icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft />
          </button>
          <div>
            <h1>Portfolio Preview</h1>
            <p className="page-description">
              Your portfolio is ready! Review and deploy.
            </p>
          </div>
        </header>

        <div className="page-content">
          <div className="preview-section">
            <div className="preview-header">
              <h2>Live Preview</h2>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary btn-small"
                >
                  Open in New Tab
                  <ExternalLink size={16} />
                </a>
              )}
            </div>

            <div className="preview-frame-container">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="preview-frame"
                  title="Portfolio Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="preview-placeholder">
                  <p>Preview not available</p>
                </div>
              )}
            </div>
          </div>

          <div className="deployment-section">
            <DeploymentInfo project={project} />
          </div>
        </div>

        <footer className="page-footer">
          <button
            className="btn-secondary"
            onClick={handleDownload}
          >
            <Download />
            Download Portfolio
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            Create Another Portfolio
          </button>
        </footer>
      </div>
    </div>
  );
}
