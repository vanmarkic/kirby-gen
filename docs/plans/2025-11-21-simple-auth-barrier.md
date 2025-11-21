# Simple Authentication Barrier Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Protect the Kirby-Gen application during development with a simple password barrier on frontend and enforced token authentication on backend.

**Architecture:** Add React-based login page with auth context for state management, protect all routes with authentication guard, add backend login endpoint for password validation, and enforce existing auth middleware on all API routes.

**Tech Stack:** React, React Context API, TypeScript, Express, Zod validation, Jest, React Testing Library

---

## Prerequisites

- Already in worktree: `/Users/dragan/Documents/kirby-gen/.worktrees/feature-simple-auth`
- Design document: `docs/plans/2025-11-21-simple-auth-barrier-design.md`
- Existing auth middleware: `packages/api/src/middleware/auth.ts` (already tested)

---

## Task 1: Backend - Add Login API Endpoint

**Files:**
- Create: `packages/api/src/routes/auth.routes.ts`
- Create: `packages/api/src/controllers/auth.controller.ts`
- Modify: `packages/api/src/routes/index.ts`
- Test: `packages/api/tests/unit/controllers/auth.controller.test.ts`

### Step 1: Write the failing test for login controller

**File:** `packages/api/tests/unit/controllers/auth.controller.test.ts`

```typescript
/**
 * Auth controller unit tests
 */
import { Request, Response } from 'express';
import { login } from '../../../src/controllers/auth.controller';
import { UnauthorizedError } from '../../../src/utils/errors';

// Mock environment
const mockEnv = {
  AUTH_ENABLED: true,
  AUTH_TOKEN: 'test-password-123',
};

jest.mock('../../../src/config/env', () => ({
  env: mockEnv,
}));

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
```

### Step 2: Run test to verify it fails

```bash
cd packages/api
npm test -- tests/unit/controllers/auth.controller.test.ts
```

**Expected:** FAIL with "Cannot find module '../../../src/controllers/auth.controller'"

### Step 3: Write minimal implementation for auth controller

**File:** `packages/api/src/controllers/auth.controller.ts`

```typescript
/**
 * Authentication controller
 */
import { Request, Response } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

/**
 * Login endpoint
 * Validates password against AUTH_TOKEN
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { password } = req.body;

  // If auth is disabled, return success with dummy token
  if (!env.AUTH_ENABLED) {
    res.status(200).json({
      success: true,
      token: 'dev-mode-no-auth',
    });
    return;
  }

  // Validate password is provided
  if (!password) {
    throw new UnauthorizedError('Password is required');
  }

  // Validate password matches AUTH_TOKEN
  if (password !== env.AUTH_TOKEN) {
    throw new UnauthorizedError('Invalid password');
  }

  // Return success with token
  res.status(200).json({
    success: true,
    token: env.AUTH_TOKEN,
  });
}
```

### Step 4: Run test to verify it passes

```bash
cd packages/api
npm test -- tests/unit/controllers/auth.controller.test.ts
```

**Expected:** PASS (4 tests)

### Step 5: Create auth routes

**File:** `packages/api/src/routes/auth.routes.ts`

```typescript
/**
 * Authentication routes
 */
import { Router } from 'express';
import { z } from 'zod';
import { login } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error-handler';
import { validateBody } from '../middleware/validator';

const router = Router();

/**
 * Validation schemas
 */
const loginSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Routes
 */

// POST /api/auth/login - Login with password
router.post(
  '/login',
  validateBody(loginSchema.shape.body),
  asyncHandler(login)
);

export default router;
```

### Step 6: Register auth routes in main router

**File:** `packages/api/src/routes/index.ts`

Find the existing router setup and add auth routes:

```typescript
import authRoutes from './auth.routes';

// ... existing imports

// Register routes
router.use('/auth', authRoutes);
// ... existing route registrations
```

### Step 7: Test login endpoint integration

Create integration test:

**File:** `packages/api/tests/integration/auth.integration.test.ts`

