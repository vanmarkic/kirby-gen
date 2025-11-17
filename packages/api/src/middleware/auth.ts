/**
 * Simple authentication middleware (MVP)
 * For production, replace with JWT or OAuth
 */
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { env } from '../config/env';

/**
 * Simple token-based authentication
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth if disabled
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }

  // Get token from header
  const token = req.headers['x-auth-token'] || req.headers['authorization'];

  if (!token) {
    throw new UnauthorizedError('No authentication token provided');
  }

  // Validate token
  const authToken = typeof token === 'string'
    ? token.replace('Bearer ', '')
    : token[0];

  if (authToken !== env.AUTH_TOKEN) {
    throw new UnauthorizedError('Invalid authentication token');
  }

  next();
}

/**
 * Optional authentication
 * Doesn't fail if token is missing, but validates if present
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth if disabled
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }

  const token = req.headers['x-auth-token'] || req.headers['authorization'];

  if (!token) {
    next();
    return;
  }

  // Validate token if present
  const authToken = typeof token === 'string'
    ? token.replace('Bearer ', '')
    : token[0];

  if (authToken !== env.AUTH_TOKEN) {
    throw new UnauthorizedError('Invalid authentication token');
  }

  next();
}
