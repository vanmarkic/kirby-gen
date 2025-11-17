import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LogEntry } from '../api/websocket';

type GenerationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface ProgressState {
  // State
  progress: number;
  status: GenerationStatus;
  currentStage: string;
  logs: LogEntry[];
  error: string | null;

  // Actions
  setProgress: (progress: number) => void;
  setStatus: (status: GenerationStatus) => void;
  setStage: (stage: string) => void;
  addLog: (log: LogEntry) => void;
  addLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  progress: 0,
  status: 'pending' as GenerationStatus,
  currentStage: '',
  logs: [] as LogEntry[],
  error: null,
};

export const useProgressStore = create<ProgressState>()(
  devtools(
    (set) => ({
      ...initialState,

      setProgress: (progress) =>
        set({ progress }, false, 'setProgress'),

      setStatus: (status) =>
        set({ status }, false, 'setStatus'),

      setStage: (stage) =>
        set({ currentStage: stage }, false, 'setStage'),

      addLog: (log) =>
        set(
          (state) => ({
            logs: [...state.logs, log],
          }),
          false,
          'addLog'
        ),

      addLogs: (logs) =>
        set(
          (state) => ({
            logs: [...state.logs, ...logs],
          }),
          false,
          'addLogs'
        ),

      clearLogs: () =>
        set({ logs: [] }, false, 'clearLogs'),

      setError: (error) =>
        set({ error }, false, 'setError'),

      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'progress-store',
    }
  )
);

// Selectors
export const selectProgress = (state: ProgressState) => state.progress;
export const selectStatus = (state: ProgressState) => state.status;
export const selectStage = (state: ProgressState) => state.currentStage;
export const selectLogs = (state: ProgressState) => state.logs;
export const selectError = (state: ProgressState) => state.error;
