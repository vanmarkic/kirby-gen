import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import ProgressLog from '../components/ProgressLog';
import { useWebSocket } from '../hooks/useWebSocket';
import { useProgressStore } from '../stores/progressStore';
import { projectEndpoints } from '../api/endpoints';

export default function ProgressPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { connect, disconnect, isConnected } = useWebSocket(projectId!);
  const { progress, status, error } = useProgressStore();
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

  const startGeneration = useCallback(async () => {
    try {
      await projectEndpoints.generate(projectId!);
    } catch (error) {
      console.error('Failed to start generation:', error);
      navigate('/error', { state: { error: 'Failed to start generation' } });
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (!projectId) return;

    // Connect to WebSocket
    connect();

    // Start generation if not already started
    if (!hasStartedGeneration) {
      startGeneration();
      setHasStartedGeneration(true);
    }

    return () => {
      disconnect();
    };
  }, [projectId, connect, disconnect, hasStartedGeneration, startGeneration]);

  useEffect(() => {
    // Navigate to preview when complete
    if (status === 'completed') {
      setTimeout(() => {
        navigate(`/project/${projectId}/preview`);
      }, 2000);
    }

    // Navigate to error page on failure
    if (status === 'failed') {
      setTimeout(() => {
        navigate('/error', { state: { error } });
      }, 2000);
    }
  }, [status, projectId, navigate, error]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="status-icon status-success" />;
      case 'failed':
        return <AlertCircle className="status-icon status-error" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'in_progress':
        return 'Generating your portfolio...';
      case 'completed':
        return 'Portfolio generated successfully!';
      case 'failed':
        return 'Generation failed';
      default:
        return 'Preparing to generate...';
    }
  };

  return (
    <div className="page progress-page">
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1>Generation Progress</h1>
            <p className="page-description">
              {getStatusMessage()}
            </p>
          </div>
          {getStatusIcon()}
        </header>

        <div className="page-content">
          <div className="progress-section">
            <ProgressBar progress={progress} status={status} />

            <div className="connection-status">
              {isConnected ? (
                <span className="status-badge status-connected">
                  Connected
                </span>
              ) : (
                <span className="status-badge status-disconnected">
                  Connecting...
                </span>
              )}
            </div>
          </div>

          <div className="log-section">
            <h2>Generation Log</h2>
            <ProgressLog projectId={projectId!} />
          </div>
        </div>

        {status === 'completed' && (
          <footer className="page-footer">
            <button
              className="btn-primary"
              onClick={() => navigate(`/project/${projectId}/preview`)}
            >
              View Portfolio
            </button>
          </footer>
        )}

        {status === 'failed' && (
          <footer className="page-footer">
            <button
              className="btn-secondary"
              onClick={() => navigate(`/project/${projectId}/input`)}
            >
              Start Over
            </button>
            <button
              className="btn-primary"
              onClick={startGeneration}
            >
              Retry Generation
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
