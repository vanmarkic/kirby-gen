/**
 * Authentication routes
 */
import { Router } from 'express';
import { z } from 'zod';
import { login } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateBody } from '../middleware/validator';
import { loginLimiter } from '../middleware/rate-limiter';

const router = Router();

/**
 * Validation schema for login
 */
const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/**
 * Routes
 */

// POST /api/auth/login - Login with password
router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(login)
);

export default router;
