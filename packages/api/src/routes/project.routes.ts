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
  initializeDomainMapping,
  handleDomainMappingMessage,
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

// PUT/PATCH /api/projects/:projectId - Update project
router.put(
  '/:projectId',
  optionalAuth,
  validateParams(updateProjectSchema.shape.params),
  validateBody(updateProjectSchema.shape.body),
  asyncHandler(updateProject)
);

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

// POST /api/projects/:projectId/domain-mapping/init - Initialize domain mapping
router.post(
  '/:projectId/domain-mapping/init',
  optionalAuth,
  validateParams(projectIdSchema.shape.params),
  asyncHandler(initializeDomainMapping)
);

// POST /api/projects/:projectId/domain-mapping/message - Send message in domain mapping
router.post(
  '/:projectId/domain-mapping/message',
  optionalAuth,
  validateParams(projectIdSchema.shape.params),
  asyncHandler(handleDomainMappingMessage)
);

export default router;
