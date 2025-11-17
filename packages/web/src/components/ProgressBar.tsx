import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface ProgressBarProps {
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'in_progress':
        return <Loader2 className="progress-icon spin" />;
      case 'completed':
        return <CheckCircle className="progress-icon success" />;
      case 'failed':
        return <AlertCircle className="progress-icon error" />;
      default:
        return null;
    }
  };

  const getProgressText = () => {
    if (status === 'completed') return 'Complete';
    if (status === 'failed') return 'Failed';
    return `${Math.round(progress)}%`;
  };

  return (
    <div className="progress-bar-container">
      <div className="progress-header">
        <div className="progress-status">
          {getStatusIcon()}
          <span className="progress-label">{getProgressText()}</span>
        </div>
      </div>

      <div className="progress-track">
        <div
          className={clsx('progress-fill', {
            'progress-fill-success': status === 'completed',
            'progress-fill-error': status === 'failed',
          })}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          {status === 'in_progress' && <div className="progress-shimmer" />}
        </div>
      </div>

      <div className="progress-stages">
        <div className={clsx('stage', { active: progress >= 0 })}>
          <div className="stage-dot" />
          <span className="stage-label">Analyzing Content</span>
        </div>
        <div className={clsx('stage', { active: progress >= 25 })}>
          <div className="stage-dot" />
          <span className="stage-label">Generating Schema</span>
        </div>
        <div className={clsx('stage', { active: progress >= 50 })}>
          <div className="stage-dot" />
          <span className="stage-label">Creating CMS</span>
        </div>
        <div className={clsx('stage', { active: progress >= 75 })}>
          <div className="stage-dot" />
          <span className="stage-label">Building Site</span>
        </div>
        <div className={clsx('stage', { active: progress >= 100 })}>
          <div className="stage-dot" />
          <span className="stage-label">Complete</span>
        </div>
      </div>
    </div>
  );
}
