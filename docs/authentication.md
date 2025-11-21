# Authentication Setup Guide

This guide explains how to configure and use the simple token-based authentication system in Kirby-Gen.

## Overview

Kirby-Gen includes a simple password-based authentication system designed for development and testing. This is an MVP implementation that provides basic security without the complexity of full user management.

### Key Features

- Single shared password for all users
- Frontend login page with password entry
- Token-based API authentication
- Easy to enable/disable via environment variables
- Token persistence across browser sessions
- Timing-safe password comparison

### What It's NOT

This is NOT production-grade security. It does not include:
- Multi-user accounts
- Password hashing/salting
- Role-based access control (RBAC)
- Session expiration
- Password reset flows
- OAuth/SSO integration

For production deployments, replace this with JWT-based authentication or OAuth providers.

---

## Quick Start

### 1. Enable Authentication

Edit your environment files to enable auth:

**Backend** (`packages/api/.env`):
```bash
AUTH_ENABLED=true
AUTH_TOKEN=my-secure-development-password
```

**Frontend** (`packages/web/.env`):
```bash
VITE_AUTH_TOKEN=my-secure-development-password
```

**IMPORTANT:** The `AUTH_TOKEN` and `VITE_AUTH_TOKEN` values MUST match exactly.

### 2. Start the Application

```bash
npm run dev
```

### 3. Login

1. Navigate to `http://localhost:5173`
2. You'll be redirected to the login page
3. Enter your password (the value you set in `AUTH_TOKEN`)
4. Click "Login"
5. You'll be redirected to the application

The token is stored in browser localStorage and persists across sessions.

---

## How It Works

### Architecture

```
┌─────────────┐
│   Browser   │
│ ┌─────────┐ │      Password      ┌──────────────┐
│ │  Login  │─┼────────────────────→│ POST /auth/  │
│ │  Page   │ │                     │    login     │
│ └─────────┘ │      ← Success      └──────────────┘
│             │      + Token              ↓
│ ┌─────────┐ │                    Validate password
│ │localStorage│                    against AUTH_TOKEN
│ │  token  │ │                           ↓
│ └─────────┘ │                    Return token if valid
│      ↓      │
│ ┌─────────┐ │   All API requests
│ │   API   │─┼──────────────────→ Middleware validates
│ │ Requests│ │  Include token in   token in headers
│ └─────────┘ │  'x-auth-token'
└─────────────┘  header
```

### Authentication Flow

1. **User visits app**
   - Frontend checks localStorage for existing token
   - If no token found → redirect to `/login`

2. **User enters password**
   - Frontend sends password to `POST /api/auth/login`
   - Backend validates password against `AUTH_TOKEN` using timing-safe comparison
   - On success: backend returns token, frontend stores in localStorage

3. **Authenticated requests**
   - All API requests include token in `x-auth-token` header
   - Backend `authenticate` middleware validates token
   - Invalid/missing token → 401 Unauthorized

4. **User logs out**
   - Frontend clears localStorage
   - User redirected to login page

---

## Configuration Reference

### Backend Environment Variables

File: `packages/api/.env`

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTH_ENABLED` | boolean | `false` | Enable/disable authentication |
| `AUTH_TOKEN` | string | - | Shared password for authentication |

**Example:**
```bash
# Enable authentication
AUTH_ENABLED=true

# Set password (change this!)
AUTH_TOKEN=my-secret-password-123

# Other settings...
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Frontend Environment Variables

File: `packages/web/.env`

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_AUTH_TOKEN` | string | - | Password for login (must match backend) |
| `VITE_API_URL` | string | - | Backend API URL |
| `VITE_WS_URL` | string | - | WebSocket URL |

**Example:**
```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Authentication (must match backend AUTH_TOKEN)
VITE_AUTH_TOKEN=my-secret-password-123
```

---

## Usage Scenarios

### Scenario 1: Local Development (No Auth)

For local development without authentication:

```bash
# Backend .env
AUTH_ENABLED=false
AUTH_TOKEN=

# Frontend .env
VITE_AUTH_TOKEN=
```

The app will work without requiring login.

### Scenario 2: Protected Development Environment

For protecting a development deployment:

```bash
# Backend .env
AUTH_ENABLED=true
AUTH_TOKEN=dev-team-password-2024

