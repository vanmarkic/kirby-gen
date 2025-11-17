/**
 * Rate limiting middleware
 */
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ResponseBuilder } from '../utils/response';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      ResponseBuilder.error(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests, please try again later',
        429,
        {
          retryAfter: res.getHeader('Retry-After'),
        }
      )
    );
  },
});

/**
 * Strict rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per window
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json(
      ResponseBuilder.error(
        'UPLOAD_RATE_LIMIT_EXCEEDED',
        'Too many upload requests, please try again later',
        429
      )
    );
  },
});

/**
 * Very strict rate limiter for generation endpoints
 */
export const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 generations per hour
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json(
      ResponseBuilder.error(
        'GENERATION_RATE_LIMIT_EXCEEDED',
        'Too many generation requests, please try again later',
        429,
        {
          limit: 10,
          window: '1 hour',
        }
      )
    );
  },
});
