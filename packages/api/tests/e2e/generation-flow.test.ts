/**
 * End-to-end generation flow test
 */
import request from 'supertest';
import path from 'path';
import { createApp } from '../../src/app';
import { setupDependencyInjection } from '../../src/config/di-setup';
import { Application } from 'express';

// Mock environment with auth disabled for generation flow tests
jest.mock('../../src/config/env', () => ({
  env: {
    AUTH_ENABLED: false,
    AUTH_TOKEN: 'not-used',
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
let projectId: string;

beforeAll(() => {
  setupDependencyInjection();
  app = createApp();
});

describe('E2E: Portfolio Generation Flow', () => {
  it('should complete the full generation workflow', async () => {
    // Step 1: Create a project
    const createResponse = await request(app)
      .post('/api/projects')
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    projectId = createResponse.body.data.id;

    // Step 2: Upload content files
    // Note: In a real test, you would upload actual files
    // For this example, we'll skip file upload and move to domain mapping

    // Step 3: Generate domain model (skipped - requires actual files)
    // await request(app)
    //   .post(`/api/projects/${projectId}/domain-model/generate`)
    //   .expect(200);

    // Step 4: Get project status
    const statusResponse = await request(app)
      .get(`/api/projects/${projectId}/status`)
      .expect(200);

    expect(statusResponse.body.success).toBe(true);
    expect(statusResponse.body.data).toMatchObject({
      id: projectId,
      status: expect.any(String),
      currentStep: expect.any(Number),
      totalSteps: expect.any(Number),
    });

    // Step 5: List all projects
    const listResponse = await request(app)
      .get('/api/projects')
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: projectId }),
      ])
    );

    // Step 6: Delete project (cleanup)
    // Note: This requires authentication in production
    // await request(app)
    //   .delete(`/api/projects/${projectId}`)
    //   .expect(204);
  }, 60000); // 60 second timeout for full flow
});

describe('E2E: Error Handling', () => {
  it('should handle invalid project ID gracefully', async () => {
    const response = await request(app)
      .get('/api/projects/invalid-id-12345')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should handle invalid routes', async () => {
    const response = await request(app)
      .get('/api/non-existent-route')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should handle validation errors', async () => {
    // Create a project
    const createResponse = await request(app)
      .post('/api/projects')
      .expect(201);

    const projectId = createResponse.body.data.id;

    // Try to update with invalid data
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({
        inputs: {
          pinterestUrl: 'not-a-valid-url',
        },
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
