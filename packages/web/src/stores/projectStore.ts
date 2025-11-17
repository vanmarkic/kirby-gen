import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Project } from '@kirby-gen/shared';

interface ProjectState {
  // State
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,
};

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set) => ({
      ...initialState,

      setCurrentProject: (project) =>
        set({ currentProject: project }, false, 'setCurrentProject'),

      setProjects: (projects) =>
        set({ projects }, false, 'setProjects'),

      addProject: (project) =>
        set(
          (state) => ({
            projects: [...state.projects, project],
          }),
          false,
          'addProject'
        ),

      updateProject: (id, updates) =>
        set(
          (state) => ({
            projects: state.projects.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
            currentProject:
              state.currentProject?.id === id
                ? { ...state.currentProject, ...updates }
                : state.currentProject,
          }),
          false,
          'updateProject'
        ),

      removeProject: (id) =>
        set(
          (state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            currentProject:
              state.currentProject?.id === id ? null : state.currentProject,
          }),
          false,
          'removeProject'
        ),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'setLoading'),

      setError: (error) =>
        set({ error }, false, 'setError'),

      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'project-store',
    }
  )
);

// Selectors
export const selectCurrentProject = (state: ProjectState) => state.currentProject;
export const selectProjects = (state: ProjectState) => state.projects;
export const selectIsLoading = (state: ProjectState) => state.isLoading;
export const selectError = (state: ProjectState) => state.error;
