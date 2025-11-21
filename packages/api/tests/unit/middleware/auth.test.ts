/**
 * Authentication middleware tests
 * Following TDD principles - these tests verify auth behavior
 */
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from '../../../src/middleware/auth';
import { env } from '../../../src/config/env';
import { UnauthorizedError } from '../../../src/utils/errors';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('authenticate()', () => {
    describe('when AUTH_ENABLED is false', () => {
      beforeEach(() => {
        (env as any).AUTH_ENABLED = false;
      });

      it('should allow request without token', () => {
        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow request with invalid token', () => {
        mockRequest.headers = { 'x-auth-token': 'invalid-token' };

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Poka-Yoke: Environment defaults', () => {
    it('should have AUTH_ENABLED default to false in env config', () => {
      expect(env.AUTH_ENABLED).toBe(false);
    });
  });
});
