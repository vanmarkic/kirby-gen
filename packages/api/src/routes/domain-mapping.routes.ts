/**
 * Domain mapping routes
 */
import { Router } from 'express';
import { z } from 'zod';
import {
  generateDomainModel,
  updateDomainModel,
  getDomainModel,
  validateDomainModel,
} from '../controllers/domain-mapping.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateParams, validateBody, CLAUDE_INPUT_LIMITS } from '../middleware/validator';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * Validation schemas
 */
const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

const generateDomainModelSchema = z.object({
  params: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    existingModel: z.any().optional(),
  }),
});

const updateDomainModelSchema = z.object({
  params: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    domainModel: z.object({
      entities: z.array(z.any()).max(CLAUDE_INPUT_LIMITS.MAX_FIELD_COUNT,
        'Too many entities. Maximum allowed is ' + CLAUDE_INPUT_LIMITS.MAX_FIELD_COUNT),
      relationships: z.array(z.any()).max(CLAUDE_INPUT_LIMITS.MAX_FIELD_COUNT,
        'Too many relationships. Maximum allowed is ' + CLAUDE_INPUT_LIMITS.MAX_FIELD_COUNT),
      schema: z.any(),
    }),
  }),
});

const validateDomainModelSchema = z.object({
  domainModel: z.object({
    entities: z.array(z.any()).optional(),
    relationships: z.array(z.any()).optional(),
    schema: z.any().optional(),
  }),
});

/**
 * Routes
 */

// POST /api/projects/:projectId/domain-model/generate - Generate domain model
router.post(
  '/:projectId/domain-model/generate',
  optionalAuth,
  validateParams(generateDomainModelSchema.shape.params),
  validateBody(generateDomainModelSchema.shape.body),
  asyncHandler(generateDomainModel)
);

// GET /api/projects/:projectId/domain-model - Get domain model
router.get(
  '/:projectId/domain-model',
  optionalAuth,
  validateParams(projectIdSchema),
  asyncHandler(getDomainModel)
);

// PUT /api/projects/:projectId/domain-model - Update domain model
router.put(
  '/:projectId/domain-model',
  optionalAuth,
  validateParams(updateDomainModelSchema.shape.params),
  validateBody(updateDomainModelSchema.shape.body),
  asyncHandler(updateDomainModel)
);

// POST /api/domain-model/validate - Validate domain model structure
router.post(
  '/validate',
  optionalAuth,
  validateBody(validateDomainModelSchema),
  asyncHandler(validateDomainModel)
);

export default router;
