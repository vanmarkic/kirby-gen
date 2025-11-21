import { useCallback, useRef } from 'react';
import { websocketClient } from '../api/websocket';
import { useProgressStore } from '../stores/progressStore';
import type { ProgressUpdate, LogEntry } from '../api/websocket';

export function useWebSocket(projectId: string) {
  const {
    setProgress,
    setStatus,
    setStage,
    addLog,
    setError,
    reset,
  } = useProgressStore();

  const isConnectedRef = useRef(false);

  const handleProgressUpdate = useCallback(
    (data: ProgressUpdate) => {
      setProgress(data.progress);
      setStage(data.stage);
      setStatus('in_progress');
    },
    [setProgress, setStage, setStatus]
  );

  const handleLogEntry = useCallback(
    (data: LogEntry) => {
      addLog(data);
    },
    [addLog]
  );

  const handleGenerationComplete = useCallback(
    (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        setProgress(100);
        setStatus('completed');
        addLog({
          level: 'success',
          message: 'Generation completed successfully',
          timestamp: new Date().toISOString(),
        });
      }
    },
    [projectId, setProgress, setStatus, addLog]
  );

  const handleGenerationFailed = useCallback(
    (data: { projectId: string; error: string }) => {
      if (data.projectId === projectId) {
        setStatus('failed');
        setError(data.error);
        addLog({
          level: 'error',
          message: `Generation failed: ${data.error}`,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [projectId, setStatus, setError, addLog]
  );

  const connect = useCallback(() => {
    if (isConnectedRef.current) return;

    reset();
    websocketClient.connect();
    websocketClient.joinProject(projectId);

    // Register event handlers
    websocketClient.onProgressUpdate(handleProgressUpdate);
    websocketClient.onLogEntry(handleLogEntry);
    websocketClient.onGenerationComplete(handleGenerationComplete);
    websocketClient.onGenerationFailed(handleGenerationFailed);

    isConnectedRef.current = true;
  }, [
    projectId,
    reset,
    handleProgressUpdate,
    handleLogEntry,
    handleGenerationComplete,
    handleGenerationFailed,
  ]);

  const disconnect = useCallback(() => {
    if (!isConnectedRef.current) return;

    websocketClient.leaveProject(projectId);

    // Unregister event handlers
    websocketClient.offProgressUpdate(handleProgressUpdate);
    websocketClient.offLogEntry(handleLogEntry);
    websocketClient.offGenerationComplete(handleGenerationComplete);
    websocketClient.offGenerationFailed(handleGenerationFailed);

    websocketClient.disconnect();
    isConnectedRef.current = false;
  }, [
    projectId,
    handleProgressUpdate,
    handleLogEntry,
    handleGenerationComplete,
    handleGenerationFailed,
  ]);

  return {
    connect,
    disconnect,
    isConnected: websocketClient.isConnected(),
  };
}
