# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kirby-Gen is an AI-powered portfolio generator that creates fully customized Kirby CMS sites through conversational AI. It features a **CMS-agnostic architecture** where content generation is completely decoupled from CMS implementation via the adapter pattern.

## Build, Test, and Development Commands

### Setup
```bash
# Initial setup (installs all dependencies including Python venv)
npm run setup

# Configure environment
cp .env.example .env
# Edit .env and add CLAUDE_API_KEY
```

### Development
```bash
# Start all services concurrently (API, Web, Skills)
npm run dev

# Start individual packages
npm run dev:api      # Backend API on http://localhost:3000
npm run dev:web      # React frontend on http://localhost:5173
npm run dev:skills   # Python FastAPI skills server on http://localhost:8001

# Build all packages
npm run build

# Type checking
npm run typecheck
```

### Testing
```bash
# Run all tests across all packages
npm test

# Test specific packages
npm test --workspace=packages/api
npm test --workspace=packages/shared
npm test --workspace=packages/kirby-generator

# Test types (unit, integration, e2e)
npm run test:unit              # All unit tests
npm run test:integration       # All integration tests
npm run test:e2e               # E2E tests (API package only)

# Watch mode for active development
npm run test:watch --workspace=packages/api

# Run specific test file
cd packages/api && npm test -- tests/unit/services/storage.test.ts

# Python skills tests
cd packages/skills
source venv/bin/activate
pytest tests/ -v --cov=src           # All tests with coverage
pytest tests/unit/ -v                # Unit tests only
pytest tests/integration/ -v         # Integration tests only
```

### Linting and Formatting
```bash
npm run lint                   # Lint all packages
npm run lint --workspace=packages/api

# Python skills linting
cd packages/skills && source venv/bin/activate
ruff check src tests           # Lint
black src tests                # Format
mypy src                       # Type checking
```

## Architecture Overview

### Monorepo Structure
- **packages/shared** - Shared TypeScript types, interfaces, and DI container
- **packages/api** - Express backend with WebSocket support
- **packages/web** - React frontend (Vite + TypeScript)
- **packages/skills** - Python FastAPI server with Claude Opus skills
- **packages/kirby-generator** - CMS adapter for Kirby (implements ICMSAdapter)

### Key Architectural Patterns

#### 1. CMS-Agnostic Design
The system generates generic content artifacts (schema, content, design system) that are **completely independent** of any CMS. These are then transformed via adapter pattern:

```
Generic Content → ICMSAdapter → CMS-Specific Output
                      ├─→ KirbyAdapter → Kirby Site
                      ├─→ StrapiAdapter → Strapi Setup (future)
                      └─→ [Your CMS] → Custom Output
```

All content generation (domain mapping, content structuring, design automation) produces CMS-agnostic JSON/YAML files. Only the final phase uses a CMS adapter.

#### 2. Dependency Injection (DI)
All infrastructure services use DI for local/cloud abstraction:

**DI Container**: `packages/shared/src/di/container.ts`
**Service Setup**: `packages/api/src/config/di-setup.ts`

Services registered via `container.register(key, implementation)` and resolved via `container.resolve(key)`:

- **Storage** (local: file system, future: S3)
- **Session** (local: JSON files, future: Redis)
- **Git** (local: simple-git)
- **Deployment** (local: PHP server, future: Vercel)

When implementing services, always implement the interface from `packages/shared/src/interfaces/`.

#### 3. Workflow Orchestration
The `WorkflowOrchestrator` (`packages/api/src/workflow/workflow-orchestrator.ts`) manages the 5-phase pipeline:

1. **Domain Mapping** - AI discovers entities and relationships
2. **Content Structuring** - Maps content to entities
3. **Design Automation** - Extracts design tokens from assets
4. **CMS Adaptation** - Converts generic content via adapter (Kirby)
5. **Deployment** - Deploys generated site

Each phase emits progress events via EventEmitter for real-time WebSocket updates.

### Testing Strategy (TDD)

This project follows **strict Test-Driven Development**:

1. Write failing test first
2. Implement minimum code to pass
3. Refactor
4. Repeat

**Test Pyramid**:
- 60% Unit tests (isolated services, generators, utilities)
- 30% Integration tests (API endpoints, workflow phases)
- 10% E2E tests (full generation flow)

When adding features:
- Start with unit test in appropriate package's `tests/unit/` directory
- Use `npm run test:watch` for rapid feedback
- Ensure tests fail before implementing
- Mock external dependencies (Claude API, file system in unit tests)

### Service Interface Pattern

When creating or modifying services:

1. Define interface in `packages/shared/src/interfaces/`
2. Implement local version in `packages/api/src/services/local/`
3. Register in DI container in `packages/api/src/config/di-setup.ts`
4. Write tests in `packages/api/tests/unit/services/`

