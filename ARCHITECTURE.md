# Kirby-Gen Portfolio Generator - System Architecture

## Overview
End-to-end portfolio generator that creates fully customized portfolio sites through an AI-guided conversational interface.

**CMS-Agnostic Architecture**: The system produces generic, structured content that can be converted to any CMS (Kirby, Strapi, Contentful, etc.) via adapter pattern. Switching CMSs only requires writing a new adapter.

## Design Principles
1. **CMS Decoupling**: Content and schema generation is independent of CMS implementation
2. **Dependency Injection**: All cloud services have local equivalents
3. **Test-Driven Development**: Write tests first
4. **Modularity**: Each skill is independent and testable
5. **Local-First**: Fully runnable without external dependencies
6. **Adapter Pattern**: CMS-specific logic isolated in swappable adapters

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Interface (React)                    │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Input UI  │  │  Progress UI │  │  Preview & Review  │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                      API Backend (Node.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Session    │  │   Workflow   │  │   Generation     │  │
│  │  Controller  │  │  Orchestrator│  │    Controller    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────┬──────────────────────────────┬────────────────┘
              │                              │
    ┌─────────┴─────────┐        ┌─────────┴──────────┐
    │  Service Layer    │        │   Claude Skills     │
    │  (DI Container)   │        │   (Python/Opus)     │
    └─────────┬─────────┘        └──────────┬─────────┘
              │                              │
    ┌─────────┴─────────┐                   │
    │   Local Services  │                   │
    │  ┌─────────────┐  │        ┌─────────┴──────────┐
    │  │ FileStorage │  │        │  Domain Mapping    │
    │  │   (Local)   │  │        │      Skill         │
    │  ├─────────────┤  │        ├────────────────────┤
    │  │ SessionMgr  │  │        │  Content Structure │
    │  │   (Local)   │  │        │      Skill         │
    │  ├─────────────┤  │        ├────────────────────┤
    │  │   GitOps    │  │        │  Design Automation │
    │  │   (Local)   │  │        │      Skill         │
    │  ├─────────────┤  │        ├────────────────────┤
    │  │  Deployment │  │        │  Blueprint Gen     │
    │  │   (Local)   │  │        │      Skill         │
    │  └─────────────┘  │        └────────────────────┘
    └───────────────────┘                   │
              │                             │
    ┌─────────┴─────────────────────────────┴────────┐
    │         Kirby Generator (PHP/Node.js)          │
    │  ┌──────────────┐  ┌────────────────────────┐ │
    │  │  Blueprint   │  │  Template Generator    │ │
    │  │  Generator   │  │  (PHP/Twig)            │ │
    │  ├──────────────┤  ├────────────────────────┤ │
    │  │   Content    │  │  Custom Block Builder  │ │
    │  │  Generator   │  │                        │ │
    │  ├──────────────┤  ├────────────────────────┤ │
    │  │    Theme     │  │  Panel Customization   │ │
    │  │  Generator   │  │                        │ │
    │  └──────────────┘  └────────────────────────┘ │
    └──────────────────────────────────────────────┘
                         │
    ┌────────────────────┴────────────────────────┐
    │         Generated Kirby Site                │
    │  /content  /site/blueprints  /site/templates│
    │  /assets   /site/config      /site/snippets │
    └─────────────────────────────────────────────┘
```

## CMS-Agnostic Workflow

**Key Innovation**: Content generation is completely decoupled from CMS implementation.

### Workflow Separation

```
┌─────────────────────────────────────────────────────────────┐
│         PHASE 1: CMS-Agnostic Content Generation            │
│                                                              │
│  User Input → Domain Mapping → Content Schema (Generic)     │
│            → Content Structuring → Structured Content        │
│            → Design Automation → Design System               │
│                                                              │
│  Output: Generic JSON/YAML files (no CMS specifics)         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         PHASE 2: CMS Adapter Layer (Pluggable)              │
│                                                              │
│  Generic Content → CMS Adapter → CMS-Specific Output        │
│                         │                                    │
│                         ├─→ Kirby Adapter   → Kirby Site    │
│                         ├─→ Strapi Adapter  → Strapi Setup  │
│                         ├─→ Contentful      → Content Model │
│                         └─→ [Your CMS]      → Custom Output │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Generic Content Schema

The system produces three CMS-agnostic artifacts:

1. **Content Schema** (`schema.json`)
   - Entity definitions (content types)
   - Field definitions with generic types
   - Relationships between entities
   - Validation rules
   - No CMS-specific configuration

2. **Structured Content** (`content.json`)
   - Actual content data
   - Organized by entity type
   - Generic field values
   - Metadata (slug, status, dates)
   - No CMS-specific formatting

3. **Design System** (`design-system.json`)
   - Design tokens (colors, typography, spacing)
   - Component themes
   - Responsive breakpoints
   - No CMS-specific styling

### CMS Adapter Pattern

Each CMS adapter implements the `ICMSAdapter` interface:

```typescript
interface ICMSAdapter {
  convertSchema(schema: ContentSchema): Promise<CMSSchemaOutput>;
  convertContent(content: StructuredContentCollection): Promise<CMSContentOutput>;
  convertDesignSystem(design: DesignSystemSchema): Promise<CMSDesignOutput>;
  generateSite(config: GenerationConfig): Promise<GeneratedSite>;
  validateSchema(schema: ContentSchema): Promise<ValidationResult>;
}
```

### Benefits

1. **CMS Flexibility**: Switch CMSs without regenerating content
2. **Future-Proof**: New CMS support = new adapter only
3. **Testing**: Test content generation separately from CMS logic
4. **Migration**: Export from one CMS, import to another
5. **Multi-CMS**: Generate for multiple CMSs from same source

### Example: Adding a New CMS

To support a new CMS (e.g., Strapi):

```typescript
// packages/cms-adapters/strapi/strapi.adapter.ts
class StrapiAdapter implements ICMSAdapter {
  async convertSchema(schema: ContentSchema) {
    // Convert generic EntitySchema to Strapi Content-Type
  }

  async convertContent(content: StructuredContentCollection) {
    // Convert generic ContentItem to Strapi entries
  }

  // ... implement other methods
}

// Register adapter
registry.register(new StrapiAdapter());
```

No changes needed to:
- Domain mapping skill
- Content structuring skill
- Design automation skill
- Web interface
- API backend

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TanStack Query** for API state management
- **Zustand** for local state
- **WebSocket** for real-time progress updates
- **Vitest + React Testing Library** for tests

### Backend API
- **Node.js 20+** with Express
- **TypeScript** for type safety
- **Socket.io** for WebSocket communication
- **Zod** for validation
- **Jest** for testing
- **Winston** for logging

### Claude Skills (Python)
- **Python 3.11+**
- **Anthropic SDK** (Opus model)
- **Pydantic** for data validation
- **Pytest** for testing
- **FastAPI** for skill HTTP interfaces

### Kirby Generator
- **Node.js** for orchestration
- **PHP 8.2+** for Kirby-specific generation
- **Twig** for template generation
- **Composer** for PHP dependencies

### Infrastructure
- **Docker Compose** for local environment
- **Git** for version control
- **PHP built-in server** for local Kirby hosting

## Dependency Injection Strategy

### Service Interfaces

```typescript
// Storage Service
interface IStorageService {
  uploadFile(projectId: string, file: Buffer, filename: string): Promise<string>;
  downloadFile(projectId: string, filename: string): Promise<Buffer>;
  deleteProject(projectId: string): Promise<void>;
  listFiles(projectId: string): Promise<string[]>;
}

// Session Service
interface ISessionService {
  create(projectId: string, data: ProjectData): Promise<string>;
  get(sessionId: string): Promise<ProjectData | null>;
  update(sessionId: string, data: Partial<ProjectData>): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

// Deployment Service
interface IDeploymentService {
  deploy(projectId: string, buildPath: string): Promise<DeploymentResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  rollback(deploymentId: string): Promise<void>;
}

// Git Service
interface IGitService {
  createRepo(projectId: string, initialCommit: boolean): Promise<string>;
  commit(projectId: string, message: string, files: string[]): Promise<string>;
  push(projectId: string, remote: string, branch: string): Promise<void>;
}
```

### Implementation Strategy

```typescript
// Local implementations
class LocalStorageService implements IStorageService { ... }
class LocalSessionService implements ISessionService { ... }
class LocalDeploymentService implements IDeploymentService { ... }
class LocalGitService implements IGitService { ... }

// Cloud implementations (future)
class S3StorageService implements IStorageService { ... }
class RedisSessionService implements ISessionService { ... }
class VercelDeploymentService implements IDeploymentService { ... }

// DI Container
class ServiceContainer {
  private services: Map<string, any>;

  register<T>(key: string, implementation: T): void;
  resolve<T>(key: string): T;
}

// Configuration
const container = new ServiceContainer();
if (process.env.NODE_ENV === 'local') {
  container.register('storage', new LocalStorageService());
  container.register('session', new LocalSessionService());
  container.register('deployment', new LocalDeploymentService());
  container.register('git', new LocalGitService());
} else {
  container.register('storage', new S3StorageService());
  // ... cloud implementations
}
```

## Workflow Orchestration

### Generation Pipeline

1. **Input Collection Phase**
   - Customer uploads content files
   - Provides Pinterest moodboard link
   - Uploads branding assets
   - Session created and persisted

2. **Domain Mapping Phase** (Claude Skill - Opus)
   - Conversational agent discovers entities
   - Builds entity relationship model
   - Presents visual representation for approval
   - Outputs JSON schema for Kirby blueprints

3. **Content Structuring Phase** (Claude Skill)
   - Processes uploaded content files
   - Maps content to discovered entities
   - Generates Kirby .txt content files
   - Validates and enriches content

4. **Design Automation Phase** (Claude Skill)
   - Analyzes Pinterest moodboard
   - Extracts design tokens (colors, typography, spacing)
   - Merges with branding assets (branding takes precedence)
   - Generates CSS custom properties
   - Creates design system documentation

5. **Blueprint Generation Phase** (Claude Skill)
   - Converts entity schema to Kirby blueprints
   - Generates relationship fields
   - Creates custom sections for design tokens
   - Outputs YAML blueprint files

6. **Site Generation Phase** (Kirby Generator)
   - Scaffolds fresh Kirby installation
   - Generates templates (PHP/Twig)
   - Creates custom blocks
   - Applies design system
   - Integrates content
   - Customizes panel

7. **Deployment Phase**
   - Creates Git repository
   - Commits generated site
   - Deploys to local/staging URL
   - Returns access credentials

## Testing Strategy (TDD)

### Test Pyramid

```
                    ┌──────────────┐
                    │  E2E Tests   │  (10%)
                    │  - Full flow │
                    └──────────────┘
                 ┌────────────────────┐
                 │  Integration Tests │  (30%)
                 │  - API endpoints   │
                 │  - Skills pipeline │
                 └────────────────────┘
            ┌──────────────────────────────┐
            │        Unit Tests            │  (60%)
            │  - Service layer             │
            │  - Generators                │
            │  - Skills (individual)       │
            └──────────────────────────────┘
```

### Test First Approach

For each component:
1. Write failing test
2. Implement minimum code to pass
3. Refactor
4. Repeat

### Test Coverage Goals
- **Unit tests**: 90%+ coverage
- **Integration tests**: Critical paths covered
- **E2E tests**: Happy path + key error scenarios

## Data Flow

### Project Data Model

```typescript
interface ProjectData {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Input phase
  inputs: {
    contentFiles: FileReference[];
    pinterestUrl?: string;
    brandingAssets: BrandingAssets;
  };

  // Domain mapping phase
  domainModel: {
    entities: Entity[];
    relationships: Relationship[];
    schema: JSONSchema;
  };

  // Content structuring phase
  structuredContent: {
    [entityType: string]: ContentItem[];
  };

  // Design phase
  designSystem: {
    tokens: DesignTokens;
    moodboard: MoodboardAnalysis;
    branding: BrandingAssets;
  };

  // Blueprint phase
  blueprints: {
    [entityType: string]: KirbyBlueprint;
  };

  // Generation phase
  generated: {
    sitePath: string;
    gitRepo: string;
    deploymentUrl: string;
  };

  // Metadata
  status: 'input' | 'mapping' | 'structuring' | 'design' | 'blueprints' | 'generating' | 'deploying' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  errors: Error[];
}
```

## Local Development Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PHP 8.2+
- Composer
- Docker (optional)
- Git

### Environment Variables

```bash
# API
NODE_ENV=local
PORT=3000
CLAUDE_API_KEY=sk-ant-...

# Storage
STORAGE_TYPE=local
STORAGE_PATH=/tmp/kirby-gen/storage

# Sessions
SESSION_TYPE=local
SESSION_PATH=/tmp/kirby-gen/sessions

# Deployment
DEPLOY_TYPE=local
DEPLOY_BASE_PATH=/tmp/kirby-gen/deployments
DEPLOY_BASE_PORT=8000

# Git
GIT_TYPE=local
GIT_BASE_PATH=/tmp/kirby-gen/repos
```

### Running Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development servers
npm run dev

# This starts:
# - Web interface: http://localhost:5173
# - API backend: http://localhost:3000
# - Skills server: http://localhost:8001
```

## Claude Skills Architecture

### Skill Structure

Each skill is a Python module with:
- Input validation (Pydantic)
- Opus-powered processing
- Output generation
- Comprehensive tests

```python
# skills/domain_mapping/skill.py
class DomainMappingSkill:
    def __init__(self, anthropic_client):
        self.client = anthropic_client

    async def execute(self, inputs: DomainMappingInput) -> DomainMappingOutput:
        # 1. Initialize conversation
        # 2. Guide customer through entity discovery
        # 3. Build entity relationship model
        # 4. Generate JSON schema
        # 5. Return structured output
        pass
```

### Communication Protocol

Skills communicate via:
- **HTTP API**: Request/response for stateless operations
- **WebSocket**: Streaming for conversational interactions
- **Message Queue**: Asynchronous processing (local: in-memory queue)

## Security Considerations

1. **Input Validation**: All inputs validated with Zod/Pydantic
2. **File Upload Limits**: Configurable max file sizes
3. **Sandboxing**: Generated Kirby sites run in isolated environments
4. **Auth**: Magic link authentication (local: simplified token auth)
5. **Rate Limiting**: Prevent abuse (local: relaxed limits)

## Scalability Considerations

### Current (Local)
- Single machine
- In-memory session storage
- Local file system
- Sequential processing

### Future (Cloud)
- Horizontal scaling with load balancer
- Redis for session storage
- S3 for file storage
- Queue-based parallel processing
- CDN for static assets

## Monitoring & Logging

- **Winston** for structured logging
- **Request ID** tracking through entire pipeline
- **Error reporting** with stack traces
- **Performance metrics** for each phase

## Next Steps

1. Set up monorepo structure
2. Implement DI container
3. Create local service implementations
4. Build domain mapping skill (TDD)
5. Build API backend (TDD)
6. Build web interface
7. Integrate all components
8. Write E2E tests
9. Document setup process

## Assumptions (for MVP)

1. **Auth**: Simple token-based auth (magic link placeholder)
2. **Storage**: Local file system (no quotas initially)
3. **Deployment**: PHP built-in server on random ports
4. **Git**: Local repos (no GitHub integration yet)
5. **Responsive**: Mobile-first, standard breakpoints (320, 768, 1024, 1440px)
6. **Content**: Support common formats (MD, TXT, DOCX, PDF, images)
7. **Kirby**: Vanilla Kirby 4 with custom theme
8. **Regeneration**: Full regeneration only (no partial updates yet)
9. **Projects**: No limits initially
10. **Progress**: WebSocket with polling fallback
