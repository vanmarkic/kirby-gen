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
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
