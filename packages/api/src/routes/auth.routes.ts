/**
 * Authentication routes
 */
import { Router } from 'express';
import { z } from 'zod';
import { login } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateBody } from '../middleware/validator';

const router = Router();

/**
 * Validation schemas
 */
const loginSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Routes
 */

// POST /api/auth/login - Login with password
router.post(
  '/login',
  validateBody(loginSchema.shape.body),
  asyncHandler(login)
);

export default router;
