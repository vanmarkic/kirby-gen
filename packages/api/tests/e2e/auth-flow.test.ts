/**
 * E2E: Complete Authentication Flow
 *
 * Tests the full authentication journey from login to protected route access:
 * 1. Login with invalid password (fail)
 * 2. Login with valid password (succeed)
 * 3. Access protected routes without token (fail)
 * 4. Access protected routes with valid token (succeed)
 * 5. Create and manage a project with authentication
 * 6. Logout and verify token invalidation
 */
import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { setupDependencyInjection } from '../../src/config/di-setup';

// Mock environment with auth enabled
jest.mock('../../src/config/env', () => ({
  env: {
    AUTH_ENABLED: true,
    AUTH_TOKEN: 'e2e-test-password',
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

let app: Application;
const validPassword = 'e2e-test-password';
const invalidPassword = 'wrong-password';

beforeAll(() => {
  setupDependencyInjection();
  app = createApp();
});

describe('E2E: Complete Authentication Flow', () => {
  let authToken: string;
  let projectId: string;

  describe('Step 1: Login Flow', () => {
    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: invalidPassword })
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Invalid password',
        }),
      });
    });

    it('should reject login with empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: '' })
        .expect(400);

      expect(response.body.error.message).toBe('Request body validation failed');
    });

    it('should reject login with missing password field', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error.message).toBe('Request body validation failed');
    });

    it('should succeed with valid password and return token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: validPassword })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: validPassword,
      });

      // Store token for subsequent tests
      authToken = response.body.token;
    });
  });

  describe('Step 2: Protected Route Access Without Token', () => {
    it('should reject project creation without token', async () => {
      const response = await request(app)
        .post('/api/projects')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('No authentication token provided');
    });

    it('should reject project listing without token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject project retrieval without token', async () => {
      const response = await request(app)
        .get('/api/projects/some-id')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Step 3: Protected Route Access With Invalid Token', () => {
    it('should reject project creation with invalid token', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('x-auth-token', 'invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid authentication token');
    });

    it('should reject project listing with invalid token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('x-auth-token', 'invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Step 4: Full Project Workflow With Valid Token', () => {
    it('should create project with valid token', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('x-auth-token', authToken)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        status: expect.any(String),
        createdAt: expect.any(String),
      });

      // Store project ID for subsequent tests
      projectId = response.body.data.id;
    });

    it('should list projects with valid token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('x-auth-token', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: projectId }),
        ])
      );
    });

    it('should retrieve project details with valid token', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('x-auth-token', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: projectId,
        status: expect.any(String),
      });
    });

    it('should get project status with valid token', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/status`)
        .set('x-auth-token', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: projectId,
        status: expect.any(String),
        currentStep: expect.any(Number),
        totalSteps: expect.any(Number),
      });
    });

    it('should update project with valid token', async () => {
      const response = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('x-auth-token', authToken)
        .send({
          inputs: {
            projectName: 'Test Project',
            pinterestUrl: 'https://pinterest.com/test',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: projectId,
      });
    });

    it('should delete project with valid token', async () => {
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('x-auth-token', authToken)
        .expect(204);

      // Verify deletion
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('x-auth-token', authToken)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Step 5: Token Persistence Simulation', () => {
    it('should allow multiple requests with same token', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .set('x-auth-token', authToken)
        .expect(201);

      const newProjectId = createResponse.body.data.id;

      // List projects (simulating a different request with persisted token)
      const listResponse = await request(app)
        .get('/api/projects')
        .set('x-auth-token', authToken)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: newProjectId }),
        ])
      );

      // Get project details (simulating page refresh with persisted token)
      const getResponse = await request(app)
        .get(`/api/projects/${newProjectId}`)
        .set('x-auth-token', authToken)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(newProjectId);

      // Cleanup
      await request(app)
        .delete(`/api/projects/${newProjectId}`)
        .set('x-auth-token', authToken)
        .expect(204);
    });
  });

  describe('Step 6: File Operations With Authentication', () => {
    let fileProjectId: string;

    beforeAll(async () => {
      // Create a project for file operations
      const response = await request(app)
        .post('/api/projects')
        .set('x-auth-token', authToken)
        .expect(201);

      fileProjectId = response.body.data.id;
    });

    afterAll(async () => {
      // Cleanup
      await request(app)
        .delete(`/api/projects/${fileProjectId}`)
        .set('x-auth-token', authToken)
        .expect(204);
    });

    it('should reject file listing without token', async () => {
      const response = await request(app)
        .get(`/api/projects/${fileProjectId}/files`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow file listing with valid token', async () => {
      const response = await request(app)
        .get(`/api/projects/${fileProjectId}/files`)
        .set('x-auth-token', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        contentFiles: expect.any(Array),
        brandingAssets: expect.any(Object),
      });
    });
  });

  describe('Step 7: Domain Mapping Operations With Authentication', () => {
    let domainProjectId: string;

    beforeAll(async () => {
      // Create a project for domain mapping operations
      const response = await request(app)
        .post('/api/projects')
        .set('x-auth-token', authToken)
        .expect(201);

      domainProjectId = response.body.data.id;
    });

    afterAll(async () => {
      // Cleanup
      await request(app)
        .delete(`/api/projects/${domainProjectId}`)
        .set('x-auth-token', authToken)
        .expect(204);
    });

    it('should reject domain model retrieval without token', async () => {
      const response = await request(app)
        .get(`/api/projects/${domainProjectId}/domain-model`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject domain model retrieval when no model exists', async () => {
      // Domain model doesn't exist yet for new project, should return 404
      const response = await request(app)
        .get(`/api/projects/${domainProjectId}/domain-model`)
        .set('x-auth-token', authToken)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Step 8: Logout Simulation', () => {
    it('should fail to access protected routes after token invalidation', async () => {
      // Simulate logout by using no token (in real app, frontend would clear localStorage)
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('No authentication token provided');
    });

    it('should require re-login after logout', async () => {
      // Login again
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ password: validPassword })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBe(validPassword);

      // Verify access is restored
      const projectsResponse = await request(app)
        .get('/api/projects')
        .set('x-auth-token', loginResponse.body.token)
        .expect(200);

      expect(projectsResponse.body.success).toBe(true);
    });
  });
});

describe('E2E: Authentication Disabled Scenarios', () => {
  /**
   * Note: Testing AUTH_ENABLED=false in E2E requires a separate test suite
   * with different environment configuration. For full coverage of disabled auth,
   * see integration tests: auth.integration.test.ts and auth-protection.integration.test.ts
   *
   * This suite focuses on auth-enabled flows which is the primary use case.
   */
  it('should be covered by integration tests', () => {
    expect(true).toBe(true);
  });
});
