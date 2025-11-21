# Storage Refactor Design: Replace Git with Filesystem Persistence

**Date:** 2025-11-21
**Status:** Approved
**Author:** Claude Code (with user approval)

## Problem Statement

The current system misuses Git operations for data persistence:
- Git repository created for each project in Phase 4 (CMS Adaptation)
- `git commit` and `git push` used to "save" generated artifacts
- Conflates version control with data persistence
- Adds unnecessary complexity and overhead

Additionally, conversation history (user-Claude dialogue during domain mapping) is never persisted, making it impossible to:
- Resume interrupted sessions
- Audit decision-making process
- Understand how domain models evolved

## Goals

1. **Remove Git misuse** - Stop using Git for data persistence
2. **Add conversation persistence** - Save full conversation history by workflow phase
3. **Simplify architecture** - Use filesystem storage exclusively (KISS principle)
4. **Maintain clean separation** - Clear distinction between inputs, AI results, and generated artifacts
5. **Future-proof design** - Keep DI architecture ready for PostgreSQL/S3 upgrade later

## Non-Goals

- Database implementation (filesystem only for now)
- Object storage (S3) integration (future enhancement)
- Git for actual version control (removed entirely)
- Migration of existing projects (clean slate acceptable)

## Design Overview

### New Storage Structure

```
STORAGE_DIR/{projectId}/
├── _project.json              # Core metadata + AI results
├── conversations/             # NEW: Conversation transcripts by phase
│   ├── domain-mapping.json    # Phase 1: Discovery dialogue
│   ├── content-review.json    # Phase 2: Content clarifications
│   └── design-feedback.json   # Phase 3: Design iterations
├── uploads/                   # User-uploaded files (existing)
│   ├── resume.pdf
│   ├── logo.png
│   └── logo.png.meta.json
└── generated/                 # NEW: Generated site artifacts
    ├── blueprints/            # Kirby YAML blueprints
    ├── templates/             # PHP/Twig templates
    ├── content/               # Kirby .txt content files
    └── assets/                # Processed design assets
```

### Architecture Principles

1. **Single responsibility**: StorageService handles all persistence
2. **Phase-specific conversations**: One JSON file per workflow phase
3. **Clear lifecycle**: Conversations are "active" during phase, "completed" after
4. **Atomic operations**: File writes use atomic rename operations
5. **No git dependencies**: Complete removal of GitService

## Data Structures

### New Types

Add to `packages/shared/src/types/project.types.ts`:

```typescript
/**
 * Single conversation turn (user or assistant message)
 */
export interface ConversationTurn {
  id: string;                    // Unique turn ID
  timestamp: Date;               // When message was sent
  role: 'user' | 'assistant' | 'system';
  content: string;               // Message content
  metadata?: {
    tokensUsed?: number;         // Token count (for cost tracking)
    model?: string;              // Claude model used
    latencyMs?: number;          // Response time
  };
}

/**
 * Conversation session for a specific workflow phase
 */
export interface ConversationSession {
  projectId: string;
  phase: WorkflowPhase;          // 'domain-mapping' | 'content-structuring' | etc.
  sessionId: string;             // Unique session identifier
  startedAt: Date;
  completedAt?: Date;
  turns: ConversationTurn[];     // All conversation turns in order
  status: 'active' | 'completed' | 'abandoned';
}

/**
 * Metadata about generated artifacts
 */
export interface GeneratedArtifacts {
  blueprints: FileReference[];    // Kirby blueprint YAML files
  templates: FileReference[];     // PHP/Twig templates
  content: FileReference[];       // Kirby .txt content files
  assets: FileReference[];        // Processed images, CSS, etc.
  generatedAt: Date;              // When artifacts were generated
  cmsAdapter: string;             // 'kirby' | 'strapi' | etc.
}
```

### Updated ProjectData

Modify existing `ProjectData` in `packages/shared/src/types/project.types.ts`:

```typescript
export interface ProjectData {
  id: string;
  name: string;
  inputs: {
    contentFiles: FileReference[];
    pinterestUrl?: string;
    brandingAssets: BrandingAssets;
  };

  // AI-generated results (existing)
  domainModel?: DomainModel;
  structuredContent?: StructuredContent;
  designSystem?: DesignSystem;

  // NEW: Generated artifacts reference
  generatedArtifacts?: GeneratedArtifacts;

  // REMOVED: No more 'generated.gitRepo' field

  status: ProjectStatus;
  errors: ProjectError[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Key changes:**
- ❌ Remove `generated.gitRepo` field
- ✅ Add `generatedArtifacts` field
- ✅ Add conversation tracking via separate files

## Service Interface Changes

### IStorageService Interface

Update `packages/shared/src/interfaces/storage.interface.ts`:

```typescript
interface IStorageService {
  // Existing methods (keep as-is)
  createProject(projectData: ProjectData): Promise<ProjectData>;
  updateProject(projectId: string, updates: Partial<ProjectData>): Promise<ProjectData>;
  getProject(projectId: string): Promise<ProjectData | null>;
  deleteProject(projectId: string): Promise<void>;
  uploadFile(projectId: string, file: UploadedFile): Promise<FileReference>;