```typescript
/**
 * Auth integration tests
 */
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../src/routes/auth.routes';
import { errorHandler } from '../../src/middleware/error-handler';
import bodyParser from 'body-parser';

// Mock environment
const mockEnv = {
  AUTH_ENABLED: true,
  AUTH_TOKEN: 'integration-test-password',
};

jest.mock('../../src/config/env', () => ({
  env: mockEnv,
}));

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

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 with missing password', async () => {
      mockEnv.AUTH_ENABLED = true;

      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
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
```

### Step 8: Run integration tests

```bash
cd packages/api
npm test -- tests/integration/auth.integration.test.ts
```

**Expected:** PASS (4 tests)

### Step 9: Commit backend login endpoint

```bash
git add packages/api/src/controllers/auth.controller.ts \
        packages/api/src/routes/auth.routes.ts \
        packages/api/src/routes/index.ts \
        packages/api/tests/unit/controllers/auth.controller.test.ts \
        packages/api/tests/integration/auth.integration.test.ts

git commit -m "feat(api): add login endpoint for password authentication

- Add auth controller with password validation
- Create auth routes with Zod validation
- Register auth routes in main router
- Add unit and integration tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Backend - Enforce Authentication on All Routes

**Files:**
- Modify: `packages/api/src/routes/project.routes.ts`
- Modify: `packages/api/src/routes/file.routes.ts`
- Modify: `packages/api/src/routes/generation.routes.ts`
- Modify: `packages/api/src/routes/domain-mapping.routes.ts`

### Step 1: Update project routes to use authenticate middleware

**File:** `packages/api/src/routes/project.routes.ts`

Replace all `optionalAuth` with `authenticate` except on health/public routes:

```typescript
// Before:
router.post('/', optionalAuth, asyncHandler(createProject));
router.get('/', optionalAuth, validateQuery(...), asyncHandler(listProjects));

// After:
router.post('/', authenticate, asyncHandler(createProject));
router.get('/', authenticate, validateQuery(...), asyncHandler(listProjects));
```

Apply to all routes in the file. Keep `authenticate` on delete (already has it).

### Step 2: Update file routes to use authenticate middleware

**File:** `packages/api/src/routes/file.routes.ts`

Replace all `optionalAuth` with `authenticate`.

### Step 3: Update generation routes to use authenticate middleware

**File:** `packages/api/src/routes/generation.routes.ts`

Replace all `optionalAuth` with `authenticate`.

### Step 4: Update domain-mapping routes to use authenticate middleware

**File:** `packages/api/src/routes/domain-mapping.routes.ts`

Replace all `optionalAuth` with `authenticate`.

### Step 5: Test that routes require authentication

Create test to verify routes are protected:

**File:** `packages/api/tests/integration/auth-protection.integration.test.ts`

```typescript
/**
 * Test that all routes require authentication
 */
import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/project.routes';
import fileRoutes from '../../src/routes/file.routes';
import generationRoutes from '../../src/routes/generation.routes';
import domainMappingRoutes from '../../src/routes/domain-mapping.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorHandler } from '../../src/middleware/error-handler';
import bodyParser from 'body-parser';

// Mock environment
const mockEnv = {
  AUTH_ENABLED: true,
  AUTH_TOKEN: 'test-token-123',
};

jest.mock('../../src/config/env', () => ({
  env: mockEnv,
}));

