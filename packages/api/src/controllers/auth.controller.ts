/**
 * Authentication controller
 */
import { Request, Response } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

/**
 * Login endpoint
 * Validates password against AUTH_TOKEN
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

  // Validate password is provided
  if (!password) {
    throw new UnauthorizedError('Password is required');
  }

  // Validate password matches AUTH_TOKEN
  if (password !== env.AUTH_TOKEN) {
    throw new UnauthorizedError('Invalid password');
  }

  // Return success with token
  res.status(200).json({
    success: true,
    token: env.AUTH_TOKEN,
  });
}
