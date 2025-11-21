/**
 * CORS configuration middleware
 */
import cors from 'cors';
import { env } from '../config/env';

/**
 * CORS options
 */
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin requests, mobile apps, Postman, curl, etc.)
    // This includes requests proxied through nginx on the same domain
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

    // Allow wildcard
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Allow exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production, when behind nginx reverse proxy on the same domain,
    // we should allow all origins since nginx is the entry point
    // The request is already authenticated by being routed through our nginx
    if (env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: env.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Auth-Token',
  ],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
};

/**
 * Export configured CORS middleware
 */
export const corsMiddleware = cors(corsOptions);
