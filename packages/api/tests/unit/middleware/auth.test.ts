/**
 * Auth middleware unit tests
 */
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from '../../../src/middleware/auth';
import { UnauthorizedError } from '../../../src/utils/errors';

// Mock environment
const mockEnv = {
  AUTH_ENABLED: true,
  AUTH_TOKEN: 'test-secret-token',
};

jest.mock('../../../src/config/env', () => ({
  env: mockEnv,
}));

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next() if auth is disabled', () => {
      mockEnv.AUTH_ENABLED = false;

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() with valid x-auth-token header', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        'x-auth-token': 'test-secret-token',
      };

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() with valid authorization header', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        authorization: 'test-secret-token',
      };

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() with valid Bearer token', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        authorization: 'Bearer test-secret-token',
      };

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should throw UnauthorizedError if no token provided', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {};

      expect(() => {
        authenticate(req as Request, res as Response, next);
      }).toThrow(UnauthorizedError);

      expect(() => {
        authenticate(req as Request, res as Response, next);
      }).toThrow('No authentication token provided');

      expect(next).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if token is invalid', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        'x-auth-token': 'invalid-token',
      };

      expect(() => {
        authenticate(req as Request, res as Response, next);
      }).toThrow(UnauthorizedError);

      expect(() => {
        authenticate(req as Request, res as Response, next);
      }).toThrow('Invalid authentication token');

      expect(next).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if Bearer token is invalid', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        authorization: 'Bearer invalid-token',
      };

      expect(() => {
        authenticate(req as Request, res as Response, next);
      }).toThrow(UnauthorizedError);

      expect(next).not.toHaveBeenCalled();
    });

    it('should handle array of tokens', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        authorization: ['test-secret-token'] as any,
      };

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('optionalAuth', () => {
    it('should call next() if auth is disabled', () => {
      mockEnv.AUTH_ENABLED = false;

      optionalAuth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() if no token provided', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {};

      optionalAuth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() with valid token', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        'x-auth-token': 'test-secret-token',
      };

      optionalAuth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should throw UnauthorizedError if token is provided but invalid', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        'x-auth-token': 'invalid-token',
      };

      expect(() => {
        optionalAuth(req as Request, res as Response, next);
      }).toThrow(UnauthorizedError);

      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() with valid Bearer token', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        authorization: 'Bearer test-secret-token',
      };

      optionalAuth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should throw UnauthorizedError if Bearer token is invalid', () => {
      mockEnv.AUTH_ENABLED = true;
      req.headers = {
        authorization: 'Bearer invalid-token',
      };

      expect(() => {
        optionalAuth(req as Request, res as Response, next);
      }).toThrow(UnauthorizedError);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
