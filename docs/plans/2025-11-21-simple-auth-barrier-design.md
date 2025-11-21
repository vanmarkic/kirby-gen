# Simple Authentication Barrier - Design Document

**Date:** 2025-11-21
**Type:** Security Feature
**Scope:** Frontend + Backend
**Purpose:** Protect application during development phase with simple password barrier

---

## Problem Statement

The Kirby-Gen application is in development and needs basic protection to prevent unauthorized access. The existing auth middleware uses `optionalAuth` on most routes, meaning authentication is not enforced. We need a simple, toggleable authentication barrier that can be easily enabled during development and disabled or upgraded later.

---

## Goals

1. **Protect the frontend** with a login page requiring a password
2. **Enforce authentication** on all API routes (except health checks)
3. **Make it toggleable** via environment variables
4. **Keep it simple** - single shared password, no user management
5. **Make it removable** - easy to disable or upgrade to proper auth later

---

## Non-Goals

- Multi-user authentication with separate accounts
- Role-based access control (RBAC)
- Password hashing/salting (this is a development-only feature)
- Session management with database persistence
- Password reset flows
- Production-grade security

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────┐                    ┌──────────────────────┐ │
│  │ Login Page │ ──(password)────→  │  Auth Context        │ │
│  └────────────┘                    │  (React Context)     │ │
│                                    │  - isAuthenticated   │ │
│                                    │  - token             │ │
│                                    │  - login()           │ │
│                                    │  - logout()          │ │
│                                    └──────────────────────┘ │
│                                              │               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Protected Routes                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │ │
│  │  │  Home    │  │ Projects │  │  Generation Flow  │   │ │
│  │  └──────────┘  └──────────┘  └───────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           │ API calls with token in header   │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Backend (Express)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Auth Middleware (authenticate)               │ │
│  │  - Check AUTH_ENABLED flag                             │ │
│  │  - Extract token from headers                          │ │
│  │  - Validate against AUTH_TOKEN                         │ │
│  │  - Allow/Deny request                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────────────┐│
│  │              Protected API Routes                       ││
│  │  /api/projects, /api/files, /api/generation, etc.      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
User visits app
    ↓
Check localStorage for token
    ↓
No token → Show Login Page
    ↓
User enters password
    ↓
Frontend validates (matches AUTH_TOKEN from backend or hardcoded)
    ↓
Store token in localStorage
    ↓
Update AuthContext (isAuthenticated = true)
    ↓
Redirect to app (protected routes now accessible)
    ↓
All API calls include token in 'x-auth-token' header
    ↓
Backend validates token via authenticate() middleware
    ↓
Request allowed/denied based on token validity
```

### Token Validation Strategy

**Option 1: Backend validation** (Recommended)
- Frontend sends password to `/api/auth/login`
- Backend validates password against `AUTH_TOKEN`
- Backend returns success/failure
- Frontend stores token in localStorage
- More secure, single source of truth

**Option 2: Frontend-only validation**
- Frontend fetches `AUTH_TOKEN` from backend config endpoint
- Frontend validates password locally
- Simpler but less secure

**Decision: Use Option 1** for better security and consistency with existing backend auth middleware.

---

## Implementation Details

### Frontend Components

#### 1. Auth Context (`packages/web/src/contexts/AuthContext.tsx`)

Manages authentication state across the application.

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Features:
// - Reads token from localStorage on mount
// - Provides login/logout functions
// - Exposes authentication state to entire app
// - Handles loading states
```

#### 2. Login Page (`packages/web/src/pages/Login.tsx`)

Simple password entry form.

```typescript
// Features:
// - Password input field
// - Submit button
// - Error message display
// - Loading state
// - Calls AuthContext.login()
// - Redirects on success
```

#### 3. Protected Route Component (`packages/web/src/components/ProtectedRoute.tsx`)

Wrapper component that guards routes.

```typescript
// Features:
// - Checks isAuthenticated from AuthContext
// - Redirects to /login if not authenticated
// - Renders children if authenticated
// - Shows loading spinner while checking auth state
```

#### 4. API Client Update (`packages/web/src/api/client.ts`)

Add token to all API requests.

```typescript
// Features:
// - Read token from localStorage
// - Add 'x-auth-token' header to all requests
// - Handle 401 errors (clear token, redirect to login)
```

### Backend Changes

#### 1. Auth Routes (`packages/api/src/routes/auth.routes.ts`) - NEW

Add login endpoint for frontend validation.

```typescript
// POST /api/auth/login
// Body: { password: string }
// Response: { success: boolean, token?: string }
//
// Validates password against env.AUTH_TOKEN
// Returns token on success
```

#### 2. Route Protection Updates

Change all routes from `optionalAuth` to `authenticate`:

```typescript
// Before:
router.get('/', optionalAuth, asyncHandler(listProjects));

// After:
router.get('/', authenticate, asyncHandler(listProjects));
```

**Routes to protect:**
- `/api/projects/*` - All project operations
- `/api/files/*` - File uploads/downloads
- `/api/generation/*` - Generation workflow
- `/api/domain-mapping/*` - Domain mapping operations

