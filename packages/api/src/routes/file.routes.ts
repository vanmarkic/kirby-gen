/**
 * File upload routes
 */
import { Router } from 'express';
import { z } from 'zod';
import {
  upload,
  uploadContentFiles,
  uploadBrandingAssets,
  deleteFile,
  listFiles,
} from '../controllers/file.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateParams } from '../middleware/validator';
import { optionalAuth, authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rate-limiter';

const router = Router();

/**
 * Validation schemas
 */
const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

const fileIdSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
});

/**
 * Routes
 */

// POST /api/projects/:projectId/files/content - Upload content files
router.post(
  '/:projectId/files/content',
  optionalAuth,
  uploadLimiter,
  validateParams(projectIdSchema),
  upload.array('files', 20),
  asyncHandler(uploadContentFiles)
);

// POST /api/projects/:projectId/files/branding - Upload branding assets
router.post(
  '/:projectId/files/branding',
  optionalAuth,
  uploadLimiter,
  validateParams(projectIdSchema),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'guidelines', maxCount: 1 },
  ]),
  asyncHandler(uploadBrandingAssets)
);

// GET /api/projects/:projectId/files - List all files
router.get(
  '/:projectId/files',
  optionalAuth,
  validateParams(projectIdSchema),
  asyncHandler(listFiles)
);

// DELETE /api/projects/:projectId/files/:fileId - Delete file
router.delete(
  '/:projectId/files/:fileId',
  authenticate,
  validateParams(fileIdSchema),
  asyncHandler(deleteFile)
);

export default router;