// Mock services
jest.mock('../../src/config/di-setup', () => ({
  container: {
    resolve: jest.fn(() => ({
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

describe('Route Authentication Protection', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/files', fileRoutes);
    app.use('/api/generation', generationRoutes);
    app.use('/api/domain-mapping', domainMappingRoutes);
    app.use(errorHandler);
  });

  describe('Without authentication', () => {
    it('should reject project routes without token', async () => {
      await request(app).post('/api/projects').expect(401);
      await request(app).get('/api/projects').expect(401);
      await request(app).get('/api/projects/test-id').expect(401);
    });

    it('should reject file routes without token', async () => {
      await request(app).post('/api/files/upload/test-id').expect(401);
    });

    it('should reject generation routes without token', async () => {
      await request(app).post('/api/generation/generate/test-id').expect(401);
    });

    it('should allow login route without token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test-token-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('With authentication', () => {
    it('should allow project routes with valid token', async () => {
      // These will fail with 404 or validation errors, not 401
      const res1 = await request(app)
        .get('/api/projects')
        .set('x-auth-token', 'test-token-123');

      expect(res1.status).not.toBe(401);
    });

    it('should reject project routes with invalid token', async () => {
      await request(app)
        .get('/api/projects')
        .set('x-auth-token', 'wrong-token')
        .expect(401);
    });
  });
});
```

### Step 6: Run route protection tests

```bash
cd packages/api
npm test -- tests/integration/auth-protection.integration.test.ts
```

**Expected:** PASS

### Step 7: Commit route protection changes

```bash
git add packages/api/src/routes/*.routes.ts \
        packages/api/tests/integration/auth-protection.integration.test.ts

git commit -m "feat(api): enforce authentication on all API routes

- Replace optionalAuth with authenticate middleware
- Protect all project, file, generation, and domain-mapping routes
- Add integration tests for route protection
- Login endpoint remains public

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Frontend - Create Auth Context

**Files:**
- Create: `packages/web/src/contexts/AuthContext.tsx`
- Create: `packages/web/src/contexts/index.ts`
- Test: `packages/web/src/contexts/__tests__/AuthContext.test.tsx`

### Step 1: Write failing test for AuthContext

**File:** `packages/web/src/contexts/__tests__/AuthContext.test.tsx`

```typescript
/**
 * AuthContext tests
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock fetch
global.fetch = jest.fn();

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('useAuth hook', () => {
    it('should provide initial auth state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should load token from localStorage on mount', () => {
      localStorage.setItem('auth_token', 'stored-token-123');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('stored-token-123');
    });

    it('should login successfully with valid password', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: 'new-token-123' }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.login('correct-password');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('new-token-123');
      expect(localStorage.getItem('auth_token')).toBe('new-token-123');
    });

    it('should throw error with invalid password', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized', message: 'Invalid password' }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login('wrong-password');
        })
      ).rejects.toThrow('Invalid password');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
    });

    it('should logout and clear token', async () => {
      localStorage.setItem('auth_token', 'stored-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should handle loading state during login', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.login('password');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd packages/web
npm test -- src/contexts/__tests__/AuthContext.test.tsx
```

**Expected:** FAIL with "Cannot find module '../AuthContext'"

### Step 3: Create AuthContext implementation

**File:** `packages/web/src/contexts/AuthContext.tsx`

```typescript
/**
 * Authentication context
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = async (password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token
      setToken(data.token);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  const value: AuthContextType = {
    isAuthenticated: !!token,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Step 4: Create context barrel export

**File:** `packages/web/src/contexts/index.ts`

```typescript
export { AuthProvider, useAuth } from './AuthContext';
```

### Step 5: Run tests to verify they pass

```bash
cd packages/web
npm test -- src/contexts/__tests__/AuthContext.test.tsx
```

**Expected:** PASS (6 tests)

### Step 6: Commit AuthContext

```bash
git add packages/web/src/contexts/AuthContext.tsx \
        packages/web/src/contexts/index.ts \
        packages/web/src/contexts/__tests__/AuthContext.test.tsx

git commit -m "feat(web): add authentication context

- Create AuthContext with login/logout functionality
- Persist token in localStorage
- Add loading state management
- Add comprehensive unit tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Frontend - Create Login Page

**Files:**
- Create: `packages/web/src/pages/Login.tsx`
- Test: `packages/web/src/pages/__tests__/Login.test.tsx`

### Step 1: Write failing test for Login page

**File:** `packages/web/src/pages/__tests__/Login.test.tsx`

```typescript
/**
 * Login page tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../Login';
import { AuthProvider } from '../../contexts';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock fetch
global.fetch = jest.fn();

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form', () => {
    renderLogin();

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should show error with empty password', async () => {
    renderLogin();

    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should call login and navigate on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: 'valid-token' }),
    });

    renderLogin();

    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(passwordInput, { target: { value: 'correct-password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error with invalid password', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid password' }),
    });

    renderLogin();

    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderLogin();

    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(loginButton);

    expect(loginButton).toBeDisabled();
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd packages/web
npm test -- src/pages/__tests__/Login.test.tsx
```

**Expected:** FAIL with "Cannot find module '../Login'"

### Step 3: Create Login page component

**File:** `packages/web/src/pages/Login.tsx`

```typescript
/**
 * Login page
 */
import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      await login(password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Kirby-Gen</h1>
        <p className="subtitle">Development Access</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Step 4: Run tests to verify they pass

```bash
cd packages/web
npm test -- src/pages/__tests__/Login.test.tsx
```

**Expected:** PASS (5 tests)

### Step 5: Add basic styles for login page

**File:** `packages/web/src/styles/login.css`

```css
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  color: #333;
}

.login-card .subtitle {
  margin: 0 0 2rem;
  color: #666;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  padding: 0.75rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

button[type="submit"] {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

button[type="submit"]:hover:not(:disabled) {
  background: #5568d3;
}

button[type="submit"]:disabled {
  background: #999;
  cursor: not-allowed;
}
```

### Step 6: Import styles in Login component

Update `packages/web/src/pages/Login.tsx`:

```typescript
import '../styles/login.css';
```

### Step 7: Commit Login page

```bash
git add packages/web/src/pages/Login.tsx \
        packages/web/src/pages/__tests__/Login.test.tsx \
        packages/web/src/styles/login.css

git commit -m "feat(web): add login page component

- Create login page with password input
- Add form validation and error handling
- Add loading state during authentication
- Add login page styles
- Add comprehensive component tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Frontend - Create Protected Route Component

**Files:**
- Create: `packages/web/src/components/ProtectedRoute.tsx`
- Test: `packages/web/src/components/__tests__/ProtectedRoute.test.tsx`

### Step 1: Write failing test for ProtectedRoute

**File:** `packages/web/src/components/__tests__/ProtectedRoute.test.tsx`

```typescript
/**
 * ProtectedRoute tests
 */
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../../contexts';

// Mock useAuth
const mockUseAuth = jest.fn();

jest.mock('../../contexts', () => ({
  ...jest.requireActual('../../contexts'),
  useAuth: () => mockUseAuth(),
}));

const TestComponent = () => <div>Protected Content</div>;

const renderProtectedRoute = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute><TestComponent /></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  it('should render children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading when checking auth', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    renderProtectedRoute();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd packages/web
npm test -- src/components/__tests__/ProtectedRoute.test.tsx
```

**Expected:** FAIL with "Cannot find module '../ProtectedRoute'"

### Step 3: Create ProtectedRoute component

**File:** `packages/web/src/components/ProtectedRoute.tsx`

```typescript
/**
 * Protected route component
 */
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Step 4: Run tests to verify they pass

```bash
cd packages/web
npm test -- src/components/__tests__/ProtectedRoute.test.tsx
```

**Expected:** PASS (3 tests)

### Step 5: Add loading spinner styles

**File:** `packages/web/src/styles/loading.css`

```css
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  color: #666;
  font-size: 0.9rem;
}
```

### Step 6: Import styles in ProtectedRoute

Update `packages/web/src/components/ProtectedRoute.tsx`:

```typescript
import '../styles/loading.css';
```

### Step 7: Commit ProtectedRoute

```bash
git add packages/web/src/components/ProtectedRoute.tsx \
        packages/web/src/components/__tests__/ProtectedRoute.test.tsx \
        packages/web/src/styles/loading.css

git commit -m "feat(web): add protected route component

- Create ProtectedRoute wrapper for auth-gated pages
- Redirect to login when not authenticated
- Show loading state while checking auth
- Add loading spinner styles
- Add component tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Frontend - Update API Client to Include Auth Token

**Files:**
- Modify: `packages/web/src/api/client.ts`
- Test: `packages/web/src/api/__tests__/client.test.ts`

### Step 1: Write test for API client auth headers

**File:** `packages/web/src/api/__tests__/client.test.ts`

```typescript
/**
 * API client tests
 */
import { apiClient } from '../client';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should include auth token in request headers', async () => {
    localStorage.setItem('auth_token', 'test-token-123');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    await apiClient.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-auth-token': 'test-token-123',
        }),
      })
    );
  });

  it('should not include token header when not logged in', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    await apiClient.get('/test');

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['x-auth-token']).toBeUndefined();
  });

  it('should handle 401 errors by clearing token', async () => {
    localStorage.setItem('auth_token', 'expired-token');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(apiClient.get('/test')).rejects.toThrow();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd packages/web
npm test -- src/api/__tests__/client.test.ts
```

**Expected:** FAIL (tests don't pass because auth headers not implemented)

### Step 3: Update API client to include auth token

**File:** `packages/web/src/api/client.ts`

Find the existing client implementation and update it to include auth headers:

```typescript
const AUTH_TOKEN_KEY = 'auth_token';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers['x-auth-token'] = token;
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    // Handle 401 by clearing token and redirecting to login
    if (response.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async put(endpoint: string, data: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(endpoint: string) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiClient = new APIClient(
  import.meta.env.VITE_API_URL || 'http://localhost:3001'
);
```

### Step 4: Run tests to verify they pass

```bash
cd packages/web
npm test -- src/api/__tests__/client.test.ts
```

**Expected:** PASS (3 tests)

### Step 5: Commit API client updates

```bash
git add packages/web/src/api/client.ts \
        packages/web/src/api/__tests__/client.test.ts

git commit -m "feat(web): add authentication headers to API client

- Include auth token in all API requests
- Handle 401 responses by clearing token
- Redirect to login on unauthorized
- Add tests for auth header behavior

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Frontend - Update Routing with Auth

**Files:**
- Modify: `packages/web/src/App.tsx` (or main routing file)
- Modify: `packages/web/src/main.tsx` (add AuthProvider)

### Step 1: Identify main routing file

Check which file contains the routing setup:

```bash
cd packages/web
cat src/App.tsx | head -30
```

### Step 2: Wrap app with AuthProvider

**File:** `packages/web/src/main.tsx`

Add AuthProvider around the app:

```typescript
import { AuthProvider } from './contexts';

// ... existing imports

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### Step 3: Update routing to include login and protected routes

**File:** `packages/web/src/App.tsx`

```typescript
import { Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
// ... existing page imports

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      {/* Add ProtectedRoute to all existing routes */}
    </Routes>
  );
}

export default App;
```

### Step 4: Add logout button to navigation/header

Find the header/nav component and add logout:

**Example:** `packages/web/src/components/Header.tsx`

```typescript
import { useAuth } from '../contexts';
import { useNavigate } from 'react-router-dom';

function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header>
      {/* existing header content */}
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </header>
  );
}
```

### Step 5: Test the integration manually

```bash
cd packages/web
npm run dev
```

Visit http://localhost:5173 and verify:
- Redirects to /login when not authenticated
- Login page accepts password
- Successful login redirects to home
- All pages are accessible when authenticated
- Logout button clears auth and redirects to login

### Step 6: Commit routing updates

```bash
git add packages/web/src/App.tsx \
        packages/web/src/main.tsx \
        packages/web/src/components/Header.tsx

git commit -m "feat(web): integrate authentication into routing

- Wrap app with AuthProvider
- Add login route
- Protect all main routes with ProtectedRoute
- Add logout button to header
- Tested full auth flow manually

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Environment Configuration and Documentation

**Files:**
- Update: `.env.example`
- Update: `packages/web/.env.example`
- Update: `README.md` or `CLAUDE.md`

### Step 1: Update backend .env.example

**File:** `.env.example`

Add auth configuration with clear comments:

```bash
# Authentication (Development Protection)
# Enable/disable authentication barrier
AUTH_ENABLED=true
# Shared password for development access (change this!)
AUTH_TOKEN=change-this-password-now
```

### Step 2: Update frontend .env.example

**File:** `packages/web/.env.example`

```bash
# API URL
VITE_API_URL=http://localhost:3001
```

### Step 3: Update CLAUDE.md with auth info

**File:** `CLAUDE.md`

Add section about authentication:

```markdown
### Authentication

The application uses simple password-based authentication for development protection.

**Enable authentication:**
```bash
# In .env
AUTH_ENABLED=true
AUTH_TOKEN=your-secure-password
```

**Disable authentication:**
```bash
# In .env
AUTH_ENABLED=false
```

When enabled:
- Frontend shows login page on first visit
- All API routes require valid token in `x-auth-token` header
- Token stored in browser localStorage
- Logout clears token and redirects to login

**For production:** Replace with JWT-based authentication or OAuth.
```

### Step 4: Create setup instructions

Add to README or create `docs/authentication.md`:

```markdown
# Authentication Setup

## Development Mode

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Set your development password:
   ```bash
   # Edit .env
   AUTH_ENABLED=true
   AUTH_TOKEN=my-secure-dev-password
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

4. Visit http://localhost:5173 and login with your password

## Disabling Authentication

For local testing without authentication:

```bash
# In .env
AUTH_ENABLED=false
```

All routes will be accessible without login.

## Production Considerations

This simple password barrier is **for development only**. Before production:

1. Replace with JWT-based authentication
2. Add proper user management
3. Use HTTPS for all communication
4. Implement refresh tokens
5. Add rate limiting on login endpoint
6. Consider OAuth/social login

See design document: `docs/plans/2025-11-21-simple-auth-barrier-design.md`
```

### Step 5: Commit documentation

```bash
git add .env.example \
        packages/web/.env.example \
        CLAUDE.md \
        docs/authentication.md

git commit -m "docs: add authentication configuration and setup guide

- Update .env.example with auth settings
- Document authentication in CLAUDE.md
- Add authentication setup guide
- Include production considerations

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: End-to-End Testing

**Files:**
- Create: `packages/api/tests/e2e/auth-flow.test.ts`
- Optional: Create Playwright E2E tests for full frontend flow

### Step 1: Create E2E test for full auth flow

**File:** `packages/api/tests/e2e/auth-flow.test.ts`

```typescript
/**
 * End-to-end auth flow test
 */
import request from 'supertest';
import { app } from '../../src/app';

describe('E2E: Authentication Flow', () => {
  const testPassword = process.env.AUTH_TOKEN || 'test-password';

  it('should complete full authentication flow', async () => {
    // Step 1: Attempt to access protected route without auth
    const unauthorized = await request(app)
      .get('/api/projects')
      .expect(401);

    expect(unauthorized.body.error).toBe('Unauthorized');

    // Step 2: Login with valid password
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ password: testPassword })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.token).toBe(testPassword);

    const token = loginResponse.body.token;

    // Step 3: Access protected route with token
    const authorized = await request(app)
      .get('/api/projects')
      .set('x-auth-token', token)
      .expect(200);

    expect(authorized.body).toBeDefined();

    // Step 4: Attempt with invalid token
    await request(app)
      .get('/api/projects')
      .set('x-auth-token', 'invalid-token')
      .expect(401);
  });

  it('should reject invalid login attempts', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrong-password' })
      .expect(401);

    await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);
  });
});
```

### Step 2: Run E2E tests

```bash
cd packages/api
npm test -- tests/e2e/auth-flow.test.ts
```

**Expected:** PASS

### Step 3: Run all tests to ensure nothing broke

```bash
npm test
```

**Expected:** All tests pass (except pre-existing failures)

### Step 4: Commit E2E tests

```bash
git add packages/api/tests/e2e/auth-flow.test.ts

git commit -m "test: add end-to-end authentication flow tests

- Test full auth flow from login to protected route access
- Verify token validation
- Test error cases (invalid password, missing token)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Final Verification and Cleanup

### Step 1: Run full test suite

```bash
# Backend tests
cd packages/api && npm test

# Frontend tests
cd packages/web && npm test

# Shared package tests
cd packages/shared && npm test
```

### Step 2: Test type checking

```bash
npm run typecheck
```

**Expected:** No new TypeScript errors

### Step 3: Test linting

```bash
npm run lint
```

**Expected:** No linting errors in new code

### Step 4: Manual testing checklist

Start the full application:

```bash
npm run dev
```

Test these scenarios:

- [ ] Visit http://localhost:5173 → redirects to /login
- [ ] Enter wrong password → shows error
- [ ] Enter correct password → redirects to home page
- [ ] Navigate between pages → stays authenticated
- [ ] Refresh page → still authenticated
- [ ] Click logout → redirects to login
- [ ] After logout, try to access pages → redirects to login
- [ ] API calls from frontend include auth token
- [ ] Set AUTH_ENABLED=false → app accessible without login

### Step 5: Update plan status

Create summary document:

**File:** `docs/plans/2025-11-21-simple-auth-barrier-STATUS.md`

```markdown
# Simple Auth Barrier - Implementation Status

**Status:** ✅ COMPLETED
**Date:** 2025-11-21

## Completed Tasks

- [x] Backend login API endpoint with password validation
- [x] Enforced authentication on all API routes
- [x] Frontend AuthContext for state management
- [x] Login page component
- [x] Protected route wrapper
- [x] API client with auth headers
- [x] Updated routing with auth integration
- [x] Environment configuration and documentation
- [x] End-to-end testing
- [x] Manual testing and verification

## Test Results

- Backend unit tests: ✅ PASS
- Backend integration tests: ✅ PASS
- Backend E2E tests: ✅ PASS
- Frontend unit tests: ✅ PASS
- Frontend component tests: ✅ PASS
- Manual testing: ✅ PASS

## Files Created

- `packages/api/src/controllers/auth.controller.ts`
- `packages/api/src/routes/auth.routes.ts`
- `packages/web/src/contexts/AuthContext.tsx`
- `packages/web/src/pages/Login.tsx`
- `packages/web/src/components/ProtectedRoute.tsx`
- `packages/web/src/styles/login.css`
- `packages/web/src/styles/loading.css`
- `docs/authentication.md`

## Files Modified

- `packages/api/src/routes/*.routes.ts` (enforced auth)
- `packages/web/src/api/client.ts` (auth headers)
- `packages/web/src/App.tsx` (routing)
- `packages/web/src/main.tsx` (AuthProvider)
- `.env.example`
- `CLAUDE.md`

## Known Issues

- Pre-existing TypeScript errors in test files (unrelated to auth feature)
- No rate limiting specific to login endpoint (relies on global rate limiting)

## Next Steps (Future)

- Replace with JWT-based authentication
- Add user management and database
- Implement refresh tokens
- Add role-based access control
- Consider OAuth/social login
```

### Step 6: Final commit

```bash
git add docs/plans/2025-11-21-simple-auth-barrier-STATUS.md

git commit -m "docs: mark authentication implementation as complete

Implementation of simple password barrier completed and tested.
All unit, integration, and E2E tests passing. Manual testing
confirms full auth flow works correctly.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 10
**Estimated Time:** 6-8 hours
**Test Coverage:** Unit, Integration, E2E, Manual

**Key Files:**
- Backend: 2 new controllers/routes + tests
- Frontend: 3 new components (AuthContext, Login, ProtectedRoute) + tests
- Documentation: 2 new docs + updated CLAUDE.md
- Tests: ~15 new test files

**Success Criteria:**
- ✅ User cannot access app without password
- ✅ Invalid password shows error
- ✅ Valid password grants access
- ✅ Token persists across refreshes
- ✅ API calls validated with token
- ✅ Logout clears token
- ✅ Authentication toggleable via AUTH_ENABLED
- ✅ All tests passing

---

## Execution Options

**Plan complete and saved to `docs/plans/2025-11-21-simple-auth-barrier.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration with quality gates

**2. Parallel Session (separate)** - Open new session with executing-plans skill, batch execution with checkpoints

**Which approach would you prefer?**
