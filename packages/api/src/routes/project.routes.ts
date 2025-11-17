/**
 * Project routes
 */
import { Router } from 'express';
import { z } from 'zod';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectStatus,
} from '../controllers/project.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateParams, validateQuery, validateBody } from '../middleware/validator';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * Validation schemas
 */
const projectIdSchema = z.object({
  params: z.object({
    projectId: z.string().min(1),
  }),
});

const listProjectsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['input', 'mapping', 'structuring', 'design', 'blueprints', 'generating', 'deploying', 'completed', 'failed']).optional(),
  }),
});

const updateProjectSchema = z.object({
  params: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    inputs: z.object({
      pinterestUrl: z.string().url().optional(),
      brandingAssets: z.object({
        colors: z.record(z.string()).optional(),
        fonts: z.array(z.any()).optional(),
      }).optional(),
    }).optional(),
  }).passthrough(), // Allow additional fields
});

/**
 * Routes
 */

// POST /api/projects - Create new project
router.post(
  '/',
  optionalAuth,
  asyncHandler(createProject)
);

// GET /api/projects - List all projects
router.get(
  '/',
  optionalAuth,
  validateQuery(listProjectsSchema.shape.query),
  asyncHandler(listProjects)
);

// GET /api/projects/:projectId - Get project by ID
router.get(
  '/:projectId',
  optionalAuth,
  validateParams(projectIdSchema.shape.params),
  asyncHandler(getProject)
);

// PATCH /api/projects/:projectId - Update project
router.patch(
  '/:projectId',
  optionalAuth,
  validateParams(updateProjectSchema.shape.params),
  validateBody(updateProjectSchema.shape.body),
  asyncHandler(updateProject)
);

// DELETE /api/projects/:projectId - Delete project
router.delete(
  '/:projectId',
  authenticate,
  validateParams(projectIdSchema.shape.params),
  asyncHandler(deleteProject)
);

// GET /api/projects/:projectId/status - Get project status
router.get(
  '/:projectId/status',
  optionalAuth,
  validateParams(projectIdSchema.shape.params),
  asyncHandler(getProjectStatus)
);

export default router;
