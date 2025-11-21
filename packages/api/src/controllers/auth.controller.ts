/**
 * Authentication controller
 */
import { Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

/**
 * Login endpoint
 * Validates password against AUTH_TOKEN using timing-safe comparison
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { password } = req.body;

  // If auth is disabled, return success with dummy token
  if (!env.AUTH_ENABLED) {
    res.status(200).json({
      success: true,
      token: 'dev-mode-no-auth',
    });
    return;
  }

  // Validate password is provided and not just whitespace
  if (!password || !password.trim()) {
    throw new UnauthorizedError('Password is required');
  }

  // Ensure AUTH_TOKEN is configured
  if (!env.AUTH_TOKEN) {
    throw new Error('AUTH_TOKEN is not configured');
  }

  // Validate password matches AUTH_TOKEN using timing-safe comparison
  // Convert strings to buffers for timingSafeEqual
  const passwordBuffer = Buffer.from(password);
  const tokenBuffer = Buffer.from(env.AUTH_TOKEN);

  // Use timing-safe comparison to prevent timing attacks
  let isValid = false;
  if (passwordBuffer.length === tokenBuffer.length) {
    isValid = timingSafeEqual(passwordBuffer, tokenBuffer);
  }

  if (!isValid) {
    throw new UnauthorizedError('Invalid password');
  }

  // Return success with the password the user entered (they already know it)
  // Don't return env.AUTH_TOKEN to avoid exposing it in responses
  res.status(200).json({
    success: true,
    token: password,
  });
}
