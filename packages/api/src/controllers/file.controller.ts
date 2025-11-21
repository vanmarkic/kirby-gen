/**
 * File upload handling controller
 */
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import {
  IStorageService,
  FileReference,
  SERVICE_KEYS,
  ALLOWED_MIME_TYPES,
  ALLOWED_FILE_TYPES_DISPLAY,
  MAX_FILES_PER_UPLOAD,
} from '@kirby-gen/shared';
import { getService } from '../config/di-setup';
import { ResponseBuilder } from '../utils/response';
import { NotFoundError, FileUploadError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Configure multer for file uploads
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { projectId } = req.params;
    const uploadDir = path.join(env.UPLOAD_DIR, projectId);

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new FileUploadError(`File type not allowed: ${file.mimetype}. Allowed types: ${ALLOWED_FILE_TYPES_DISPLAY}`));
  }
};

/**
 * Multer upload instance
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: MAX_FILES_PER_UPLOAD,
  },
});

/**
 * Upload content files
 */
export async function uploadContentFiles(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new FileUploadError('No files uploaded');
  }

  logger.info('Uploading content files', {
    projectId,
    fileCount: files.length,
  });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    // Clean up uploaded files
    await Promise.all(files.map((file) => fs.unlink(file.path)));
    throw new NotFoundError('Project', projectId);
  }

  // Create file references
  const fileReferences: FileReference[] = files.map((file) => ({
    id: randomBytes(8).toString('hex'),
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
    path: file.path,
  }));

  // Update project with new files
  project.inputs.contentFiles.push(...fileReferences);
  project.updatedAt = new Date();
  await storageService.updateProject(projectId, project);

  res.status(201).json(ResponseBuilder.created({ files: fileReferences }));
}

/**
 * Upload branding assets
 */
export async function uploadBrandingAssets(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  logger.info('Uploading branding assets', {
    projectId,
    fields: Object.keys(files),
  });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    // Clean up uploaded files
    const allFiles = Object.values(files).flat();
    await Promise.all(allFiles.map((file) => fs.unlink(file.path)));
    throw new NotFoundError('Project', projectId);
  }

  // Process logo
  if (files.logo && files.logo[0]) {
    const logoFile = files.logo[0];
    project.inputs.brandingAssets.logo = {
      id: randomBytes(8).toString('hex'),
      filename: logoFile.filename,
      originalName: logoFile.originalname,
      mimeType: logoFile.mimetype,
      size: logoFile.size,
      uploadedAt: new Date(),
      path: logoFile.path,
    };
  }

  // Process brand guidelines
  if (files.guidelines && files.guidelines[0]) {
    const guidelinesFile = files.guidelines[0];
    project.inputs.brandingAssets.guidelines = {
      id: randomBytes(8).toString('hex'),
      filename: guidelinesFile.filename,
      originalName: guidelinesFile.originalname,
      mimeType: guidelinesFile.mimetype,
      size: guidelinesFile.size,
      uploadedAt: new Date(),
      path: guidelinesFile.path,
    };
  }

  project.updatedAt = new Date();
  await storageService.updateProject(projectId, project);

  res.status(201).json(
    ResponseBuilder.created({
      brandingAssets: project.inputs.brandingAssets,
    })
  );
}

/**
 * Delete a file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  const { projectId, fileId } = req.params;

  logger.info('Deleting file', { projectId, fileId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Find and remove file
  const fileIndex = project.inputs.contentFiles.findIndex((f) => f.id === fileId);

  if (fileIndex === -1) {
    throw new NotFoundError('File', fileId);
  }

  const file = project.inputs.contentFiles[fileIndex];

  // Delete physical file
  try {
    await fs.unlink(file.path);
  } catch (error) {
    logger.warn('Failed to delete physical file', { path: file.path, error });
  }

  // Remove from project
  project.inputs.contentFiles.splice(fileIndex, 1);
  project.updatedAt = new Date();
  await storageService.updateProject(projectId, project);

  res.status(204).send();
}

/**
 * List project files
 */
export async function listFiles(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  res.json(
    ResponseBuilder.success({
      contentFiles: project.inputs.contentFiles,
      brandingAssets: project.inputs.brandingAssets,
    })
  );
}
