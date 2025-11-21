/**
 * Auth Protection Integration Tests
 *
 * Verifies that all API routes are properly protected by authentication
 * when AUTH_ENABLED is true.
 */
import request from 'supertest';
import express, { Express } from 'express';
import bodyParser from 'body-parser';

// Mock environment with auth enabled
jest.mock('../../src/config/env', () => ({
  env: {
    AUTH_ENABLED: true,
    AUTH_TOKEN: 'test-auth-token',
    NODE_ENV: 'test',
    PORT: 3001,
    HOST: '0.0.0.0',
    LOG_LEVEL: 'error',
    CORS_ORIGIN: 'http://localhost:5173',
    CORS_CREDENTIALS: true,
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    MAX_FILE_SIZE: 52428800,
    UPLOAD_DIR: './data/uploads',
    STORAGE_DIR: './data/storage',
    SESSION_DIR: './data/sessions',
    GIT_USER_NAME: 'Test User',
    GIT_USER_EMAIL: 'test@example.com',
    DEPLOYMENT_DIR: './data/deployments',
    DEPLOYMENT_PORT_START: 4000,
    SKILLS_SERVER_URL: 'http://localhost:5000',
    SKILLS_TIMEOUT_MS: 300000,
    KIRBY_GENERATOR_PATH: '../kirby-generator',
    WS_PING_INTERVAL: 30000,
    WS_PING_TIMEOUT: 60000,
    CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
    CLAUDE_USE_CLI: false,
    CLAUDE_CLI_SCRIPT: './scripts/claude-cli.sh',
    CLAUDE_CLI_OUTPUT_DIR: './data/claude-output',
  },
  isDevelopment: jest.fn(() => false),
  isProduction: jest.fn(() => false),
  isLocal: jest.fn(() => false),
  isTest: jest.fn(() => true),
}));

// Import after mocking
import { env } from '../../src/config/env';
const mockEnv = env as any;

// Import routes after mocking env
import projectRoutes from '../../src/routes/project.routes';
import fileRoutes from '../../src/routes/file.routes';
import generationRoutes from '../../src/routes/generation.routes';
import domainMappingRoutes from '../../src/routes/domain-mapping.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorHandler } from '../../src/middleware/error-handler';

describe('Auth Protection Integration', () => {
  let app: Express;
  const validToken = 'test-auth-token';
  const invalidToken = 'wrong-token';

  beforeEach(() => {
    // Ensure auth is enabled for all tests
    mockEnv.AUTH_ENABLED = true;
    mockEnv.AUTH_TOKEN = validToken;

    // Create express app with routes
    app = express();
    app.use(bodyParser.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/projects', fileRoutes);
    app.use('/api/projects', generationRoutes);
    app.use('/api/domain-model', domainMappingRoutes);
    app.use('/api/projects', domainMappingRoutes);
    app.use(errorHandler);
  });

  describe('Public Routes', () => {
    it('should allow login without token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: validToken })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: validToken,
      });
    });
  });

  describe('Project Routes Protection', () => {
    it('POST /api/projects should reject requests without token', async () => {
      await request(app)
        .post('/api/projects')
        .expect(401);
    });

    it('POST /api/projects should reject requests with invalid token', async () => {
      await request(app)
        .post('/api/projects')
        .set('x-auth-token', invalidToken)
        .expect(401);
    });

    it('GET /api/projects should reject requests without token', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });

    it('GET /api/projects/:projectId should reject requests without token', async () => {
      await request(app)
        .get('/api/projects/test-id')
        .expect(401);
    });

    it('PUT /api/projects/:projectId should reject requests without token', async () => {
      await request(app)
        .put('/api/projects/test-id')
        .send({ inputs: {} })
        .expect(401);
    });

    it('PATCH /api/projects/:projectId should reject requests without token', async () => {
      await request(app)
        .patch('/api/projects/test-id')
        .send({ inputs: {} })
        .expect(401);
    });

    it('DELETE /api/projects/:projectId should reject requests without token', async () => {
      await request(app)
        .delete('/api/projects/test-id')
        .expect(401);
    });

    it('GET /api/projects/:projectId/status should reject requests without token', async () => {
      await request(app)
        .get('/api/projects/test-id/status')
        .expect(401);
    });

    it('POST /api/projects/:projectId/domain-mapping/init should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/domain-mapping/init')
        .expect(401);
    });

    it('POST /api/projects/:projectId/domain-mapping/message should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/domain-mapping/message')
        .expect(401);
    });
  });

  describe('File Routes Protection', () => {
    it('POST /api/projects/:projectId/files/content should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/files/content')
        .expect(401);
    });

    it('POST /api/projects/:projectId/files/branding should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/files/branding')
        .expect(401);
    });

    it('GET /api/projects/:projectId/files should reject requests without token', async () => {
      await request(app)
        .get('/api/projects/test-id/files')
        .expect(401);
    });

    it('DELETE /api/projects/:projectId/files/:fileId should reject requests without token', async () => {
      await request(app)
        .delete('/api/projects/test-id/files/file-id')
        .expect(401);
    });
  });

  describe('Generation Routes Protection', () => {
    it('POST /api/projects/:projectId/generate should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/generate')
        .expect(401);
    });

    it('GET /api/projects/:projectId/generate should reject requests without token', async () => {
      await request(app)
        .get('/api/projects/test-id/generate')
        .expect(401);
    });

    it('DELETE /api/projects/:projectId/generate should reject requests without token', async () => {
      await request(app)
        .delete('/api/projects/test-id/generate')
        .expect(401);
    });

    it('POST /api/projects/:projectId/generate/retry should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/generate/retry')
        .expect(401);
    });
  });

  describe('Domain Mapping Routes Protection', () => {
    it('POST /api/projects/:projectId/domain-model/generate should reject requests without token', async () => {
      await request(app)
        .post('/api/projects/test-id/domain-model/generate')
        .send({})
        .expect(401);
    });

    it('GET /api/projects/:projectId/domain-model should reject requests without token', async () => {
      await request(app)
        .get('/api/projects/test-id/domain-model')
        .expect(401);
    });

    it('PUT /api/projects/:projectId/domain-model should reject requests without token', async () => {
      await request(app)
        .put('/api/projects/test-id/domain-model')
        .send({ domainModel: { entities: [], relationships: [], schema: {} } })
        .expect(401);
    });

    it('POST /api/domain-model/validate should reject requests without token', async () => {
      await request(app)
        .post('/api/domain-model/validate')
        .send({ domainModel: {} })
        .expect(401);
    });
  });

  describe('Auth Disabled', () => {
    beforeEach(() => {
      mockEnv.AUTH_ENABLED = false;
    });

    it('should allow login without password when auth is disabled', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'any-password' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: 'dev-mode-no-auth',
      });
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent 401 error format', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.any(String),
        }),
      });
    });

    it('should return appropriate error message for missing token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body.error.message).toContain('No authentication token provided');
    });

    it('should return appropriate error message for invalid token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('x-auth-token', invalidToken)
        .expect(401);

      expect(response.body.error.message).toContain('Invalid authentication token');
    });
  });
});
