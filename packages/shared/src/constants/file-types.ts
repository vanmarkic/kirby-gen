/**
 * Shared file type configuration for uploads
 * Used by both frontend (validation) and backend (filtering)
 */

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/json',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
] as const;

/**
 * File type accept configuration for react-dropzone
 * Maps MIME types to file extensions
 */
export const FILE_ACCEPT_CONFIG = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/svg+xml': ['.svg'],
  'image/webp': ['.webp'],
};

/**
 * Human-readable list of allowed file types
 */
export const ALLOWED_FILE_TYPES_DISPLAY =
  'PDF, Word (.doc/.docx), TXT, Markdown, JSON, JPEG, PNG, GIF, SVG, WebP';

/**
 * Maximum file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum number of files per upload
 */
export const MAX_FILES_PER_UPLOAD = 20;

/**
 * Validate if a file type is allowed
 */
export function isFileTypeAllowed(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.'));
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
