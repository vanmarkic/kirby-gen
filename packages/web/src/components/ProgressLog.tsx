import { useEffect, useRef } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { Terminal } from 'lucide-react';
import clsx from 'clsx';

interface ProgressLogProps {
  projectId: string;
}

export default function ProgressLog({ projectId }: ProgressLogProps) {
  const { logs } = useProgressStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogClassName = (level: string) => {
    return clsx('log-entry', {
      'log-info': level === 'info',
      'log-success': level === 'success',
      'log-warning': level === 'warning',
      'log-error': level === 'error',
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="progress-log">
      <div className="log-header">
        <Terminal size={18} />
        <span>Generation Log</span>
      </div>

      <div className="log-content">
        {logs.length === 0 ? (
          <div className="log-empty">
            <p>Waiting for generation to start...</p>
          </div>
        ) : (
          <>
            {logs.map((log, index) => (
              <div key={index} className={getLogClassName(log.level)}>
                <span className="log-timestamp">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