# Frontend .env
VITE_AUTH_TOKEN=dev-team-password-2024
```

Users must enter the password to access the app.

### Scenario 3: Testing Authentication

For testing the auth implementation:

```bash
# Backend .env
AUTH_ENABLED=true
AUTH_TOKEN=test-password

# Frontend .env
VITE_AUTH_TOKEN=test-password
```

Run tests with authentication enabled to verify proper behavior.

---

## Security Considerations

### Current Implementation (Development)

1. **Single shared token** - All users use the same password
2. **localStorage storage** - Token stored in browser (vulnerable to XSS)
3. **No encryption** - Token sent in plain text (use HTTPS in production)
4. **No expiration** - Token valid until user logs out
5. **Timing-safe comparison** - Prevents timing attacks on password validation

### Recommendations

For development/testing environments:
- Use a strong, unique password
- Don't commit `.env` files with real passwords
- Use HTTPS even in development if possible
- Rotate passwords regularly

For production deployments:
- Replace with JWT-based authentication
- Use httpOnly cookies instead of localStorage
- Implement proper password hashing (bcrypt/argon2)
- Add rate limiting on login endpoint
- Use HTTPS enforcement
- Add CSRF protection
- Implement session management with Redis

---

## API Reference

### POST /api/auth/login

Validates password and returns authentication token.

**Request:**
```json
{
  "password": "your-password-here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "your-password-here"
}
```

**Response (Error):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid password"
}
```

**Status Codes:**
- `200 OK` - Authentication successful
- `401 Unauthorized` - Invalid password
- `400 Bad Request` - Missing password
- `500 Internal Server Error` - Server configuration error

**Headers:**
- `Content-Type: application/json`

**Notes:**
- If `AUTH_ENABLED=false`, always returns success with dummy token
- Password is validated using timing-safe comparison
- Returned token should be stored by client and included in subsequent requests

---

## Frontend Integration

### Using the Auth Context

The `AuthContext` provides authentication state and functions throughout the app.

**Available properties:**
```typescript
interface AuthContextType {
  isAuthenticated: boolean;      // True if user is logged in
  token: string | null;           // Current auth token
  login: (password: string) => Promise<void>;  // Login function
  logout: () => void;             // Logout function
  isLoading: boolean;             // True during auth operations
}
```

**Example usage:**
```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <p>Welcome!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected Routes

Use the `ProtectedRoute` component to guard routes:

```typescript
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Dashboard } from '../pages/Dashboard';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

If the user is not authenticated, they'll be redirected to the login page.

### Making Authenticated API Requests

The API client automatically includes the auth token in all requests:

```typescript
import { apiClient } from '../api/client';

// Token is automatically included in x-auth-token header
const projects = await apiClient.get('/api/projects');
```

If the token is invalid or missing, the API will return 401 Unauthorized, and the client will automatically redirect to the login page.

---

## Troubleshooting

### Problem: "Invalid password" error even with correct password

**Solution:**
- Verify `AUTH_TOKEN` in backend `.env` matches `VITE_AUTH_TOKEN` in frontend `.env`
- Check for trailing spaces or special characters
- Restart both frontend and backend after changing `.env` files

### Problem: Redirected to login page after successful login

**Solution:**
- Check browser console for errors
- Verify token is stored in localStorage: `localStorage.getItem('authToken')`
- Check backend logs for authentication failures
- Ensure `AUTH_ENABLED=true` in backend `.env`

### Problem: API returns 401 Unauthorized

**Solution:**
- Verify user is logged in
- Check that token is included in request headers
- Verify backend has `AUTH_ENABLED=true`
- Check backend logs for specific error message

### Problem: Login page doesn't appear

**Solution:**
- Check that you're running the frontend on correct port (5173)
- Verify `VITE_API_URL` points to correct backend URL
- Check browser console for routing errors

### Problem: Can't access app even with AUTH_ENABLED=false

**Solution:**
- Restart backend server to load new environment variables
- Clear browser localStorage: `localStorage.clear()`
- Check backend logs to confirm `AUTH_ENABLED` value

---

## Testing

### Unit Tests

Authentication middleware and controller have comprehensive tests:

```bash
# Run auth tests
cd packages/api
npm test -- tests/unit/middleware/auth.test.ts
npm test -- tests/unit/controllers/auth.controller.test.ts
```

### Integration Tests