**Routes to keep public:**
- `/api/health` - Health check (if exists)
- `/api/auth/login` - Login endpoint itself

#### 3. Error Handler Update

Ensure 401 errors return consistent JSON response:

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Configuration

#### Environment Variables

```bash
# Enable/disable authentication
AUTH_ENABLED=true

# Shared password/token
AUTH_TOKEN=your-secure-development-password

# CORS for local development
CORS_ORIGIN=http://localhost:5173
```

#### Frontend Environment

```bash
# Vite env file (.env)
VITE_API_URL=http://localhost:3001
```

---

## Security Considerations

### Current (Development Phase)

1. **Single shared token** - Simple, suitable for development
2. **localStorage storage** - Persists across sessions, vulnerable to XSS
3. **No encryption** - Token sent in plain text (HTTPS in production)
4. **No expiration** - Token valid until user logs out
5. **No rate limiting** - Already exists in app, applies to auth endpoint too

### Future (Production Phase)

When upgrading to production-grade auth:

1. **JWT tokens** with expiration and refresh tokens
2. **httpOnly cookies** instead of localStorage
3. **HTTPS enforcement** for all communication
4. **Password hashing** (bcrypt/argon2)
5. **Multi-user support** with database
6. **Session management** with Redis
7. **CSRF protection**
8. **Rate limiting** on login endpoint

---

## Testing Strategy

### Unit Tests

1. **AuthContext**
   - Login updates state correctly
   - Logout clears state and localStorage
   - Token persistence on page reload
   - Loading states

2. **ProtectedRoute**
   - Redirects when not authenticated
   - Renders children when authenticated
   - Shows loading state appropriately

3. **Auth Middleware** (already exists)
   - Validates correct token
   - Rejects invalid token
   - Respects AUTH_ENABLED flag

4. **Login API Endpoint**
   - Returns success with valid password
   - Returns error with invalid password
   - Respects AUTH_ENABLED flag

### Integration Tests

1. **Full auth flow**
   - User logs in successfully
   - Token stored in localStorage
   - API calls succeed with token
   - User logs out successfully
   - API calls fail after logout

2. **Protected routes**
   - Unauthenticated user redirected to login
   - Authenticated user can access all routes
   - Invalid token triggers logout

### E2E Tests (optional)

1. **Complete user journey**
   - Visit app → redirected to login
   - Enter wrong password → error shown
   - Enter correct password → redirected to app
   - Navigate between pages → stays authenticated
   - Refresh page → still authenticated
   - Logout → redirected to login

---

## Migration Path

### Current State
- Auth middleware exists but not enforced (`optionalAuth`)
- No frontend authentication
- `AUTH_ENABLED=false` by default

### Phase 1: Implementation
- Add frontend auth components
- Add login API endpoint
- Switch routes to `authenticate`
- Set `AUTH_ENABLED=true` in development

### Phase 2: Testing
- Manual testing of full flow
- Automated tests for all components
- Verify toggling AUTH_ENABLED works

### Phase 3: Future Upgrade (when needed)
- Replace simple token with JWT
- Add user database and proper authentication
- Implement refresh tokens
- Add role-based access control
- Remove or repurpose simple password barrier

---

## Open Questions

1. **Should we add a "Remember me" option?**
   - Pro: More convenient for repeated use
   - Con: Adds complexity
   - Decision: No, keep it simple. Token already persists in localStorage.

2. **Should login endpoint be rate-limited separately?**
   - Pro: Prevents brute force
   - Con: Already have global rate limiting
   - Decision: Use existing rate limiting, sufficient for development.

3. **Should we add a logout button in the UI?**
   - Pro: Better UX
   - Con: Extra UI work
   - Decision: Yes, add simple logout button in header/nav.

4. **Where to store the token: localStorage vs sessionStorage?**
   - localStorage: Persists across tabs and browser restart
   - sessionStorage: Cleared when tab closes
   - Decision: localStorage for convenience during development.

---

## Success Criteria

- ✅ User cannot access app without entering password
- ✅ Invalid password shows error message
- ✅ Valid password grants access to all features
- ✅ Token persists across page refreshes
- ✅ API calls include token and are validated
- ✅ Logout clears token and redirects to login
- ✅ Authentication can be disabled via AUTH_ENABLED=false
- ✅ All existing functionality works when authenticated
- ✅ Tests pass for all new components and endpoints

---

## Timeline Estimate

- **Auth Context & Login Page**: 1-2 hours
- **Protected Route Component**: 30 minutes
- **API Client Updates**: 30 minutes
- **Backend Route Changes**: 1 hour
- **Login API Endpoint**: 1 hour
- **Testing (unit + integration)**: 2-3 hours
- **Documentation & Environment Setup**: 30 minutes

**Total**: ~6-8 hours of development work

---

## References

- Existing auth middleware: `packages/api/src/middleware/auth.ts`
- Existing auth tests: `packages/api/tests/unit/middleware/auth.test.ts`
- Environment config: `packages/api/src/config/env.ts`
- ARCHITECTURE.md: Mentions "magic link authentication (local: simplified token auth)"
