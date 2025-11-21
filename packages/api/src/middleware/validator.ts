/**
 * Request validation middleware using Zod
 */
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Security limits for Claude API inputs
 * Prevents excessive token usage and potential abuse
 */
export const CLAUDE_INPUT_LIMITS = {
  MAX_MESSAGE_LENGTH: 5000, // characters per message
  MAX_CONVERSATION_HISTORY: 50, // messages in conversation
  MAX_CONTENT_FILES: 20, // files per request
  MAX_FIELD_COUNT: 100, // fields per entity
} as const;

/**
 * Validate request against a Zod schema
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Request validation failed', error.errors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body only
 */
export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Request body validation failed', error.errors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate query parameters only
 */
export function validateQuery(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Query validation failed', error.errors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate URL parameters only
 */
export function validateParams(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('URL parameters validation failed', error.errors));
      } else {
        next(error);
      }
    }
  };
}
