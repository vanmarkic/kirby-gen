/**
 * Global error handling middleware
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ResponseBuilder } from '../utils/response';
import { logError } from '../config/logger';
import { ZodError } from 'zod';

/**
 * Error handler middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // Handle AppError (custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json(
      ResponseBuilder.error('VALIDATION_ERROR', 'Request validation failed', 400, {
        issues: err.errors,
      })
    );
    return;
  }

  // Handle Multer file upload errors
  if (err.name === 'MulterError') {
    const multerErr = err as Error & { code?: string };
    let message = 'File upload error';

    switch (multerErr.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the maximum allowed limit';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
    }

    res.status(400).json(
      ResponseBuilder.error('FILE_UPLOAD_ERROR', message, 400, {
        code: multerErr.code,
      })
    );
    return;
  }

  // Handle generic errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json(
    ResponseBuilder.error('INTERNAL_ERROR', message, statusCode, {
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    })
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json(
    ResponseBuilder.error(
      'NOT_FOUND',
      `Route ${req.method} ${req.path} not found`,
      404
    )
  );
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