Test the full authentication flow:

```bash
cd packages/api
npm run test:integration
```

### Manual Testing Checklist

- [ ] Enable auth in backend and frontend
- [ ] Access app → redirected to login
- [ ] Enter wrong password → error message shown
- [ ] Enter correct password → redirected to app
- [ ] Navigate between pages → stay authenticated
- [ ] Refresh page → still authenticated
- [ ] Logout → redirected to login
- [ ] Try to access API without token → 401 error
- [ ] Disable auth → app accessible without login

---

## Migration Path

### Current State: Simple Token Auth

This is where you are now. Single password, basic protection.

### Future: JWT Authentication

When you're ready for production:

1. **Add JWT library**
   ```bash
   npm install jsonwebtoken
   ```

2. **Update auth controller** to issue JWT tokens:
   ```typescript
   const token = jwt.sign(
     { userId: user.id, role: user.role },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   ```

3. **Update middleware** to validate JWT:
   ```typescript
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   req.user = decoded;
   ```

4. **Add refresh token flow**
5. **Implement user database**
6. **Add password hashing**

### Future: OAuth/SSO

For enterprise deployments:

1. Choose provider (Google, GitHub, Auth0, etc.)
2. Install OAuth library (passport.js, next-auth, etc.)
3. Configure OAuth application
4. Update login flow to redirect to provider
5. Handle OAuth callback
6. Store user session

---

## File Reference

### Backend Files

- **Middleware:** `packages/api/src/middleware/auth.ts`
  - `authenticate()` - Validates token on protected routes
  - `optionalAuth()` - Optional validation (currently unused)

- **Controller:** `packages/api/src/controllers/auth.controller.ts`
  - `login()` - Validates password and returns token

- **Routes:** `packages/api/src/routes/auth.routes.ts`
  - `POST /api/auth/login` - Login endpoint

- **Environment:** `packages/api/src/config/env.ts`
  - Loads and validates `AUTH_ENABLED` and `AUTH_TOKEN`

- **Tests:**
  - `packages/api/tests/unit/middleware/auth.test.ts`
  - `packages/api/tests/unit/controllers/auth.controller.test.ts`

### Frontend Files

- **Context:** `packages/web/src/contexts/AuthContext.tsx`
  - Manages authentication state

- **Login Page:** `packages/web/src/pages/Login.tsx`
  - Password entry form

- **Protected Route:** `packages/web/src/components/ProtectedRoute.tsx`
  - Route guard component

- **API Client:** `packages/web/src/api/client.ts`
  - Adds token to requests
  - Handles 401 errors

---

## FAQ

**Q: Can I use different passwords for different users?**
A: No, this is a single shared password system. For multi-user support, upgrade to JWT authentication with a user database.

**Q: Is the password stored securely?**
A: The password is stored in plain text in `.env` files. This is acceptable for development but not for production. For production, use password hashing.

**Q: Can I use this in production?**
A: Not recommended. This is designed for development/testing. For production, upgrade to JWT-based authentication with proper password hashing and user management.

**Q: How do I change the password?**
A: Update `AUTH_TOKEN` in backend `.env` and `VITE_AUTH_TOKEN` in frontend `.env`, then restart both servers.

**Q: Does the token expire?**
A: No, tokens remain valid until the user logs out. For production, implement token expiration with JWT.

**Q: What happens if I forget the password?**
A: Check your `.env` files. If you lost the password, create a new one and update the `.env` files.

**Q: Can I protect only certain routes?**
A: Currently, when `AUTH_ENABLED=true`, all routes except `/api/health` and `/api/auth/login` are protected. To customize this, modify the route definitions in `packages/api/src/routes/`.

**Q: How do I test with authentication disabled?**
A: Set `AUTH_ENABLED=false` in backend `.env` and restart the server.

---

## Support

For issues or questions:

1. Check this documentation first
2. Review the troubleshooting section
3. Check backend logs: `packages/api/logs/`
4. Review the design document: `docs/plans/2025-11-21-simple-auth-barrier-design.md`
5. Examine the test files for usage examples

---

## Summary

This simple token authentication system provides basic security for development environments. It's:

- Easy to enable/disable
- Simple to configure
- Transparent in operation
- Ready to be replaced with production-grade auth

For production deployments, plan to upgrade to JWT authentication with proper user management, password hashing, and security features.
