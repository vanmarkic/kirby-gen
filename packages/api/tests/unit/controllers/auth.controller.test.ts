/**
 * Auth controller unit tests
 */
import { Request, Response } from 'express';
import { login } from '../../../src/controllers/auth.controller';
import { UnauthorizedError } from '../../../src/utils/errors';

// Mock environment
jest.mock('../../../src/config/env', () => ({
  env: {
    AUTH_ENABLED: true,
    AUTH_TOKEN: 'test-password-123',
  },
}));

// Import env after mocking
import { env } from '../../../src/config/env';
const mockEnv = env as any;

describe('Auth Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      body: {},
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return success with valid password', async () => {
      mockEnv.AUTH_ENABLED = true;
      req.body = { password: 'test-password-123' };

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        token: 'test-password-123',
      });
    });

    it('should return error with invalid password', async () => {
      mockEnv.AUTH_ENABLED = true;
      req.body = { password: 'wrong-password' };

      await expect(login(req as Request, res as Response)).rejects.toThrow(UnauthorizedError);
      await expect(login(req as Request, res as Response)).rejects.toThrow('Invalid password');
    });

    it('should return error with missing password', async () => {
      mockEnv.AUTH_ENABLED = true;
      req.body = {};

      await expect(login(req as Request, res as Response)).rejects.toThrow(UnauthorizedError);
      await expect(login(req as Request, res as Response)).rejects.toThrow('Password is required');
    });

    it('should return success when auth is disabled', async () => {
      mockEnv.AUTH_ENABLED = false;
      req.body = { password: 'any-password' };

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        token: 'dev-mode-no-auth',
      });
    });
  });
});
