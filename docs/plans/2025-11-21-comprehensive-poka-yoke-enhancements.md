# Comprehensive Poka-Yoke Enhancements

**Date**: 2025-11-21
**Status**: Proposed
**Based on**: Git history analysis of recurring issues

## Analysis of Git History

Reviewing the last 30 commits reveals recurring patterns of preventable issues:

### Recurring Issue Categories

1. **Authentication Bypass** (IMPLEMENTED ✅)
   - Raw `fetch()` calls bypassing `apiClient`
   - Solution: ESLint rule + centralized endpoints

2. **File Upload Issues** (5+ commits)
   - Size limit mismatches (nginx vs multer vs frontend)
   - MIME type inconsistencies
   - Missing validation layers

3. **Configuration Drift** (4+ commits)
   - Environment variable mismatches across services
   - CORS configuration issues
   - Nginx vs Express configuration inconsistencies

4. **Type Safety Gaps**
   - Missing TypeScript strict checks
   - `any` types bypassing type safety
   - Missing runtime validation

## Proposed Poka-Yoke Enhancements

### 1. Defense-in-Depth File Validation

**Problem**: File upload limits differ between nginx (50MB), multer config, and frontend validation.

**Solution**: Single source of truth with validation at all layers

```typescript
// packages/shared/src/constants/file-types.ts (ALREADY EXISTS)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES_PER_UPLOAD = 20;
export const ALLOWED_MIME_TYPES = [/* ... */];
```

**Poka-Yoke Measures**:

#### A. Automated Configuration Validation (NEW)
```typescript
// packages/api/src/config/validation.ts
import { MAX_FILE_SIZE } from '@kirby-gen/shared';

export function validateConfiguration() {
  // Ensure multer config matches constants
  if (upload.limits.fileSize !== MAX_FILE_SIZE) {
    throw new Error(
      `Configuration mismatch: multer fileSize (${upload.limits.fileSize}) ` +
      `!== MAX_FILE_SIZE (${MAX_FILE_SIZE})`
    );
  }

  // Add more checks...
}

// Run at startup
validateConfiguration();
```

#### B. Nginx Configuration Test (NEW)
```bash
# packages/web/scripts/validate-nginx.sh
#!/bin/bash
# Extract client_max_body_size from nginx.conf
# Compare with packages/shared/src/constants/file-types.ts MAX_FILE_SIZE
# Fail build if mismatch
```

#### C. Pre-commit Hook (NEW)
```bash
# .git/hooks/pre-commit
npm run validate:config
```

### 2. TypeScript Strict Mode

**Problem**: Git history shows type errors caught in production

**Current State**:
```json
{
  "compilerOptions": {
    "strict": false  // ❌ Allows unsafe patterns
  }
}
```

**Proposed**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Migration Plan**:
1. Enable per package (start with `packages/shared`)
2. Fix errors incrementally
3. Add `// @ts-expect-error` with issue tracking for legitimate cases
4. Enable in CI to prevent regressions

### 3. Environment Variable Type Safety

**Problem**: Git history shows multiple issues with env var mismatches

**Current State**: String-based env vars with runtime errors

**Proposed**: Zod schema validation

```typescript
// packages/api/src/config/env.schema.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['local', 'development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().default(3001),
  CLAUDE_API_KEY: z.string().min(1).optional(),
  AUTH_TOKEN: z.string().min(8),
  AUTH_ENABLED: z.coerce.boolean().default(false),
  MAX_FILE_SIZE: z.coerce.number().int().positive(),
  // ... all other env vars
});

// Validate at startup
export const env = envSchema.parse(process.env);
```

**Poka-Yoke Benefits**:
- ✅ Type-safe environment access
- ✅ Fails fast on invalid config
- ✅ Self-documenting environment requirements
- ✅ Coercion for booleans/numbers (no more `"true"` vs `true`)

### 4. API Request/Response Contract Enforcement

**Problem**: No runtime validation of API contracts

**Proposed**: Zod schemas for all API endpoints

```typescript
// packages/api/src/schemas/domain-mapping.schema.ts
import { z } from 'zod';
import { CLAUDE_INPUT_LIMITS } from '../middleware/validator';

export const initDomainMappingSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  body: z.object({
    message: z.string()
      .min(1, 'Message cannot be empty')
      .max(CLAUDE_INPUT_LIMITS.MAX_MESSAGE_LENGTH,
           `Message too long (max ${CLAUDE_INPUT_LIMITS.MAX_MESSAGE_LENGTH})`),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.string().datetime(),
    })).max(CLAUDE_INPUT_LIMITS.MAX_CONVERSATION_HISTORY),
  }),
});

// Usage in routes
router.post(
  '/:projectId/domain-mapping/message',
  authenticate,
  validate(sendMessageSchema),  // ✅ Poka-yoke validation
  handleSendMessage
);
```

### 5. ESLint Rules for Common Mistakes

**Already Implemented**: `no-restricted-globals` for `fetch()`

**Additional Rules to Add**:

```javascript
// packages/web/.eslintrc.cjs
module.exports = {
  rules: {
    // ... existing rules

    // Prevent console.log in production
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],

    // Prevent any type
    '@typescript-eslint/no-explicit-any': 'error',

    // Require error handling
    '@typescript-eslint/no-floating-promises': 'error',

    // Prevent unused vars
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],

    // Require return types on functions
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
  }
};
```