  // NEW: Conversation management
  saveConversationTurn(
    projectId: string,
    phase: WorkflowPhase,
    turn: ConversationTurn
  ): Promise<void>;

  getConversation(
    projectId: string,
    phase: WorkflowPhase
  ): Promise<ConversationSession | null>;

  // NEW: Generated artifacts management
  saveGeneratedArtifacts(
    projectId: string,
    artifacts: GeneratedArtifacts
  ): Promise<void>;

  getGeneratedArtifacts(
    projectId: string
  ): Promise<GeneratedArtifacts | null>;
}
```

### LocalStorageService Implementation

Update `packages/api/src/services/local/storage.service.ts`:

#### Conversation Storage (Append-Based)

```typescript
/**
 * Save a conversation turn (append-based for active conversations)
 */
async saveConversationTurn(
  projectId: string,
  phase: WorkflowPhase,
  turn: ConversationTurn
): Promise<void> {
  const conversationPath = path.join(
    this.baseDir,
    projectId,
    'conversations',
    `${phase}.json`
  );

  // Load existing conversation or create new
  let session: ConversationSession;
  if (await fs.pathExists(conversationPath)) {
    session = await fs.readJson(conversationPath);
  } else {
    session = {
      projectId,
      phase,
      sessionId: generateId(),
      startedAt: new Date(),
      turns: [],
      status: 'active'
    };
  }

  // Append new turn
  session.turns.push(turn);

  // Write atomically (tmp file + rename)
  await fs.ensureDir(path.dirname(conversationPath));
  const tmpPath = `${conversationPath}.tmp`;
  await fs.writeJson(tmpPath, session, { spaces: 2 });
  await fs.rename(tmpPath, conversationPath);
}

/**
 * Get conversation by phase
 */
async getConversation(
  projectId: string,
  phase: WorkflowPhase
): Promise<ConversationSession | null> {
  const conversationPath = path.join(
    this.baseDir,
    projectId,
    'conversations',
    `${phase}.json`
  );

  if (await fs.pathExists(conversationPath)) {
    return fs.readJson(conversationPath);
  }
  return null;
}

/**
 * Save generated artifacts metadata
 */
