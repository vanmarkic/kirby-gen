/**
 * Environment variable validation and configuration
 */
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['local', 'development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  HOST: z.string().default('0.0.0.0'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5176'),
  CORS_CREDENTIALS: z.string().default('true').transform((val) => val === 'true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // File Upload
  MAX_FILE_SIZE: z.string().default('52428800').transform(Number), // 50MB
  UPLOAD_DIR: z.string().default('./data/uploads'),

  // Storage
  STORAGE_DIR: z.string().default('./data/storage'),
  SESSION_DIR: z.string().default('./data/sessions'),

  // Git
  GIT_USER_NAME: z.string().default('Kirby Generator'),
  GIT_USER_EMAIL: z.string().default('generator@kirby-gen.local'),

  // Deployment
  DEPLOYMENT_DIR: z.string().default('./data/deployments'),
  DEPLOYMENT_PORT_START: z.string().default('4000').transform(Number),

  // Skills Server
  SKILLS_SERVER_URL: z.string().default('http://localhost:5000'),
  SKILLS_TIMEOUT_MS: z.string().default('300000').transform(Number), // 5 minutes

  // Kirby Generator
  KIRBY_GENERATOR_PATH: z.string().default('../kirby-generator'),

  // Auth (simple token for MVP)
  AUTH_TOKEN: z.string().optional(),
  AUTH_ENABLED: z.string().default('false').transform((val) => val === 'true'),

  // WebSocket
  WS_PING_INTERVAL: z.string().default('30000').transform(Number),
  WS_PING_TIMEOUT: z.string().default('60000').transform(Number),

  // Claude AI
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  CLAUDE_USE_CLI: z.string().default('false').transform((val) => val === 'true'),
  CLAUDE_CLI_SCRIPT: z.string().default('./scripts/claude-cli.sh'),
  CLAUDE_CLI_OUTPUT_DIR: z.string().default('./data/claude-output'),
});

/**
 * Validate and export environment variables
 */
export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    console.error(JSON.stringify(error.errors, null, 2));
    process.exit(1);
  }
  throw error;
}

export { env };

/**
 * Check if running in local mode
 */
export const isLocal = () => env.NODE_ENV === 'local';

/**
 * Check if running in production
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = () => env.NODE_ENV === 'test';
