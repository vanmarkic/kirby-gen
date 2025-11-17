/**
 * Request logging middleware
 */
import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../config/logger';

/**
 * Log HTTP requests
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logRequest(req, res, duration);
  });

  next();
}

/**
 * Add request ID to all requests
 */
export function requestId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
}
