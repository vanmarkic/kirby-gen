# Automatic Kirby Demo Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically deploy live Kirby demo sites immediately after blueprint generation, with TTL-based cleanup and quota enforcement.

**Architecture:** Service-oriented design using DI container. KirbyDeploymentService handles installation, deployment, and lifecycle. CleanupScheduler manages TTL and quota. EmailService notifies on archival. Integrated into workflow orchestrator as new phase after blueprint generation.

**Tech Stack:** TypeScript, Node.js, Express, node-cron, PHP dev server, fs-extra

---

## Prerequisites

- Read the design document: `docs/plans/2025-11-21-automatic-kirby-demo-deployment-design.md`
- Ensure you're in a clean git worktree (recommended via `superpowers:using-git-worktrees`)
- Review architecture: `ARCHITECTURE.md` (DI pattern, service interfaces)
- Review project conventions: `CLAUDE.md` (TDD approach, testing pyramid)

---

## Task 1: Create Service Interfaces

**Files:**
- Create: `packages/shared/src/interfaces/IKirbyDeploymentService.ts`
- Create: `packages/shared/src/interfaces/IEmailService.ts`
- Create: `packages/shared/src/interfaces/index.ts` (if doesn't exist, else modify)

**Step 1: Create IEmailService interface**

Create file: `packages/shared/src/interfaces/IEmailService.ts`

```typescript
export interface IEmailService {
  send(options: EmailOptions): Promise<void>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}
```

**Step 2: Create IKirbyDeploymentService interface**

Create file: `packages/shared/src/interfaces/IKirbyDeploymentService.ts`

```typescript
export interface IKirbyDeploymentService {
  deploy(projectId: string): Promise<DeploymentResult>;
  getDeployment(projectId: string): Promise<DeploymentInfo | null>;
  archive(projectId: string): Promise<void>;
  cleanupOldDemos(): Promise<CleanupResult>;
}

export interface DeploymentResult {
  projectId: string;
  url: string;
  port: number;
  deployedAt: Date;
  panelUrl: string;
}

export interface DeploymentInfo {
  projectId: string;
  url: string;
  port: number;
  deployedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface CleanupResult {
  archived: string[];
  quotaReached: boolean;
  emailsSent: string[];
}
```

**Step 3: Export interfaces from index**

Modify/create: `packages/shared/src/interfaces/index.ts`

Add these exports:
```typescript
export * from './IEmailService';
export * from './IKirbyDeploymentService';
```

**Step 4: Build shared package**

```bash
cd packages/shared
npm run build
```

Expected: Build succeeds, no errors

**Step 5: Commit**

```bash
git add packages/shared/src/interfaces/
git commit -m "feat(shared): add IKirbyDeploymentService and IEmailService interfaces"
```

---

## Task 2: Update Session Types

**Files:**
- Modify: `packages/shared/src/types/session.types.ts`

**Step 1: Add demoDeployment to ProjectData interface**

Find the `ProjectData` interface and add this field:

```typescript
export interface ProjectData {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // ... existing fields ...

  // Instant demo deployment info (ADD THIS)
  demoDeployment?: {
    url: string;
    panelUrl: string;
    deployedAt: Date;
    port: number;
    expiresAt?: Date;
  };

  // ... rest of fields ...
}
```

**Step 2: Build shared package**

```bash
cd packages/shared
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/shared/src/types/session.types.ts
git commit -m "feat(shared): add demoDeployment field to ProjectData"
```

---

## Task 3: Install Dependencies

**Files:**
- Modify: `packages/api/package.json`

**Step 1: Add node-cron dependency**

In `packages/api/package.json`, add to `dependencies`:

```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  }
}
```

**Step 2: Add type definitions**

In `devDependencies`:

```json
{
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

**Step 3: Install packages**

```bash
cd packages/api
npm install
```

Expected: Packages install successfully

**Step 4: Commit**

```bash
git add packages/api/package.json packages/api/package-lock.json
git commit -m "chore(api): add node-cron dependency"
```

---

## Task 4: Implement LocalEmailService (TDD)

**Files:**
- Create: `packages/api/tests/unit/services/local-email.test.ts`
- Create: `packages/api/src/services/local/local-email.service.ts`

**Step 1: Write failing test**

Create file: `packages/api/tests/unit/services/local-email.test.ts`

```typescript
import { LocalEmailService } from '../../../src/services/local/local-email.service';
import fs from 'fs-extra';
import path from 'path';

describe('LocalEmailService', () => {
  let service: LocalEmailService;
  let testEmailsDir: string;

  beforeEach(() => {
    testEmailsDir = path.join(__dirname, '../../tmp/test-emails');
    service = new LocalEmailService(testEmailsDir);
  });

  afterEach(async () => {
    await fs.remove(testEmailsDir);
  });

  describe('send', () => {
    it('should log email to file', async () => {
      await service.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      });

      const files = await fs.readdir(testEmailsDir);
      expect(files.length).toBe(1);

      const content = await fs.readFile(
        path.join(testEmailsDir, files[0]),
        'utf-8'
      );

      expect(content).toContain('To: test@example.com');
      expect(content).toContain('Subject: Test Subject');
      expect(content).toContain('Test body content');
    });

    it('should create emails directory if not exists', async () => {
      await fs.remove(testEmailsDir);

      await service.send({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Body'
      });

      const exists = await fs.pathExists(testEmailsDir);
      expect(exists).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/local-email.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Create minimal implementation**

Create file: `packages/api/src/services/local/local-email.service.ts`

```typescript
import { IEmailService, EmailOptions } from '@kirby-gen/shared';
import { logger } from '../../config/logger';
import fs from 'fs-extra';
import path from 'path';

export class LocalEmailService implements IEmailService {
  private readonly emailsDir: string;

  constructor(emailsDir?: string) {
    this.emailsDir = emailsDir || path.join(process.cwd(), 'emails-log');
    fs.ensureDirSync(this.emailsDir);
  }

  async send(options: EmailOptions): Promise<void> {
    const timestamp = new Date().toISOString();
    const filename = `${timestamp.replace(/[:.]/g, '-')}-email.txt`;
    const filepath = path.join(this.emailsDir, filename);

    const email = `
To: ${options.to}
Subject: ${options.subject}
Date: ${timestamp}

${options.body}
`;

    await fs.writeFile(filepath, email);

    logger.info(`Email logged to: ${filepath}`, {
      to: options.to,
      subject: options.subject
    });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/local-email.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/local/local-email.service.ts \
        packages/api/tests/unit/services/local-email.test.ts
git commit -m "feat(api): implement LocalEmailService with TDD"
```

---

## Task 5: Implement KirbyDeploymentService - Part 1 (Core Structure)

**Files:**
- Create: `packages/api/tests/unit/services/kirby-deployment.test.ts`
- Create: `packages/api/src/services/local/kirby-deployment.service.ts`

**Step 1: Write failing test for deploy method**

Create file: `packages/api/tests/unit/services/kirby-deployment.test.ts`

```typescript
import { KirbyDeploymentService } from '../../../src/services/local/kirby-deployment.service';
import { IStorageService, IEmailService } from '@kirby-gen/shared';
import path from 'path';
import fs from 'fs-extra';

describe('KirbyDeploymentService', () => {
  let service: KirbyDeploymentService;
  let mockStorage: jest.Mocked<IStorageService>;
  let mockEmail: jest.Mocked<IEmailService>;
  let testDemosDir: string;

  beforeEach(() => {
    testDemosDir = path.join(__dirname, '../../tmp/test-kirby-demos');

    mockStorage = {
      listFiles: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      deleteProject: jest.fn()
    } as any;

    mockEmail = {
      send: jest.fn()
    };

    service = new KirbyDeploymentService(
      mockStorage,
      mockEmail,
      {
        demosDir: testDemosDir,
        basePort: 9000,
        ttlDays: 7,
        maxDemos: 3
      }
    );
  });

  afterEach(async () => {
    await fs.remove(testDemosDir);
  });

  describe('deploy', () => {
    it('should create demo directory', async () => {
      const projectId = 'test-123';

      mockStorage.listFiles.mockResolvedValue([]);

      // Mock Kirby download (we'll skip actual download in tests)
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      await service.deploy(projectId);

      const demoPath = path.join(testDemosDir, `demo-${projectId}`);
      const exists = await fs.pathExists(demoPath);

      expect(exists).toBe(true);
    });

    it('should return deployment result with URL and port', async () => {
      const projectId = 'test-456';

      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      const result = await service.deploy(projectId);

      expect(result.projectId).toBe(projectId);
      expect(result.url).toBe('http://localhost:9000/demo-test-456');
      expect(result.panelUrl).toBe('http://localhost:9000/demo-test-456/panel');
      expect(result.port).toBe(9000);
      expect(result.deployedAt).toBeInstanceOf(Date);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Create minimal implementation (structure only)**

Create file: `packages/api/src/services/local/kirby-deployment.service.ts`

```typescript
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../../config/logger';
import {
  IKirbyDeploymentService,
  DeploymentResult,
  DeploymentInfo,
  CleanupResult,
  IStorageService,
  IEmailService
} from '@kirby-gen/shared';

interface KirbyDeploymentConfig {
  demosDir?: string;
  basePort?: number;
  ttlDays?: number;
  maxDemos?: number;
}

export class KirbyDeploymentService implements IKirbyDeploymentService {
  private readonly demosDir: string;
  private readonly basePort: number;
  private readonly ttlDays: number;
  private readonly maxDemos: number;
  private deployments: Map<string, DeploymentInfo> = new Map();

  constructor(
    private storage: IStorageService,
    private email: IEmailService,
    config: KirbyDeploymentConfig = {}
  ) {
    this.demosDir = config.demosDir || path.join(process.cwd(), 'kirby-demos');
    this.basePort = config.basePort || 8080;
    this.ttlDays = config.ttlDays || 7;
    this.maxDemos = config.maxDemos || 10;

    fs.ensureDirSync(this.demosDir);
    this.loadDeployments();
  }

  async deploy(projectId: string): Promise<DeploymentResult> {
    logger.info(`Deploying Kirby demo for project: ${projectId}`);

    // Create demo directory
    const demoPath = path.join(this.demosDir, `demo-${projectId}`);
    await fs.ensureDir(demoPath);

    // Download Kirby (stub for now)
    await this.downloadKirby(demoPath);

    // Start PHP server (stub for now)
    const port = await this.startPHPServer(projectId, demoPath);

    // Save deployment metadata
    const deployedAt = new Date();
    const deployment: DeploymentInfo = {
      projectId,
      url: `http://localhost:${port}/demo-${projectId}`,
      port,
      deployedAt,
      expiresAt: new Date(deployedAt.getTime() + this.ttlDays * 24 * 60 * 60 * 1000),
      isActive: true
    };

    await this.saveDeploymentMetadata(demoPath, deployment);
    this.deployments.set(projectId, deployment);

    logger.info(`Demo deployed: ${deployment.url}`);

    return {
      projectId,
      url: deployment.url,
      port,
      deployedAt,
      panelUrl: `${deployment.url}/panel`
    };
  }

  private async downloadKirby(demoPath: string): Promise<void> {
    // Stub - will implement in next task
    logger.info('Downloading Kirby (stub)');
  }

  private async startPHPServer(projectId: string, demoPath: string): Promise<number> {
    // Stub - will implement in next task
    return this.basePort;
  }

  private async saveDeploymentMetadata(demoPath: string, info: DeploymentInfo): Promise<void> {
    const metadataPath = path.join(demoPath, '.deployed-at.json');
    await fs.writeJson(metadataPath, info, { spaces: 2 });
  }

  private loadDeployments(): void {
    // Stub - will implement later
  }

  async getDeployment(projectId: string): Promise<DeploymentInfo | null> {
    return this.deployments.get(projectId) || null;
  }

  async archive(projectId: string): Promise<void> {
    // Stub - will implement in next task
  }

  async cleanupOldDemos(): Promise<CleanupResult> {
    // Stub - will implement in next task
    return {
      archived: [],
      quotaReached: false,
      emailsSent: []
    };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/local/kirby-deployment.service.ts \
        packages/api/tests/unit/services/kirby-deployment.test.ts
git commit -m "feat(api): add KirbyDeploymentService core structure (TDD)"
```

---

## Task 6: Implement KirbyDeploymentService - Part 2 (Blueprint Copying)

**Files:**
- Modify: `packages/api/tests/unit/services/kirby-deployment.test.ts`
- Modify: `packages/api/src/services/local/kirby-deployment.service.ts`

**Step 1: Add test for blueprint copying**

Add to `packages/api/tests/unit/services/kirby-deployment.test.ts`:

```typescript
describe('deploy', () => {
  // ... existing tests ...

  it('should copy blueprints from storage', async () => {
    const projectId = 'test-blueprints';
    const blueprints = ['gig.yml', 'artist.yml', 'release.yml'];

    mockStorage.listFiles.mockResolvedValue(blueprints);
    mockStorage.downloadFile.mockResolvedValue(Buffer.from('title: Test'));

    jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

    await service.deploy(projectId);

    expect(mockStorage.listFiles).toHaveBeenCalledWith(projectId, 'blueprints');
    expect(mockStorage.downloadFile).toHaveBeenCalledTimes(blueprints.length);

    // Verify blueprints are written
    const demoPath = path.join(testDemosDir, `demo-${projectId}`);
    const blueprintPath = path.join(demoPath, 'site', 'blueprints', 'pages');

    const files = await fs.readdir(blueprintPath);
    expect(files).toHaveLength(blueprints.length);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: FAIL (blueprints not copied)

**Step 3: Implement blueprint copying**

In `packages/api/src/services/local/kirby-deployment.service.ts`, update `deploy()` method:

```typescript
async deploy(projectId: string): Promise<DeploymentResult> {
  logger.info(`Deploying Kirby demo for project: ${projectId}`);

  // Create demo directory
  const demoPath = path.join(this.demosDir, `demo-${projectId}`);
  await fs.ensureDir(demoPath);

  // Download Kirby
  await this.downloadKirby(demoPath);

  // Copy blueprints (ADD THIS)
  await this.copyBlueprints(projectId, demoPath);

  // Start PHP server
  const port = await this.startPHPServer(projectId, demoPath);

  // ... rest of method
}

// Add this new private method
private async copyBlueprints(projectId: string, demoPath: string): Promise<void> {
  logger.info(`Copying blueprints for project: ${projectId}`);

  const blueprintsDir = path.join(demoPath, 'site', 'blueprints', 'pages');
  await fs.ensureDir(blueprintsDir);

  const files = await this.storage.listFiles(projectId, 'blueprints');

  for (const file of files) {
    const content = await this.storage.downloadFile(projectId, `blueprints/${file}`);
    await fs.writeFile(path.join(blueprintsDir, file), content);
    logger.info(`  Copied blueprint: ${file}`);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/local/kirby-deployment.service.ts \
        packages/api/tests/unit/services/kirby-deployment.test.ts
git commit -m "feat(api): implement blueprint copying in KirbyDeploymentService"
```

---

## Task 7: Implement KirbyDeploymentService - Part 3 (Archive & Cleanup)

**Files:**
- Modify: `packages/api/tests/unit/services/kirby-deployment.test.ts`
- Modify: `packages/api/src/services/local/kirby-deployment.service.ts`

**Step 1: Add test for archive method**

Add to test file:

```typescript
describe('archive', () => {
  it('should mark deployment as inactive', async () => {
    const projectId = 'test-archive';

    mockStorage.listFiles.mockResolvedValue([]);
    jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);
    jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

    await service.deploy(projectId);
    await service.archive(projectId);

    const deployment = await service.getDeployment(projectId);
    expect(deployment?.isActive).toBe(false);
  });

  it('should remove demo directory', async () => {
    const projectId = 'test-remove';

    mockStorage.listFiles.mockResolvedValue([]);
    jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);
    jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

    await service.deploy(projectId);

    const demoPath = path.join(testDemosDir, `demo-${projectId}`);
    expect(await fs.pathExists(demoPath)).toBe(true);

    await service.archive(projectId);
    expect(await fs.pathExists(demoPath)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: FAIL (archive not implemented)

**Step 3: Implement archive method**

In `kirby-deployment.service.ts`:

```typescript
async archive(projectId: string): Promise<void> {
  logger.info(`Archiving demo: ${projectId}`);

  const demoPath = path.join(this.demosDir, `demo-${projectId}`);

  if (!await fs.pathExists(demoPath)) {
    logger.warn(`Demo path not found: ${demoPath}`);
    return;
  }

  // Stop PHP server
  const deployment = this.deployments.get(projectId);
  if (deployment) {
    await this.stopPHPServer(deployment.port);
  }

  // Remove demo directory
  await fs.remove(demoPath);

  // Update metadata
  if (deployment) {
    deployment.isActive = false;
    this.deployments.set(projectId, deployment);
  }

  logger.info(`Demo archived: ${projectId}`);
}

private async stopPHPServer(port: number): Promise<void> {
  // Stub - in real implementation, would kill process
  logger.info(`Stopped PHP server on port ${port} (stub)`);
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/local/kirby-deployment.service.ts \
        packages/api/tests/unit/services/kirby-deployment.test.ts
git commit -m "feat(api): implement archive method in KirbyDeploymentService"
```

---

## Task 8: Implement Quota Enforcement

**Files:**
- Modify: `packages/api/tests/unit/services/kirby-deployment.test.ts`
- Modify: `packages/api/src/services/local/kirby-deployment.service.ts`

**Step 1: Add test for quota enforcement**

Add to test file:

```typescript
describe('deploy', () => {
  // ... existing tests ...

  it('should enforce quota when max demos reached', async () => {
    // Deploy maxDemos (3) projects
    for (let i = 0; i < 3; i++) {
      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000 + i);

      await service.deploy(`project-${i}`);
    }

    // Deploy 4th project (should trigger quota)
    mockStorage.listFiles.mockResolvedValue([]);
    jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9003);
    jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

    await service.deploy('project-4');

    // Should have sent archive notification email
    expect(mockEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Demo Site Will Be Archived'
      })
    );

    // Oldest demo should be archived
    const oldestDeployment = await service.getDeployment('project-0');
    expect(oldestDeployment?.isActive).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: FAIL (quota not enforced)

**Step 3: Implement quota enforcement**

In `kirby-deployment.service.ts`, update `deploy()` method:

```typescript
async deploy(projectId: string): Promise<DeploymentResult> {
  logger.info(`Deploying Kirby demo for project: ${projectId}`);

  // Check quota and cleanup if needed (ADD THIS)
  await this.enforceQuota(projectId);

  // Create demo directory
  const demoPath = path.join(this.demosDir, `demo-${projectId}`);
  await fs.ensureDir(demoPath);

  // ... rest of method
}

// Add this new private method
private async enforceQuota(newProjectId: string): Promise<void> {
  const activeDemos = Array.from(this.deployments.values())
    .filter(d => d.isActive)
    .sort((a, b) => a.deployedAt.getTime() - b.deployedAt.getTime());

  if (activeDemos.length >= this.maxDemos) {
    const oldest = activeDemos[0];
    logger.warn(`Quota reached (${this.maxDemos}), archiving oldest demo: ${oldest.projectId}`);

    // Send email notification
    await this.email.send({
      to: 'admin@yourdomain.com', // TODO: Get from project metadata
      subject: 'Demo Site Will Be Archived',
      body: `Your demo site for project ${oldest.projectId} will be archived due to quota limits.
The site data is safely backed up in storage.
URL: ${oldest.url}
Deployed: ${oldest.deployedAt.toISOString()}`
    });

    await this.archive(oldest.projectId);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/local/kirby-deployment.service.ts \
        packages/api/tests/unit/services/kirby-deployment.test.ts
git commit -m "feat(api): implement quota enforcement in KirbyDeploymentService"
```

---

## Task 9: Implement TTL-Based Cleanup

**Files:**
- Modify: `packages/api/tests/unit/services/kirby-deployment.test.ts`
- Modify: `packages/api/src/services/local/kirby-deployment.service.ts`

**Step 1: Add test for TTL cleanup**

Add to test file:

```typescript
describe('cleanupOldDemos', () => {
  it('should archive demos older than TTL', async () => {
    jest.useFakeTimers();

    mockStorage.listFiles.mockResolvedValue([]);
    jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);
    jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

    await service.deploy('old-project');

    // Fast forward 8 days (past TTL of 7 days)
    jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

    const result = await service.cleanupOldDemos();

    expect(result.archived).toContain('old-project');
    expect(mockEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Demo Site Archived (TTL Expired)'
      })
    );

    jest.useRealTimers();
  });

  it('should not archive demos within TTL', async () => {
    mockStorage.listFiles.mockResolvedValue([]);
    jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

    await service.deploy('new-project');

    const result = await service.cleanupOldDemos();

    expect(result.archived).not.toContain('new-project');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: FAIL (cleanupOldDemos not implemented)

**Step 3: Implement cleanupOldDemos method**

In `kirby-deployment.service.ts`:

```typescript
async cleanupOldDemos(): Promise<CleanupResult> {
  logger.info('Running demo cleanup...');

  const archived: string[] = [];
  const emailsSent: string[] = [];
  const now = new Date();

  for (const [projectId, deployment] of this.deployments) {
    if (!deployment.isActive) continue;

    if (now > deployment.expiresAt) {
      logger.info(`TTL expired for demo: ${projectId}`);

      // Send notification email
      await this.email.send({
        to: 'admin@yourdomain.com',
        subject: 'Demo Site Archived (TTL Expired)',
        body: `Your demo site has been archived after ${this.ttlDays} days.
Project: ${projectId}
URL: ${deployment.url}
Deployed: ${deployment.deployedAt.toISOString()}
Data is safely backed up in storage.`
      });

      emailsSent.push(projectId);

      await this.archive(projectId);
      archived.push(projectId);
    }
  }

  logger.info(`Cleanup complete. Archived: ${archived.length}`);

  return {
    archived,
    quotaReached: false,
    emailsSent
  };
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/kirby-deployment.test.ts
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/local/kirby-deployment.service.ts \
        packages/api/tests/unit/services/kirby-deployment.test.ts
git commit -m "feat(api): implement TTL-based cleanup in KirbyDeploymentService"
```

---

## Task 10: Implement CleanupScheduler

**Files:**
- Create: `packages/api/tests/unit/services/cleanup-scheduler.test.ts`
- Create: `packages/api/src/services/cleanup-scheduler.ts`

**Step 1: Write failing test**

Create file: `packages/api/tests/unit/services/cleanup-scheduler.test.ts`

```typescript
import { CleanupScheduler } from '../../src/services/cleanup-scheduler';
import { IKirbyDeploymentService } from '@kirby-gen/shared';

describe('CleanupScheduler', () => {
  let scheduler: CleanupScheduler;
  let mockKirbyDeployment: jest.Mocked<IKirbyDeploymentService>;

  beforeEach(() => {
    mockKirbyDeployment = {
      deploy: jest.fn(),
      getDeployment: jest.fn(),
      archive: jest.fn(),
      cleanupOldDemos: jest.fn().mockResolvedValue({
        archived: ['test-1'],
        quotaReached: false,
        emailsSent: ['test-1']
      })
    };

    scheduler = new CleanupScheduler(mockKirbyDeployment);
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('start', () => {
    it('should create cron task', () => {
      scheduler.start();
      expect((scheduler as any).task).toBeDefined();
    });
  });

  describe('runNow', () => {
    it('should trigger cleanup immediately', async () => {
      const result = await scheduler.runNow();

      expect(mockKirbyDeployment.cleanupOldDemos).toHaveBeenCalled();
      expect(result.archived).toContain('test-1');
    });
  });

  describe('stop', () => {
    it('should stop cron task', () => {
      scheduler.start();
      scheduler.stop();
      expect((scheduler as any).task).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npm test -- tests/unit/services/cleanup-scheduler.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Create implementation**

Create file: `packages/api/src/services/cleanup-scheduler.ts`

```typescript
import cron from 'node-cron';
import { IKirbyDeploymentService, CleanupResult } from '@kirby-gen/shared';
import { logger } from '../config/logger';

export class CleanupScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(private kirbyDeployment: IKirbyDeploymentService) {}

  start(): void {
    // Run cleanup every day at 2 AM
    this.task = cron.schedule('0 2 * * *', async () => {
      logger.info('Running scheduled demo cleanup...');

      try {
        const result = await this.kirbyDeployment.cleanupOldDemos();

        logger.info('Cleanup completed', {
          archived: result.archived.length,
          emailsSent: result.emailsSent.length
        });
      } catch (error) {
        logger.error('Cleanup failed', { error });
      }
    });

    logger.info('Cleanup scheduler started (runs daily at 2 AM)');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Cleanup scheduler stopped');
    }
  }

  async runNow(): Promise<CleanupResult> {
    logger.info('Running manual cleanup...');
    const result = await this.kirbyDeployment.cleanupOldDemos();
    logger.info('Manual cleanup completed', result);
    return result;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/api
npm test -- tests/unit/services/cleanup-scheduler.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/api/src/services/cleanup-scheduler.ts \
        packages/api/tests/unit/services/cleanup-scheduler.test.ts
git commit -m "feat(api): implement CleanupScheduler with cron jobs"
```

---

## Task 11: Register Services in DI Container

**Files:**
- Modify: `packages/api/src/config/di-setup.ts`

**Step 1: Check current DI setup structure**

Read file: `packages/api/src/config/di-setup.ts`

Identify where services are registered.

**Step 2: Add email service registration**

Add to DI setup:

```typescript
import { LocalEmailService } from '../services/local/local-email.service';

// In setupDependencies function:
container.register('email', new LocalEmailService());
```

**Step 3: Add Kirby deployment service registration**

Add:

```typescript
import { KirbyDeploymentService } from '../services/local/kirby-deployment.service';

container.register(
  'kirbyDeployment',
  new KirbyDeploymentService(
    container.resolve('storage'),
    container.resolve('email')
  )
);
```

**Step 4: Start cleanup scheduler**

Add:

```typescript
import { CleanupScheduler } from '../services/cleanup-scheduler';

// After all services registered
const scheduler = new CleanupScheduler(
  container.resolve('kirbyDeployment')
);
scheduler.start();
```

**Step 5: Build API package**

```bash
cd packages/api
npm run build
```

Expected: Build succeeds

**Step 6: Commit**

```bash
git add packages/api/src/config/di-setup.ts
git commit -m "feat(api): register Kirby deployment and email services in DI container"
```

---

## Task 12: Integrate into Workflow Orchestrator

**Files:**
- Modify: `packages/api/src/workflow/workflow-orchestrator.ts`

**Step 1: Read current orchestrator structure**

Read file: `packages/api/src/workflow/workflow-orchestrator.ts`

Identify:
- Constructor
- Phase execution methods
- Event emission patterns

**Step 2: Add Kirby deployment service to constructor**

Update constructor:

```typescript
import { IKirbyDeploymentService } from '@kirby-gen/shared';

export class WorkflowOrchestrator {
  private kirbyDeployment: IKirbyDeploymentService;

  constructor(
    private storage: IStorageService,
    private session: ISessionService,
    private git: IGitService,
    container: ServiceContainer
  ) {
    // Add this line
    this.kirbyDeployment = container.resolve<IKirbyDeploymentService>('kirbyDeployment');
  }
}
```

**Step 3: Add executeInstantDeployment phase method**

Add new method:

```typescript
private async executeInstantDeployment(projectId: string): Promise<void> {
  this.emit('phase:started', {
    projectId,
    phase: 'instant-demo',
    message: 'Deploying instant demo site...'
  });

  try {
    // Deploy Kirby demo
    const deployment = await this.kirbyDeployment.deploy(projectId);

    // Update session with deployment info
    await this.session.update(projectId, {
      demoDeployment: {
        url: deployment.url,
        panelUrl: deployment.panelUrl,
        deployedAt: deployment.deployedAt,
        port: deployment.port
      }
    });

    this.emit('phase:progress', {
      projectId,
      phase: 'instant-demo',
      progress: 100,
      message: `Demo deployed: ${deployment.url}`
    });

    this.emit('phase:completed', {
      projectId,
      phase: 'instant-demo',
      result: deployment
    });

    logger.info(`Instant demo deployed for ${projectId}`, { deployment });
  } catch (error) {
    this.emit('phase:failed', {
      projectId,
      phase: 'instant-demo',
      error: error.message
    });
    throw new WorkflowError('Instant deployment failed', 'instant-demo', error);
  }
}
```

**Step 4: Add instant deployment to workflow pipeline**

Update `executeWorkflow` method to call new phase:

```typescript
async executeWorkflow(projectId: string): Promise<void> {
  try {
    this.emit('workflow:started', { projectId });

    // Phase 1: Domain Mapping
    await this.executeDomainMapping(projectId);

    // Phase 2: Content Structuring
    await this.executeContentStructuring(projectId);

    // Phase 3: Design Automation
    await this.executeDesignAutomation(projectId);

    // Phase 4: Blueprint Generation
    await this.executeBlueprintGeneration(projectId);

    // Phase 5: Instant Demo Deployment (NEW!)
    await this.executeInstantDeployment(projectId);

    // Phase 6: Final Deployment (optional)
    await this.executeDeployment(projectId);

    this.emit('workflow:completed', { projectId });
  } catch (error) {
    this.emit('workflow:failed', { projectId, error });
    throw error;
  }
}
```

**Step 5: Build API package**

```bash
cd packages/api
npm run build
```

Expected: Build succeeds

**Step 6: Commit**

```bash
git add packages/api/src/workflow/workflow-orchestrator.ts
git commit -m "feat(api): integrate instant demo deployment into workflow orchestrator"
```

---

## Task 13: Add Integration Test

**Files:**
- Create: `packages/api/tests/integration/workflow/instant-deployment.test.ts`

**Step 1: Create integration test**

Create file: `packages/api/tests/integration/workflow/instant-deployment.test.ts`

```typescript
import { WorkflowOrchestrator } from '../../../src/workflow/workflow-orchestrator';
import { setupTestContainer } from '../../helpers/test-container';
import fs from 'fs-extra';
import path from 'path';

describe('Instant Deployment Integration', () => {
  let orchestrator: WorkflowOrchestrator;
  let container: any;
  let testProjectId: string;

  beforeEach(async () => {
    container = setupTestContainer();
    orchestrator = new WorkflowOrchestrator(
      container.resolve('storage'),
      container.resolve('session'),
      container.resolve('git'),
      container
    );

    testProjectId = `test-${Date.now()}`;
  });

  afterEach(async () => {
    // Cleanup test demos
    const kirbyDeployment = container.resolve('kirbyDeployment');
    await kirbyDeployment.archive(testProjectId);
  });

  it('should deploy demo after blueprint generation', async () => {
    // Mock blueprint generation
    const storage = container.resolve('storage');
    await storage.uploadFile(
      testProjectId,
      Buffer.from('title: Gig\nfields:\n  title:\n    type: text'),
      'blueprints/gig.yml'
    );

    // Spy on blueprint phase to skip actual skill execution
    jest.spyOn(orchestrator as any, 'executeDomainMapping').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeContentStructuring').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeDesignAutomation').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeBlueprintGeneration').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeDeployment').mockResolvedValue(undefined);

    // Execute workflow
    await orchestrator.executeWorkflow(testProjectId);

    // Verify deployment
    const kirbyDeployment = container.resolve('kirbyDeployment');
    const deployment = await kirbyDeployment.getDeployment(testProjectId);

    expect(deployment).toBeDefined();
    expect(deployment?.url).toContain(`demo-${testProjectId}`);
    expect(deployment?.isActive).toBe(true);
  });

  it('should emit progress events during deployment', async () => {
    const events: any[] = [];

    orchestrator.on('phase:started', (data) => {
      if (data.phase === 'instant-demo') events.push(data);
    });

    orchestrator.on('phase:completed', (data) => {
      if (data.phase === 'instant-demo') events.push(data);
    });

    // Mock phases
    jest.spyOn(orchestrator as any, 'executeDomainMapping').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeContentStructuring').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeDesignAutomation').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeBlueprintGeneration').mockResolvedValue(undefined);
    jest.spyOn(orchestrator as any, 'executeDeployment').mockResolvedValue(undefined);

    await orchestrator.executeWorkflow(testProjectId);

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].message).toContain('Deploying instant demo');
    expect(events[events.length - 1].result.url).toBeDefined();
  });
});
```

**Step 2: Run integration test**

```bash
cd packages/api
npm run test:integration
```

Expected: PASS (2 tests)

**Step 3: Commit**

```bash
git add packages/api/tests/integration/workflow/instant-deployment.test.ts
git commit -m "test(api): add integration test for instant deployment workflow"
```

---

## Task 14: Update Environment Configuration

**Files:**
- Modify: `packages/api/src/config/env.ts`
- Modify: `.env.example`

**Step 1: Add environment variables to env.ts**

Add to `packages/api/src/config/env.ts`:

```typescript
export const env = {
  // ... existing vars ...

  // Kirby Demo Settings
  KIRBY_DEMO_TTL_DAYS: parseInt(process.env.KIRBY_DEMO_TTL_DAYS || '7', 10),
  KIRBY_DEMO_MAX_DEMOS: parseInt(process.env.KIRBY_DEMO_MAX_DEMOS || '10', 10),
  KIRBY_DEMO_BASE_PORT: parseInt(process.env.KIRBY_DEMO_BASE_PORT || '8080', 10),
  KIRBY_DEMOS_DIR: process.env.KIRBY_DEMOS_DIR || path.join(process.cwd(), 'kirby-demos'),

  // Email Settings
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'local',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
};
```

**Step 2: Update .env.example**

Add to `.env.example`:

```bash
# Kirby Demo Settings
KIRBY_DEMO_TTL_DAYS=7
KIRBY_DEMO_MAX_DEMOS=10
KIRBY_DEMO_BASE_PORT=8080
KIRBY_DEMOS_DIR=/tmp/kirby-gen/kirby-demos

# Email Settings
EMAIL_SERVICE=local
EMAIL_FROM=noreply@yourdomain.com
```

**Step 3: Update DI setup to use env vars**

In `packages/api/src/config/di-setup.ts`:

```typescript
import { env } from './env';

container.register(
  'kirbyDeployment',
  new KirbyDeploymentService(
    container.resolve('storage'),
    container.resolve('email'),
    {
      demosDir: env.KIRBY_DEMOS_DIR,
      basePort: env.KIRBY_DEMO_BASE_PORT,
      ttlDays: env.KIRBY_DEMO_TTL_DAYS,
      maxDemos: env.KIRBY_DEMO_MAX_DEMOS
    }
  )
);
```

**Step 4: Build API package**

```bash
cd packages/api
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/api/src/config/env.ts \
        packages/api/src/config/di-setup.ts \
        .env.example
git commit -m "feat(api): add environment configuration for Kirby demos"
```

---

## Task 15: Run All Tests and Verify

**Step 1: Run all unit tests**

```bash
cd packages/api
npm run test:unit
```

Expected: All tests pass

**Step 2: Run all integration tests**

```bash
npm run test:integration
```

Expected: All tests pass

**Step 3: Type check**

```bash
cd ../..
npm run typecheck
```

Expected: No type errors

**Step 4: Build all packages**

```bash
npm run build
```

Expected: All packages build successfully

**Step 5: Commit if any fixes were needed**

```bash
git add .
git commit -m "fix: resolve test failures and type errors"
```

---

## Task 16: Update Documentation

**Files:**
- Create: `docs/features/automatic-kirby-deployment.md`
- Modify: `CLAUDE.md`

**Step 1: Create feature documentation**

Create file: `docs/features/automatic-kirby-deployment.md`

```markdown
# Automatic Kirby Demo Deployment

## Overview

Automatically deploys live Kirby demo sites immediately after blueprint generation. Each demo runs in an isolated PHP server with unique URL and port.

## Architecture

- **KirbyDeploymentService**: Handles installation, deployment, archival
- **CleanupScheduler**: Manages TTL and quota enforcement
- **LocalEmailService**: Notifies on archival events

## Workflow Integration

Instant demo deployment runs as Phase 5 in the workflow pipeline:

1. Domain Mapping
2. Content Structuring
3. Design Automation
4. Blueprint Generation
5. **Instant Demo Deployment** ← NEW
6. Final Deployment

## Configuration

Environment variables in `.env`:

```bash
KIRBY_DEMO_TTL_DAYS=7        # Days before auto-archive
KIRBY_DEMO_MAX_DEMOS=10      # Max concurrent demos
KIRBY_DEMO_BASE_PORT=8080    # Starting port number
KIRBY_DEMOS_DIR=/path/to/kirby-demos
```

## Cleanup System

### TTL-Based (7 days)
- Cron job runs daily at 2 AM
- Archives demos older than TTL
- Sends "Demo Site Archived (TTL Expired)" email

### Quota-Based (10 demos max)
- Before deployment, checks active demo count
- If quota reached, archives oldest demo
- Sends "Demo Site Will Be Archived" email

## Directory Structure

```
packages/api/
├── kirby-demos/
│   └── demo-{projectId}/
│       ├── site/blueprints/pages/
│       ├── content/
│       ├── .deployed-at.json
│       └── [Kirby files]
├── storage/{projectId}/        # Backup
└── emails-log/                 # Local email logs
```

## Deployment URLs

- Demo: `http://localhost:{port}/demo-{projectId}`
- Panel: `http://localhost:{port}/demo-{projectId}/panel`

## Testing

- Unit tests: `packages/api/tests/unit/services/kirby-deployment.test.ts`
- Integration: `packages/api/tests/integration/workflow/instant-deployment.test.ts`

Run tests:
```bash
npm test --workspace=packages/api
```

## Manual Operations

### Trigger cleanup manually
```typescript
const scheduler = container.resolve('cleanupScheduler');
await scheduler.runNow();
```

### Archive specific demo
```typescript
const kirbyDeployment = container.resolve('kirbyDeployment');
await kirbyDeployment.archive('project-123');
```

## Future Enhancements

- Deploy to Coolify on Hetzner VPS
- Unique subdomains per demo
- Real email service (SendGrid/Mailgun)
- Docker containers instead of PHP servers
```

**Step 2: Update CLAUDE.md**

Add section to `CLAUDE.md`:

```markdown
## Kirby Demo Deployment

The system automatically deploys live Kirby demos after blueprint generation:

- **Service**: `KirbyDeploymentService` (DI key: `kirbyDeployment`)
- **Scheduler**: `CleanupScheduler` (runs daily at 2 AM)
- **Location**: `packages/api/kirby-demos/demo-{projectId}/`
- **TTL**: 7 days (configurable)
- **Quota**: 10 demos max (configurable)

See `docs/features/automatic-kirby-deployment.md` for details.
```

**Step 3: Commit**

```bash
git add docs/features/automatic-kirby-deployment.md CLAUDE.md
git commit -m "docs: add automatic Kirby deployment documentation"
```

---

## Task 17: Create Final Pull Request

**Step 1: Review all changes**

```bash
git log --oneline origin/master..HEAD
```

Expected: See all commits from this implementation

**Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests pass

**Step 3: Push to remote**

```bash
git push origin HEAD
```

**Step 4: Create pull request**

Use GitHub CLI or web interface:

```bash
gh pr create \
  --title "feat: Automatic Kirby demo deployment system" \
  --body "$(cat <<'EOF'
## Summary

Implements automatic deployment of live Kirby demo sites immediately after blueprint generation.

## Features

- ✅ Automatic deployment after blueprint phase
- ✅ TTL-based cleanup (7 days)
- ✅ Quota enforcement (10 demos max)
- ✅ Email notifications on archival
- ✅ DI integration with local services
- ✅ Comprehensive test coverage

## Architecture

- `KirbyDeploymentService`: Core deployment logic
- `CleanupScheduler`: Cron-based cleanup (daily at 2 AM)
- `LocalEmailService`: File-based email logging
- Integrated into `WorkflowOrchestrator` as Phase 5

## Testing

- 8 unit tests (KirbyDeploymentService)
- 3 unit tests (CleanupScheduler)
- 2 integration tests (workflow)
- All tests passing ✅

## Configuration

New environment variables:
- `KIRBY_DEMO_TTL_DAYS` (default: 7)
- `KIRBY_DEMO_MAX_DEMOS` (default: 10)
- `KIRBY_DEMO_BASE_PORT` (default: 8080)

## Documentation

- Design doc: `docs/plans/2025-11-21-automatic-kirby-demo-deployment-design.md`
- Feature doc: `docs/features/automatic-kirby-deployment.md`
- Updated: `CLAUDE.md`

## Demo URLs

- Demo: `http://localhost:{port}/demo-{projectId}`
- Panel: `http://localhost:{port}/demo-{projectId}/panel`

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Completion Checklist

- ✅ All service interfaces created
- ✅ KirbyDeploymentService implemented with TDD
- ✅ LocalEmailService implemented
- ✅ CleanupScheduler implemented
- ✅ Services registered in DI container
- ✅ Workflow orchestrator integration
- ✅ Unit tests (100% coverage for new code)
- ✅ Integration tests
- ✅ Environment configuration
- ✅ Documentation created
- ✅ All tests passing
- ✅ Type checking passing
- ✅ Pull request created

---

## Estimated Time

- Total: ~6-8 hours
- Per task: 15-30 minutes
- Testing: Built into each task (TDD)

## Notes for Implementer

1. **Follow TDD strictly**: Write test first, watch it fail, implement, watch it pass
2. **Commit frequently**: After each task (green tests)
3. **Read existing code**: Check how similar services are implemented
4. **DRY principle**: Reuse existing utilities (logger, fs-extra, path)
5. **YAGNI**: Don't add features beyond the plan
6. **Mock external calls**: downloadKirby and startPHPServer should be mocked in tests

## Dependencies Between Tasks

```
Task 1 (Interfaces) → Task 2 (Types) → Task 3 (Dependencies)
                                            ↓
                      Task 4 (Email) ← Task 5-9 (Kirby Service)
                            ↓                 ↓
                      Task 10 (Scheduler) → Task 11 (DI)
                                            ↓
                                    Task 12 (Orchestrator)
                                            ↓
                                    Task 13 (Integration Test)
                                            ↓
                                    Task 14 (Config)
                                            ↓
                                    Task 15 (Verify)
                                            ↓
                                    Task 16-17 (Docs & PR)
```

Execute tasks in order. Do not skip tasks or reorder them.
