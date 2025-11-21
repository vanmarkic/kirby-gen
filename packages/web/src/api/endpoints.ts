import apiClient from './client';
import type { Project, DomainSchema, Message } from '@kirby-gen/shared';

// Project endpoints
export const projectEndpoints = {
  create: async (data: { name: string }): Promise<Project> => {
    const response = await apiClient.post('/projects', data);
    return response.data.data;
  },

  get: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data.data;
  },

  list: async (): Promise<Project[]> => {
    const response = await apiClient.get('/projects');
    return response.data.data;
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  generate: async (id: string): Promise<void> => {
    await apiClient.post(`/projects/${id}/generate`);
  },

  getPreviewUrl: async (id: string): Promise<{ url: string }> => {
    const response = await apiClient.get(`/projects/${id}/preview-url`);
    return response.data.data;
  },

  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/projects/${id}/download`, {
      responseType: 'blob',
    });
    return response.data; // Blob responses don't have wrapper
  },
};

// Domain mapping endpoints
export const domainMappingEndpoints = {
  initialize: async (
    projectId: string
  ): Promise<{ initialMessage: string; schema?: DomainSchema }> => {
    const response = await apiClient.post(
      `/projects/${projectId}/domain-mapping/init`
    );
    return response.data.data;
  },

  sendMessage: async (
    projectId: string,
    data: {
      message: string;
      conversationHistory: Message[];
    }
  ): Promise<{
    message: string;
    schema?: DomainSchema;
    isComplete: boolean;
  }> => {
    const response = await apiClient.post(
      `/projects/${projectId}/domain-mapping/message`,
      data
    );
    return response.data.data;
  },

  getSchema: async (projectId: string): Promise<DomainSchema> => {
    const response = await apiClient.get(
      `/projects/${projectId}/domain-mapping/schema`
    );
    return response.data.data;
  },
};

// File upload endpoints
export const fileEndpoints = {
  uploadContent: async (projectId: string, files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    await apiClient.post(`/projects/${projectId}/files/content`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  upload: async (projectId: string, files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    await apiClient.post(`/projects/${projectId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadPinterestUrl: async (
    projectId: string,
    url: string
  ): Promise<void> => {
    await apiClient.post(`/projects/${projectId}/pinterest`, { url });
  },
};

export default {
  projects: projectEndpoints,
  domainMapping: domainMappingEndpoints,
  files: fileEndpoints,
};
