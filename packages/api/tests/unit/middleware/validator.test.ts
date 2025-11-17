/**
 * Validator middleware unit tests
 */
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
} from '../../../src/middleware/validator';
import { ValidationError } from '../../../src/utils/errors';

describe('Validator Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate request with valid data', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
        query: z.object({}),
        params: z.object({}),
      });

      req.body = { name: 'John', age: 30 };

      const middleware = validate(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ValidationError if validation fails', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
        query: z.object({}),
        params: z.object({}),
      });

      req.body = { name: 'John', age: 'invalid' }; // Invalid age type

      const middleware = validate(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Request validation failed');
    });

    it('should validate all parts of request', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
        }),
        query: z.object({
          page: z.string(),
        }),
        params: z.object({
          id: z.string(),
        }),
      });

      req.body = { name: 'John' };
      req.query = { page: '1' };
      req.params = { id: '123' };

      const middleware = validate(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateBody', () => {
    it('should validate request body with valid data', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      req.body = { name: 'John', email: 'john@example.com' };

      const middleware = validateBody(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ValidationError if body validation fails', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      req.body = { name: 'John', email: 'invalid-email' };

      const middleware = validateBody(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Request body validation failed');
    });

    it('should update req.body with parsed data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.string().transform((val) => parseInt(val, 10)),
      });

      req.body = { name: 'John', age: '30' };

      const middleware = validateBody(schema);
      await middleware(req as Request, res as Response, next);

      expect(req.body.age).toBe(30);
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle complex nested schemas', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
        tags: z.array(z.string()),
      });

      req.body = {
        user: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'NYC',
          },
        },
        tags: ['tag1', 'tag2'],
      };

      const middleware = validateBody(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters with valid data', async () => {
      const schema = z.object({
        page: z.string(),
        limit: z.string(),
      });

      req.query = { page: '1', limit: '10' };

      const middleware = validateQuery(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ValidationError if query validation fails', async () => {
      const schema = z.object({
        page: z.string().regex(/^\d+$/),
      });

      req.query = { page: 'invalid' };

      const middleware = validateQuery(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Query validation failed');
    });

    it('should update req.query with parsed data', async () => {
      const schema = z.object({
        page: z.string().transform((val) => parseInt(val, 10)),
      });

      req.query = { page: '5' };

      const middleware = validateQuery(schema);
      await middleware(req as Request, res as Response, next);

      expect(req.query.page).toBe(5);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateParams', () => {
    it('should validate URL parameters with valid data', async () => {
      const schema = z.object({
        projectId: z.string().uuid(),
      });

      req.params = { projectId: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validateParams(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ValidationError if params validation fails', async () => {
      const schema = z.object({
        projectId: z.string().uuid(),
      });

      req.params = { projectId: 'invalid-uuid' };

      const middleware = validateParams(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('URL parameters validation failed');
    });

    it('should update req.params with parsed data', async () => {
      const schema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });

      req.params = { id: '42' };

      const middleware = validateParams(schema);
      await middleware(req as Request, res as Response, next);

      expect(req.params.id).toBe(42);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('error handling', () => {
    it('should pass through non-Zod errors', async () => {
      const schema = z.object({
        name: z.string(),
      });

      // Mock parseAsync to throw a non-Zod error
      const originalParseAsync = schema.parseAsync;
      schema.parseAsync = jest.fn().mockRejectedValue(new Error('Custom error'));

      req.body = { name: 'John' };

      const middleware = validateBody(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Custom error');
      expect(error).not.toBeInstanceOf(ValidationError);

      // Restore
      schema.parseAsync = originalParseAsync;
    });

    it('should include validation details in error', async () => {
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      req.body = { name: 'Jo', email: 'invalid' };

      const middleware = validateBody(schema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0] as ValidationError;
      expect(error.details).toBeDefined();
      expect(Array.isArray(error.details)).toBe(true);
    });
  });
});
