import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectEndpoints } from '../api/endpoints';
import { useProjectStore } from '../stores/projectStore';
import type { Project } from '@kirby-gen/shared';

export function useProject() {
  const queryClient = useQueryClient();
  const {
    setCurrentProject,
    setProjects: _setProjects, // Unused but required by type
    addProject: addProjectToStore,
    updateProject: updateProjectInStore,
    removeProject: removeProjectFromStore,
  } = useProjectStore();

  // Queries
  const useProjectQuery = (projectId: string) => {
    return useQuery({
      queryKey: ['project', projectId],
      queryFn: () => projectEndpoints.get(projectId),
      enabled: !!projectId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  const useProjectsQuery = () => {
    return useQuery({
      queryKey: ['projects'],
      queryFn: () => projectEndpoints.list(),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => projectEndpoints.create(data),
    onSuccess: (project) => {
      addProjectToStore(project);
      setCurrentProject(project);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectEndpoints.update(id, data),
    onSuccess: (project) => {
      updateProjectInStore(project.id, project);
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectEndpoints.delete(id),
    onSuccess: (_, id) => {
      removeProjectFromStore(id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (id: string) => projectEndpoints.generate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  // Helper functions
  const createProject = useCallback(
    async (data: { name: string }): Promise<Project> => {
      return await createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const getProject = useCallback(
    async (id: string): Promise<Project> => {
      return await projectEndpoints.get(id);
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>): Promise<Project> => {
      return await updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const generatePortfolio = useCallback(
    async (id: string): Promise<void> => {
      await generateMutation.mutateAsync(id);
    },
    [generateMutation]
  );

  return {
    // Query hooks
    useProjectQuery,
    useProjectsQuery,

    // Mutation functions
    createProject,
    getProject,
    updateProject,
    deleteProject,
    generatePortfolio,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGenerating: generateMutation.isPending,

    // Errors
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    generateError: generateMutation.error,
  };
}
