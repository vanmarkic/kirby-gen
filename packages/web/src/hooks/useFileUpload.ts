import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fileEndpoints } from '../api/endpoints';

interface UseFileUploadOptions {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useFileUpload({
  projectId,
  onSuccess,
  onError,
}: UseFileUploadOptions) {
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => fileEndpoints.upload(projectId, files),
    onSuccess: () => {
      setUploadProgress(100);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      onError?.(error);
    },
  });

  const pinterestMutation = useMutation({
    mutationFn: (url: string) => fileEndpoints.uploadPinterestUrl(projectId, url),
    onSuccess,
    onError,
  });

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setUploadProgress(0);
      await uploadMutation.mutateAsync(files);
    },
    [uploadMutation]
  );

  const uploadPinterestUrl = useCallback(
    async (url: string) => {
      await pinterestMutation.mutateAsync(url);
    },
    [pinterestMutation]
  );

  return {
    uploadFiles,
    uploadPinterestUrl,
    uploadProgress,
    isUploading: uploadMutation.isPending || pinterestMutation.isPending,
    error: uploadMutation.error || pinterestMutation.error,
  };
}
