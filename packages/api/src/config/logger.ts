/**
 * Winston logger configuration
 */
import winston from 'winston';
import { env, isDevelopment } from './env';

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

/**
 * Create transports based on environment
 */
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: isDevelopment() ? consoleFormat : logFormat,
  }),
];

// Add file transport if LOG_FILE is specified
if (env.LOG_FILE) {
  transports.push(
    new winston.transports.File({
      filename: env.LOG_FILE,
      format: logFormat,
    })
  );

  // Add error-only file
  transports.push(
    new winston.transports.File({
      filename: env.LOG_FILE.replace(/\.log$/, '.error.log'),
      level: 'error',
      format: logFormat,
    })
  );
}

/**
 * Create and export logger instance
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Create a child logger with additional context
 */
export const createLogger = (context: string) => {
  return logger.child({ context });
};

/**
 * Express request logger
 */
export const logRequest = (
  req: { method: string; originalUrl: string; ip?: string; headers: Record<string, string | string[] | undefined> },
  res: { statusCode: number },
  duration: number
) => {
  const { method, originalUrl, ip, headers } = req;
  const { statusCode } = res;

  logger.info('HTTP Request', {
    method,
    url: originalUrl,
    statusCode,
    duration: `${duration}ms`,
    ip,
    userAgent: headers['user-agent'],
  });
};

/**
 * Log error with context
 */
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
};

/**
 * Log workflow progress
 */
export const logWorkflowProgress = (
  projectId: string,
  phase: string,
  message: string,
  data?: unknown
) => {
  logger.info('Workflow Progress', {
    projectId,
    phase,
    message,
    data,
  });
};
