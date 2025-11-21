/**
 * Express application configuration
 * Configures middleware, routes, and error handling
 */
import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors';
import { requestLogger, requestId } from './middleware/request-logger';
import { apiLimiter } from './middleware/rate-limiter';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import routes from './routes';
import { logger } from './config/logger';
import { env } from './config/env';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  logger.info('Configuring Express application');

  /**
   * Trust proxy - required when behind reverse proxy (Coolify, nginx, etc.)
   * This allows Express to correctly identify client IP from X-Forwarded-* headers
   */
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  /**
   * Security middleware
   */
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false,
  }));

  /**
   * CORS middleware
   */
  app.use(corsMiddleware);

  /**
   * Request parsing middleware
   */
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  /**
   * Request logging and tracking
   */
  app.use(requestId);
  app.use(requestLogger);

  /**
   * Rate limiting (only in production)
   */
  if (env.NODE_ENV === 'production') {
    app.use('/api', apiLimiter);
  }

  /**
   * API routes
   */
  app.use('/api', routes);

  /**
   * Root endpoint
   */
  app.get('/', (req, res) => {
    res.json({
      name: 'Kirby-Gen API',
      version: '0.1.0',
      status: 'running',
      environment: env.NODE_ENV,
      documentation: '/api/info',
    });
  });

  /**
   * 404 handler
   */
  app.use(notFoundHandler);

  /**
   * Error handler (must be last)
   */
  app.use(errorHandler);

  logger.info('Express application configured');

  return app;
}