Example:
```typescript
// 1. Define interface
interface IMyService {
  doSomething(input: string): Promise<Result>;
}

// 2. Implement
class LocalMyService implements IMyService {
  async doSomething(input: string): Promise<Result> { ... }
}

// 3. Register
container.register('myService', new LocalMyService());

// 4. Use in controllers/orchestrator
const service = container.resolve<IMyService>('myService');
```

## Important Conventions

### Environment Configuration
All environment variables are loaded from `.env` via `packages/api/src/config/env.ts`.

**Authentication** (Simple Token - Development Only):
- `AUTH_ENABLED` - Enable/disable authentication barrier (default: false)
- `AUTH_TOKEN` - Shared password for simple authentication
- Must match in both:
  - Backend: `packages/api/.env` → `AUTH_TOKEN`
  - Frontend: `packages/web/.env` → `VITE_AUTH_TOKEN`
- When enabled:
  - Users must enter password on frontend login page
  - All API requests validated against token
  - Token stored in localStorage
- For production: Replace with JWT-based authentication
- See `docs/authentication.md` for setup guide

**Local Development with Claude CLI** (Recommended):
- Set `NODE_ENV=local` and leave `CLAUDE_API_KEY` empty
- Install Claude CLI: `npm install -g @anthropic-ai/claude-code`
- Skills will use CLI instead of API (no API costs during development)

**Production with API**:
- `CLAUDE_API_KEY` - Anthropic API key (required)
- `NODE_ENV` - `production`

Optional (have defaults for local dev):
- `STORAGE_DIR`, `SESSION_DIR`, `DEPLOYMENT_DIR` - File system paths
- `PORT` - API server port (default: 3001)

### File Path Handling
- Always use absolute paths from `env.ts` configuration
- Use `path.join()` for cross-platform compatibility
- Storage paths: `STORAGE_DIR/projectId/`
- Upload paths: `UPLOAD_DIR/projectId/`
- Session paths: `SESSION_DIR/sessionId/`

### Error Handling
Use custom error classes from `packages/api/src/utils/errors.ts`:
- `WorkflowError` - For workflow phase failures (includes phase context)
- `ValidationError` - For input validation failures
- `NotFoundError` - For missing resources

All errors should be logged via Winston logger and propagated with context.

### WebSocket Progress Updates
Workflow progress is emitted via Socket.IO in real-time:
- Server: `packages/api/src/websocket/socket-handler.ts`
- Client: `packages/web/src/api/websocket.ts`
- Progress events include: phase, status, progress %, message

### Logging
Use Winston logger from `packages/api/src/config/logger.ts`:
```typescript
import { logger } from '../config/logger';

logger.info('Message', { context: 'value' });
logger.error('Error message', { error, projectId });
```

## Python Skills Development

Skills are in `packages/skills/src/skills/`. Each skill:
1. Uses Pydantic models for input/output validation
2. Calls Anthropic Claude Opus API
3. Returns structured JSON output
4. Has comprehensive tests in `tests/`

To work on skills:
```bash
cd packages/skills
source venv/bin/activate  # Always activate venv first
pytest tests/ -v          # Run tests
uvicorn src.main:app --reload --port 8001  # Dev server
```

## Common Pitfalls

1. **Don't bypass DI container** - Always use `container.resolve()`, never instantiate services directly
2. **Don't create CMS-specific logic outside adapters** - Keep skills and orchestrator CMS-agnostic
3. **Don't skip tests** - This is a TDD project; write tests first
4. **Don't hardcode paths** - Use env.ts configuration
5. **Always activate Python venv** - Skills won't work without it

## Key Files to Reference

- **DI Container**: `packages/shared/src/di/container.ts`
- **Workflow Orchestrator**: `packages/api/src/workflow/workflow-orchestrator.ts`
- **Service Interfaces**: `packages/shared/src/interfaces/`
- **Type Definitions**: `packages/shared/src/types/`
- **Environment Config**: `packages/api/src/config/env.ts`
- **Architecture Doc**: `ARCHITECTURE.md` (comprehensive system design)

## Kirby Generator (CMS Adapter)

The Kirby adapter (`packages/kirby-generator/src/adapters/kirby/`) converts generic content to Kirby-specific output:
- `blueprint-generator.ts` - Converts EntitySchema to Kirby blueprints (YAML)
- `template-generator.ts` - Generates PHP/Twig templates
- `content-generator.ts` - Converts ContentItem to Kirby .txt files
- `theme-generator.ts` - Applies design tokens to CSS
- `site-scaffolder.ts` - Creates Kirby installation structure

When modifying the generator, ensure changes maintain CMS-agnostic input interfaces.

## Kirby Demo Deployment

The system automatically deploys live Kirby demos after blueprint generation:

- **Service**: `KirbyDeploymentService` (DI key: `kirbyDeployment`)
- **Scheduler**: `CleanupScheduler` (runs daily at 2 AM)
- **Location**: `packages/api/kirby-demos/demo-{projectId}/`
- **TTL**: 7 days (configurable)
- **Quota**: 10 demos max (configurable)

See `docs/features/automatic-kirby-deployment.md` for details.