### 6. Automated Integration Tests for Critical Paths

**Problem**: Manual testing missed auth bypass issue

**Proposed**: E2E tests for critical user flows

```typescript
// packages/api/tests/e2e/auth-flow.test.ts
describe('Authentication Flow E2E', () => {
  it('should block unauthenticated requests to protected endpoints', async () => {
    const endpoints = [
      '/api/projects/:id/domain-mapping/init',
      '/api/projects/:id/domain-mapping/message',
      '/api/projects/:id/generate',
      '/api/projects/:id/preview-url',
      '/api/projects/:id/download',
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .post(endpoint.replace(':id', testProjectId))
        .expect(401);

      expect(response.body.error).toContain('authentication');
    }
  });

  it('should accept requests with valid token', async () => {
    // Test with valid token
  });
});
```

### 7. Pre-deployment Smoke Tests

**Problem**: Issues caught after deployment

**Proposed**: Automated smoke test script

```bash
# scripts/smoke-test.sh
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3001}"

echo "🔍 Running smoke tests against $API_URL"

# Test 1: Health check
curl -f "$API_URL/health" || exit 1

# Test 2: Auth required
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/projects")
[ "$HTTP_CODE" = "401" ] || { echo "❌ Auth not enforced"; exit 1; }

# Test 3: File upload size limit
# ... more tests

echo "✅ All smoke tests passed"
```

**Run in CI/CD**:
```yaml
# .github/workflows/deploy.yml
- name: Smoke Tests
  run: |
    npm run smoke-test
    API_URL=https://staging.example.com npm run smoke-test
```

### 8. Configuration Drift Detection

**Problem**: Nginx, Express, and frontend configs drift apart

**Proposed**: Config validation script

```typescript
// scripts/validate-config-consistency.ts
import { MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD } from '@kirby-gen/shared';
import { readFile } from 'fs/promises';

async function validateNginxConfig() {
  const nginxConf = await readFile('packages/web/nginx.conf', 'utf-8');
  const match = nginxConf.match(/client_max_body_size\s+(\d+)([KMG])/);

  if (!match) {
    throw new Error('Cannot find client_max_body_size in nginx.conf');
  }

  const [, size, unit] = match;
  const bytes = unit === 'M' ? parseInt(size) * 1024 * 1024 : parseInt(size);

  if (bytes !== MAX_FILE_SIZE) {
    throw new Error(
      `Nginx client_max_body_size (${bytes}) !== MAX_FILE_SIZE (${MAX_FILE_SIZE})`
    );
  }
}

// Run in CI
validateNginxConfig().catch(err => {
  console.error(err);
  process.exit(1);
});
```

### 9. Dependency Injection Container Validation

**Problem**: Services not registered in DI causing runtime errors

**Proposed**: Startup validation

```typescript
// packages/api/src/config/di-validation.ts
import { container } from '@kirby-gen/shared';
import { SERVICE_KEYS } from '@kirby-gen/shared';

export function validateDIContainer() {
  const requiredServices = Object.values(SERVICE_KEYS);
  const missing: string[] = [];

  for (const key of requiredServices) {
    try {
      container.resolve(key);
    } catch {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `DI Container validation failed. Missing services: ${missing.join(', ')}`
    );
  }
}

// Run at startup in server.ts
validateDIContainer();
```

### 10. Automatic API Documentation

**Problem**: Frontend/backend API contracts drift

**Proposed**: Generate OpenAPI spec from Zod schemas

```typescript
// packages/api/src/docs/openapi-generator.ts
import { generateOpenAPI } from '@anatine/zod-openapi';
import { allSchemas } from '../schemas';

export const openApiSpec = generateOpenAPI({
  info: {
    title: 'Kirby-Gen API',
    version: '1.0.0',
  },
  schemas: allSchemas,
});

// Serve at /api/docs
app.get('/api/docs', (req, res) => {
  res.json(openApiSpec);
});
```

## Implementation Priority

### Phase 1 (High Impact, Low Effort) - Week 1
1. ✅ Authentication ESLint rule (DONE)
2. Environment variable Zod validation
3. Automated smoke tests
4. Pre-commit config validation

### Phase 2 (High Impact, Medium Effort) - Week 2-3
5. TypeScript strict mode (per package)
6. API request/response Zod schemas
7. DI container validation
8. Additional ESLint rules

### Phase 3 (Medium Impact, Medium Effort) - Week 4+
9. E2E auth flow tests
10. Configuration drift detection
11. OpenAPI documentation generation
12. Nginx config validation script

## Success Metrics

- ❌→✅ Configuration mismatches caught before deployment
- ❌→✅ Type errors caught at compile-time, not runtime
- ❌→✅ Authentication bypass impossible
- ⏱️ Developer feedback loop: errors found in <1min not after deployment

## Related Documents

- `2025-11-21-authentication-poka-yoke-design.md` - Authentication fix
- `ARCHITECTURE.md` - System design
- `CLAUDE.md` - Development conventions

## References

- [Poka-Yoke Principles](https://en.wikipedia.org/wiki/Poka-yoke)
- [Defense in Depth](https://en.wikipedia.org/wiki/Defense_in_depth_(computing))
- [Shift Left Testing](https://en.wikipedia.org/wiki/Shift-left_testing)
- [Zod](https://zod.dev/) - TypeScript schema validation
