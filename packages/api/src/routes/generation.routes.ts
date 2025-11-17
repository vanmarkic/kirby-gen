/**
 * Generation routes
 */
import { Router } from 'express';
import { z } from 'zod';
import {
  startGeneration,
  getGenerationStatus,
  cancelGeneration,
  retryGeneration,
} from '../controllers/generation.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateParams } from '../middleware/validator';
import { optionalAuth, authenticate } from '../middleware/auth';
import { generationLimiter } from '../middleware/rate-limiter';

const router = Router();

/**
 * Validation schemas
 */
const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

/**
 * Routes
 */

// POST /api/projects/:projectId/generate - Start generation
router.post(
  '/:projectId/generate',
  optionalAuth,
  generationLimiter,
  validateParams(projectIdSchema),
  asyncHandler(async (req, res) => {
    // Get progress emitter from app locals (set in server initialization)
    const progressEmitter = req.app.locals.progressEmitter;
    await startGeneration(req, res, progressEmitter);
  })
);

// GET /api/projects/:projectId/generate - Get generation status
router.get(
  '/:projectId/generate',
  optionalAuth,
  validateParams(projectIdSchema),
  asyncHandler(getGenerationStatus)
);

// DELETE /api/projects/:projectId/generate - Cancel generation
router.delete(
  '/:projectId/generate',
  authenticate,
  validateParams(projectIdSchema),
  asyncHandler(cancelGeneration)
);

// POST /api/projects/:projectId/generate/retry - Retry failed generation
router.post(
  '/:projectId/generate/retry',
  optionalAuth,
  generationLimiter,
  validateParams(projectIdSchema),
  asyncHandler(async (req, res) => {
    const progressEmitter = req.app.locals.progressEmitter;
    await retryGeneration(req, res, progressEmitter);
  })
);

export default router;
