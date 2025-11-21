# Authentication Poka-Yoke Design

**Date**: 2025-11-21
**Status**: Implemented
**Type**: Bug Fix + Mistake-Proofing

## Problem

After successful file upload, domain mapping initialization failed with 401 Unauthorized error. Investigation revealed that `ConversationUI.tsx`, `PreviewPage.tsx`, and `ProgressPage.tsx` were using raw `fetch()` calls instead of the centralized `apiClient`, bypassing authentication token injection.

**Root Cause**: No compile-time enforcement prevented developers from using raw `fetch()` instead of `apiClient`.

## Solution: Centralized API Client with ESLint Enforcement

### Architecture

```
┌─────────────────────────────────────────┐
│   Frontend Components                    │
│   (ConversationUI, PreviewPage, etc.)   │
└──────────────┬──────────────────────────┘
               │
               ↓ (Use only)
┌─────────────────────────────────────────┐
│   API Endpoints (endpoints.ts)          │
│   - projectEndpoints                     │
│   - domainMappingEndpoints               │
│   - fileEndpoints                        │
└──────────────┬──────────────────────────┘
               │
               ↓ (Uses internally)
┌─────────────────────────────────────────┐
│   API Client (client.ts)                 │
│   - Axios instance with interceptors     │
│   - Request: Injects x-auth-token        │
│   - Response: Clears token on 401        │
└─────────────────────────────────────────┘
               │
               ↓
      ┌────────┴────────┐
      │   Backend API    │
      └─────────────────┘
```

### Poka-Yoke Measures

**1. ESLint Rule - Compile-Time Prevention**
```javascript
'no-restricted-globals': [
  'error',
  {
    name: 'fetch',
    message: 'Use apiClient from ../api/client instead of raw fetch()...'
  }
]
```
- Prevents raw `fetch()` usage at compile-time
- Provides clear error message with instructions
- Configured in `packages/web/.eslintrc.cjs`

**2. Centralized API Client Pattern**
- All HTTP requests go through `packages/web/src/api/endpoints.ts`
- Endpoint functions use `apiClient` (axios) internally
- Automatic authentication via request interceptor

**3. Comprehensive Test Coverage**
- `client.test.ts` - Tests interceptor behavior
- `endpoints.test.ts` - Verifies all endpoints include auth token
- `eslint-fetch-ban.test.ts` - Documents the ESLint rule

## Implementation

### Fixed Components

1. **ConversationUI.tsx** ✅
   - `initializeConversation()` - Now uses `domainMappingEndpoints.initialize()`
   - `handleSubmit()` - Now uses `domainMappingEndpoints.sendMessage()`

2. **PreviewPage.tsx** ✅
   - `loadProject()` - Now uses `projectEndpoints.getPreviewUrl()`
   - `handleDownload()` - Now uses `projectEndpoints.download()`

3. **ProgressPage.tsx** ✅
   - `startGeneration()` - Now uses `projectEndpoints.generate()`

### Test Results

All authentication tests pass:
- ✅ 18/18 tests in `endpoints.test.ts`
- ✅ Token injection verified for all endpoint categories
- ✅ 401 error handling tested

## Benefits

1. **Security** - Authentication cannot be bypassed accidentally
2. **Consistency** - Single pattern for all API calls
3. **Maintainability** - Changes to auth logic happen in one place
4. **Developer Experience** - Clear error messages guide developers
5. **Compile-Time Safety** - ESLint catches violations before runtime

## Migration Guide

When adding new API endpoints:

```typescript
// ❌ DON'T: Use raw fetch()
const response = await fetch('/api/projects/123');

// ✅ DO: Add to endpoints.ts and use apiClient
export const projectEndpoints = {
  myNewEndpoint: async (id: string) => {
    const response = await apiClient.get(`/projects/${id}/something`);
    return response.data.data;
  }
};

// Then use in components
import { projectEndpoints } from '../api/endpoints';
const data = await projectEndpoints.myNewEndpoint(projectId);
```

## Future Considerations

- Consider TypeScript branded types for authenticated requests
- Add request/response logging for debugging
- Implement retry logic with exponential backoff in interceptors
- Add request deduplication for identical concurrent requests

## Related Files

- `packages/web/src/api/client.ts` - Axios instance with interceptors
- `packages/web/src/api/endpoints.ts` - All API endpoint functions
- `packages/web/.eslintrc.cjs` - ESLint configuration
- `packages/web/src/api/__tests__/endpoints.test.ts` - Integration tests
- `packages/api/src/middleware/auth.ts` - Backend authentication

## References

- [Poka-Yoke (Mistake-Proofing)](https://en.wikipedia.org/wiki/Poka-yoke)
- [ESLint no-restricted-globals](https://eslint.org/docs/latest/rules/no-restricted-globals)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