async saveGeneratedArtifacts(
  projectId: string,
  artifacts: GeneratedArtifacts
): Promise<void> {
  // Update project metadata with artifacts reference
  const project = await this.getProject(projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  await this.updateProject(projectId, {
    generatedArtifacts: artifacts
  });
}

/**
 * Get generated artifacts metadata
 */
async getGeneratedArtifacts(
  projectId: string
): Promise<GeneratedArtifacts | null> {
  const project = await this.getProject(projectId);
  return project?.generatedArtifacts || null;
}
```

### Remove GitService Entirely

**Files to delete:**
1. `packages/shared/src/interfaces/git.interface.ts`
2. `packages/api/src/services/local/git.service.ts`
3. `packages/api/tests/unit/services/git.*.test.ts`
4. `packages/api/tests/integration/git-deployment.integration.test.ts`

**Update DI container** (`packages/api/src/config/di-setup.ts`):
```typescript
// DELETE this registration
container.register('gitService', new LocalGitService());
```

## Workflow Orchestrator Changes

Update `packages/api/src/workflow/workflow-orchestrator.ts`:

### Phase 4: CMS Adaptation

**Before (lines 311-327):**
```typescript
// Initialize git repository (MISUSE - for data persistence)
this.emitProgress(state, 'in_progress', 75, 'Initializing Git repository...');
const gitRepo = await this.gitService.createRepo(project.id, true);

// Update project
project.generated = {
  cmsName: 'kirby',
  gitRepo,  // Git repo path stored
  ...
};
```

**After:**
```typescript
// Save generated artifacts to storage
this.emitProgress(state, 'in_progress', 75, 'Saving generated artifacts...');

// Collect all generated file references
const artifacts: GeneratedArtifacts = {
  blueprints: await this.collectFileReferences(
    path.join(generatedPath, 'site', 'blueprints'),
    '**/*.yml'
  ),
  templates: await this.collectFileReferences(
    path.join(generatedPath, 'site', 'templates'),
    '**/*.php'
  ),
  content: await this.collectFileReferences(
    path.join(generatedPath, 'content'),
    '**/*.txt'
  ),
  assets: await this.collectFileReferences(
    path.join(generatedPath, 'assets'),
    '**/*'
  ),
  generatedAt: new Date(),
  cmsAdapter: 'kirby'
};

// Persist to storage
await this.storageService.saveGeneratedArtifacts(project.id, artifacts);
```

### Helper Method

Add to `WorkflowOrchestrator`:

```typescript
/**
 * Collect file references from a directory matching a glob pattern
 */
private async collectFileReferences(
  baseDir: string,
  pattern: string
): Promise<FileReference[]> {
  const glob = require('glob');
  const files = glob.sync(pattern, { cwd: baseDir, nodir: true });

  return files.map(file => ({
    filename: path.basename(file),
    path: path.join(baseDir, file),
    size: fs.statSync(path.join(baseDir, file)).size,
    mimeType: mime.lookup(file) || 'application/octet-stream',
    uploadedAt: new Date()
  }));
}
```

## Controller Changes

### Domain Mapping Controller

Update `packages/api/src/controllers/domain-mapping.controller.ts`:

```typescript
/**
 * Handle domain mapping message (conversational)
 */
async handleDomainMappingMessage(req: Request, res: Response) {
  const { projectId } = req.params;
  const { message, conversationHistory } = req.body;

  // Call Claude skill for response
  const response = await this.skillsService.domainMapping({
    message,
    conversationHistory
  });

  // NEW: Save conversation turn
  const storageService = container.resolve<IStorageService>('storageService');

  // Save user message
  await storageService.saveConversationTurn(projectId, 'domain-mapping', {
    id: generateId(),
    timestamp: new Date(),
    role: 'user',
    content: message
  });

  // Save assistant response
  await storageService.saveConversationTurn(projectId, 'domain-mapping', {
    id: generateId(),
    timestamp: new Date(),
    role: 'assistant',
    content: response.message,
    metadata: {
      tokensUsed: response.tokensUsed,
      model: response.model,
      latencyMs: response.latencyMs
    }
  });

  res.json(response);
}
```

### Project Controller

Add new endpoint in `packages/api/src/controllers/project.controller.ts`:

```typescript
/**
 * Get conversation history for a specific phase
 * GET /api/projects/:projectId/conversations/:phase
 */
async getConversation(req: Request, res: Response) {
  const { projectId, phase } = req.params;
  const storageService = container.resolve<IStorageService>('storageService');

  const conversation = await storageService.getConversation(
    projectId,
    phase as WorkflowPhase
  );

  if (!conversation) {
    return res.status(404).json({
      error: 'Conversation not found'
    });
  }

  res.json(conversation);
}
```

## Migration Strategy

### Option 1: Clean Slate (Recommended)

Since the project is in early development:

```bash
# Delete existing storage
rm -rf packages/api/data/storage/*
rm -rf packages/api/data/sessions/*

# Let new structure create itself on first use
npm run dev
```

### Option 2: Migration Script (If Needed)

If you have valuable test data, create `scripts/migrate-storage.ts`:

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

async function migrateProjects() {
  const storageDir = process.env.STORAGE_DIR || './packages/api/data/storage';
  const projectDirs = await fs.readdir(storageDir);

  for (const projectId of projectDirs) {
    const projectPath = path.join(storageDir, projectId);
    const projectJsonPath = path.join(projectPath, '_project.json');

    if (!await fs.pathExists(projectJsonPath)) continue;

    // 1. Read old project data
    const project = await fs.readJson(projectJsonPath);

    // 2. Remove git references
    if (project.generated?.gitRepo) {
      delete project.generated.gitRepo;
    }

    // 3. Create conversations directory
    await fs.ensureDir(path.join(projectPath, 'conversations'));

    // 4. Create generated directory (if generated files exist)
    const generatedPath = path.join(projectPath, 'generated');
    await fs.ensureDir(generatedPath);

    // 5. Write back updated project
    await fs.writeJson(projectJsonPath, project, { spaces: 2 });

    console.log(`✅ Migrated project: ${projectId}`);
  }
}

migrateProjects().catch(console.error);
```

Run with: `npx ts-node scripts/migrate-storage.ts`

## Implementation Plan (TDD)

### Phase 1: Types & Interfaces
1. Add new types to `packages/shared/src/types/project.types.ts`
2. Update `IStorageService` interface in `packages/shared/src/interfaces/storage.interface.ts`
3. Build shared package: `npm run build --workspace=packages/shared`

**No tests needed** (pure type definitions)

### Phase 2: Storage Service (TDD)

**Test file:** `packages/api/tests/unit/services/storage-conversation.test.ts`

```typescript
describe('LocalStorageService - Conversation Management', () => {
  it('should create new conversation session on first turn', async () => {
    const turn: ConversationTurn = {
      id: 'turn-1',
      timestamp: new Date(),
      role: 'user',
      content: 'Hello'
    };

    await storageService.saveConversationTurn('project-1', 'domain-mapping', turn);

    const session = await storageService.getConversation('project-1', 'domain-mapping');
    expect(session).toBeDefined();
    expect(session?.turns).toHaveLength(1);
    expect(session?.status).toBe('active');
  });

  it('should append turn to existing conversation', async () => {
    // Save first turn
    await storageService.saveConversationTurn('project-1', 'domain-mapping', turn1);

    // Save second turn
    await storageService.saveConversationTurn('project-1', 'domain-mapping', turn2);

    const session = await storageService.getConversation('project-1', 'domain-mapping');
    expect(session?.turns).toHaveLength(2);
  });

  it('should return null for non-existent conversation', async () => {
    const session = await storageService.getConversation('non-existent', 'domain-mapping');
    expect(session).toBeNull();
  });

  it('should handle multiple phases independently', async () => {
    await storageService.saveConversationTurn('project-1', 'domain-mapping', turn1);
    await storageService.saveConversationTurn('project-1', 'content-review', turn2);

    const domainSession = await storageService.getConversation('project-1', 'domain-mapping');
    const contentSession = await storageService.getConversation('project-1', 'content-review');

    expect(domainSession?.turns).toHaveLength(1);
    expect(contentSession?.turns).toHaveLength(1);
  });
});
```

**Implementation:**
1. Write failing tests
2. Implement `saveConversationTurn()` method
3. Implement `getConversation()` method
4. Tests pass

**Test file:** `packages/api/tests/unit/services/storage-artifacts.test.ts`

```typescript
describe('LocalStorageService - Artifacts Management', () => {
  it('should save generated artifacts metadata', async () => {
    const artifacts: GeneratedArtifacts = {
      blueprints: [/* ... */],
      templates: [/* ... */],
      content: [/* ... */],
      assets: [/* ... */],
      generatedAt: new Date(),
      cmsAdapter: 'kirby'
    };

    await storageService.saveGeneratedArtifacts('project-1', artifacts);

    const project = await storageService.getProject('project-1');
    expect(project?.generatedArtifacts).toEqual(artifacts);
  });

  it('should retrieve generated artifacts', async () => {
    await storageService.saveGeneratedArtifacts('project-1', artifacts);

    const retrieved = await storageService.getGeneratedArtifacts('project-1');
    expect(retrieved).toEqual(artifacts);
  });

  it('should return null for project without artifacts', async () => {
    const artifacts = await storageService.getGeneratedArtifacts('project-1');
    expect(artifacts).toBeNull();
  });
});
```

**Implementation:**
1. Write failing tests
2. Implement `saveGeneratedArtifacts()` method
3. Implement `getGeneratedArtifacts()` method
4. Tests pass

### Phase 3: Remove Git (TDD)

**Update test:** `packages/api/tests/integration/workflow.integration.test.ts`

```typescript
describe('Workflow Orchestrator - Phase 4', () => {
  // REMOVE: Git-related assertions
  // it('should initialize git repository', ...)

  // ADD: Artifact storage assertions
  it('should save generated artifacts to storage', async () => {
    const projectId = 'test-project';
    await orchestrator.executePhase4_CMSAdaptation(projectId);

    const artifacts = await storageService.getGeneratedArtifacts(projectId);
    expect(artifacts).toBeDefined();
    expect(artifacts?.blueprints.length).toBeGreaterThan(0);
    expect(artifacts?.templates.length).toBeGreaterThan(0);
    expect(artifacts?.cmsAdapter).toBe('kirby');
  });
});
```

**Implementation:**
1. Update workflow orchestrator tests
2. Replace git calls with storage service calls in orchestrator
3. Delete git service files
4. Remove from DI container
5. Run integration tests - should pass

### Phase 4: Controller Integration

**Test file:** `packages/api/tests/integration/conversation.integration.test.ts`

```typescript
describe('Conversation API', () => {
  it('should save conversation turn via domain mapping endpoint', async () => {
    const response = await request(app)
      .post('/api/projects/project-1/domain-mapping/message')
      .send({ message: 'I do gigs and websites' });

    expect(response.status).toBe(200);

    // Verify conversation was saved
    const conversation = await storageService.getConversation('project-1', 'domain-mapping');
    expect(conversation?.turns).toHaveLength(2); // user + assistant
  });

  it('should retrieve conversation history', async () => {
    // Create some conversation turns
    await storageService.saveConversationTurn('project-1', 'domain-mapping', turn1);
    await storageService.saveConversationTurn('project-1', 'domain-mapping', turn2);

    const response = await request(app)
      .get('/api/projects/project-1/conversations/domain-mapping');

    expect(response.status).toBe(200);
    expect(response.body.turns).toHaveLength(2);
  });

  it('should return 404 for non-existent conversation', async () => {
    const response = await request(app)
      .get('/api/projects/non-existent/conversations/domain-mapping');

    expect(response.status).toBe(404);
  });
});
```

**Implementation:**
1. Write failing tests
2. Update domain mapping controller to save turns
3. Add conversation retrieval endpoint to project controller
4. Tests pass

### Phase 5: E2E Validation

**Test file:** `packages/api/tests/e2e/full-workflow.e2e.test.ts`

```typescript
describe('Full Workflow E2E', () => {
  it('should complete full workflow with conversation tracking', async () => {
    // 1. Create project
    const project = await createProject('Test Portfolio');

    // 2. Upload files
    await uploadFile(project.id, 'resume.pdf');

    // 3. Domain mapping (with conversation)
    await sendMessage(project.id, 'I do music gigs and websites');
    await sendMessage(project.id, 'yes');

    // 4. Generate domain model
    await generateDomainModel(project.id);

    // 5. Verify conversation was saved
    const conversation = await storageService.getConversation(project.id, 'domain-mapping');
    expect(conversation?.turns.length).toBeGreaterThan(0);

    // 6. Complete workflow
    await orchestrator.executePhase2(project.id);
    await orchestrator.executePhase3(project.id);
    await orchestrator.executePhase4(project.id);

    // 7. Verify artifacts were saved (not git repo)
    const artifacts = await storageService.getGeneratedArtifacts(project.id);
    expect(artifacts).toBeDefined();
    expect(artifacts?.blueprints.length).toBeGreaterThan(0);

    // 8. Verify no git operations occurred
    const projectPath = path.join(STORAGE_DIR, project.id);
    expect(await fs.pathExists(path.join(projectPath, '.git'))).toBe(false);
  });
});
```

## Rollout Plan

### Local Development
1. Merge to feature branch: `git checkout -b feature/storage-refactor`
2. Implement following TDD phases (1-5)
3. Run full test suite: `npm test`
4. Manual E2E test with real portfolio generation
5. Verify conversation files created in `data/storage/{projectId}/conversations/`

### Staging Deployment (Coolify VPS)
1. Push feature branch to remote
2. Deploy to Coolify staging environment
3. Run E2E tests on VPS
4. Test with real Claude API (not CLI)
5. Verify file permissions and storage paths work on VPS

### Production Graduation
1. Code review
2. Merge to `master` branch
3. Deploy to Coolify production
4. Monitor for errors
5. Celebrate clean architecture! 🎉

## Success Metrics

- ✅ Zero git operations during workflow execution
- ✅ Conversation files created in `conversations/` directory
- ✅ Generated artifacts saved to `generated/` directory
- ✅ All tests passing (unit, integration, E2E)
- ✅ No breaking changes to existing API contracts
- ✅ Storage directory structure clean and logical

## Future Enhancements (Post-KISS Phase)

### Database Migration
When scaling beyond single-user:
1. Create PostgreSQL adapter implementing `IStorageService`
2. Store conversations in `conversations` table (better querying)
3. Store project metadata in `projects` table
4. Keep file storage for uploads/generated artifacts
5. Register PostgreSQL service in DI container

### Object Storage
For production scale:
1. Create S3 adapter for file storage
2. Store uploads in S3 bucket
3. Store generated artifacts in separate bucket
4. Keep metadata in database
5. Add CDN for asset delivery

### Conversation Features
- Search across conversations
- Export conversations as markdown
- Replay conversations for debugging
- Analytics on conversation patterns

## Open Questions

None - design approved and ready for implementation.

## References

- Current storage implementation: [packages/api/src/services/local/storage.service.ts](packages/api/src/services/local/storage.service.ts)
- Current workflow orchestrator: [packages/api/src/workflow/workflow-orchestrator.ts](packages/api/src/workflow/workflow-orchestrator.ts)
- Project types: [packages/shared/src/types/project.types.ts](packages/shared/src/types/project.types.ts)
- Storage interface: [packages/shared/src/interfaces/storage.interface.ts](packages/shared/src/interfaces/storage.interface.ts)
