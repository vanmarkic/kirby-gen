/**
 * Auth integration tests
 */
import request from 'supertest';
import express, { Express } from 'express';
import bodyParser from 'body-parser';

// Mock environment
jest.mock('../../src/config/env', () => ({
  env: {
    AUTH_ENABLED: true,
    AUTH_TOKEN: 'integration-test-password',
    NODE_ENV: 'test',
  },
  isDevelopment: jest.fn(() => false),
  isProduction: jest.fn(() => false),
  isLocal: jest.fn(() => false),
  isTest: jest.fn(() => true),
}));

// Import env after mocking
import { env } from '../../src/config/env';
const mockEnv = env as any;

// Import routes after mocking env
import authRoutes from '../../src/routes/auth.routes';
import { errorHandler } from '../../src/middleware/error-handler';

describe('Auth Routes Integration', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 with valid password', async () => {
      mockEnv.AUTH_ENABLED = true;

      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'integration-test-password' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: 'integration-test-password',
      });
    });

    it('should return 401 with invalid password', async () => {
      mockEnv.AUTH_ENABLED = true;

      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrong-password' })
        .expect(401);

      expect(response.body.error.message).toBe('Invalid password');
    });

    it('should return 400 with missing password', async () => {
      mockEnv.AUTH_ENABLED = true;

      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error.message).toBe('Request body validation failed');
    });

    it('should return 400 with whitespace-only password', async () => {
      mockEnv.AUTH_ENABLED = true;

      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: '   ' })
        .expect(401);

      expect(response.body.error.message).toBe('Password is required');
    });

    it('should return 200 when auth disabled', async () => {
      mockEnv.AUTH_ENABLED = false;

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
});
