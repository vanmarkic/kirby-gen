# Automatic Kirby Demo Deployment System - Design Document

**Date**: 2025-11-21
**Status**: Approved
**Author**: Claude (via brainstorming skill)

## Overview

Instant deployment system that automatically creates live Kirby demo sites for potential customers immediately after blueprint generation. Each demo runs in an isolated PHP server with unique subfolder path and port.

## System Architecture

```
User → Workflow → Blueprint Gen → Kirby Deployment → Live Demo
                                         ↓
                                   ┌────────────┐
                                   │  Cleanup   │
                                   │  - TTL     │
                                   │  - Quota   │
                                   │  - Backup  │
                                   └────────────┘
```

## Key Components

### 1. KirbyDeploymentService (`IKirbyDeploymentService`)

**Location**: `packages/api/src/services/local/kirby-deployment.service.ts`

**Responsibilities**:
- Download & install Kirby Plainkit per project
- Copy blueprints from storage to demo instance
- Configure Kirby with subfolder base URL
- Start PHP dev server on available port
- Track deployment metadata (timestamps, URLs, ports)
- Archive old demos (stop server, delete files)

**Key Methods**:
```typescript
deploy(projectId: string): Promise<DeploymentResult>
archive(projectId: string): Promise<void>
cleanupOldDemos(): Promise<CleanupResult>
getDeployment(projectId: string): Promise<DeploymentInfo | null>
```

## Directory Structure

```
packages/api/
├── kirby-demos/
│   ├── demo-{projectId}/              # Active demo sites
│   │   ├── site/
│   │   │   ├── blueprints/pages/      # Copied from storage
│   │   │   ├── config/config.php      # Base URL: /demo-{projectId}
│   │   │   └── templates/
│   │   ├── content/
│   │   ├── assets/
│   │   ├── kirby/                     # Kirby core
│   │   └── .deployed-at.json          # Metadata (timestamp, URL, port)
│   └── ...
├── storage/{projectId}/               # Permanent backup
│   ├── blueprints/*.yml
│   ├── content.json
│   └── design-system.json
└── emails-log/                        # Local email logs
    └── {timestamp}-email.txt
```

## Workflow Integration

**New Phase**: "Instant Demo Deployment" runs after blueprint generation

**Updated Pipeline**:
1. Domain Mapping
2. Content Structuring
3. Design Automation
4. **Blueprint Generation**
5. **→ Instant Demo Deployment** ← NEW!
6. Final Deployment (optional)

**Orchestrator Changes** (`packages/api/src/workflow/workflow-orchestrator.ts`):
- Add `executeInstantDeployment()` phase
- Emit progress events: `phase:started`, `phase:completed`
- Store deployment info in session

## Cleanup & Quota System

### TTL-Based Cleanup (7 days)

- Cron job runs daily at 2 AM
- Checks `.deployed-at.json` timestamp
- Archives demos older than 7 days
- Sends "Demo Site Archived (TTL Expired)" email
- Data safely backed up in `storage/{projectId}/`

### Quota Enforcement (10 demos max)

- Before new deployment, count active demos
- If quota reached (≥10 demos):
  - Send "Demo Site Will Be Archived" email
  - Archive oldest demo (by timestamp)
  - Proceed with new deployment

**Cleanup Scheduler** (`packages/api/src/services/cleanup-scheduler.ts`):
```typescript
start()              // Start cron job (daily at 2 AM)
stop()               // Stop scheduler
runNow()             // Manual trigger for testing
```

## Email Service

**Interface**: `IEmailService`

**Local Implementation** (`LocalEmailService`):
- Logs emails to `emails-log/` directory
- File format: `{timestamp}-email.txt`
- Contains: To, Subject, Date, Body

**Email Types**:
1. **Quota Warning**: "Demo Site Will Be Archived"
   - Sent when quota reached before archiving oldest demo
2. **TTL Expiration**: "Demo Site Archived (TTL Expired)"
   - Sent when demo reaches 7-day TTL

**Future**: Replace with SendGrid/Mailgun for production

## Deployment URLs

**Pattern**: `http://localhost:{port}/demo-{projectId}`

**Examples**:
- Demo: `http://localhost:8080/demo-abc123`
- Panel: `http://localhost:8080/demo-abc123/panel`

**Port Assignment**:
- Start at 8080
- Auto-increment for each new demo
- Tracked in deployment metadata

## Data Flow

```
1. Blueprint Generation Completes
   ↓
2. Orchestrator Triggers: executeInstantDeployment(projectId)
   ↓
3. KirbyDeploymentService.deploy(projectId)
   ├→ Check quota (archive oldest if needed)
   ├→ Download Kirby Plainkit
   ├→ Copy blueprints from storage
   ├→ Configure Kirby (base URL, subfolder)
   ├→ Start PHP server on available port
   └→ Save metadata to .deployed-at.json
   ↓
4. Return DeploymentResult
   ├→ url: http://localhost:8080/demo-{projectId}
   ├→ panelUrl: http://localhost:8080/demo-{projectId}/panel
   ├→ port: 8080
   └→ deployedAt: Date
   ↓
5. Update Session with deployment info
   ↓
6. Emit progress events to WebSocket
   ↓
7. Frontend displays demo URL to user
```

## Session Schema Updates

**Add to `ProjectData` interface**:

```typescript
interface ProjectData {
  // ... existing fields ...

  demoDeployment?: {
    url: string;           // Demo site URL
    panelUrl: string;      // Kirby panel URL
    deployedAt: Date;      // Deployment timestamp
    port: number;          // PHP server port
    expiresAt?: Date;      // Optional TTL expiration
  };
}
```

## Dependency Injection

**New Services**:
- `email`: `IEmailService` → `LocalEmailService`
- `kirbyDeployment`: `IKirbyDeploymentService` → `KirbyDeploymentService`

**DI Setup** (`packages/api/src/config/di-setup.ts`):
```typescript
container.register('email', new LocalEmailService());
container.register('kirbyDeployment', new KirbyDeploymentService(
  container.resolve('storage'),
  container.resolve('email')
));

// Start cleanup scheduler
const scheduler = new CleanupScheduler(container.resolve('kirbyDeployment'));
scheduler.start();
```

## Testing Strategy

### Unit Tests (60%)
- `KirbyDeploymentService.deploy()` - deployment logic
- `KirbyDeploymentService.archive()` - cleanup
- `KirbyDeploymentService.cleanupOldDemos()` - TTL enforcement
- Quota enforcement logic
- Email notification triggers

### Integration Tests (30%)
- Workflow orchestrator with deployment phase
- Blueprint generation → instant deployment
- Progress event emission
- Session updates

### E2E Tests (10%)
- Full workflow: create project → upload → generate → deploy
- Verify demo site accessibility
- WebSocket progress events
- API status endpoint returns deployment info

## Configuration

**Environment Variables** (`.env`):
```bash
# Kirby Demo Settings
KIRBY_DEMO_TTL_DAYS=7        # Days before auto-archive
KIRBY_DEMO_MAX_DEMOS=10      # Max concurrent demos
KIRBY_DEMO_BASE_PORT=8080    # Starting port number
KIRBY_DEMOS_DIR=/path/to/kirby-demos

# Email Settings (future)
EMAIL_SERVICE=local          # or 'sendgrid', 'mailgun'
EMAIL_FROM=noreply@yourdomain.com
```

## Dependencies

**New npm packages**:
```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

## File Checklist

### New Files
- ✅ `packages/shared/src/interfaces/IKirbyDeploymentService.ts`
- ✅ `packages/shared/src/interfaces/IEmailService.ts`
- ✅ `packages/api/src/services/local/kirby-deployment.service.ts`
- ✅ `packages/api/src/services/local/local-email.service.ts`
- ✅ `packages/api/src/services/cleanup-scheduler.ts`
- ✅ `packages/api/tests/unit/services/kirby-deployment.test.ts`
- ✅ `packages/api/tests/integration/workflow/instant-deployment.test.ts`
- ✅ `packages/api/tests/e2e/full-workflow-with-demo.test.ts`

### Modified Files
- ✅ `packages/api/src/workflow/workflow-orchestrator.ts`
- ✅ `packages/shared/src/types/session.types.ts`
- ✅ `packages/api/src/config/di-setup.ts`
- ✅ `packages/api/package.json`

## Migration Path

### Phase 1: Local Development (Current Design)
- PHP dev server on localhost
- File-based email logging
- Manual demo cleanup

### Phase 2: Production (Future)
- Deploy to Coolify on Hetzner VPS
- Each demo as separate Docker container
- Unique subdomains: `demo-{projectId}.yourdomain.com`
- Real email service (SendGrid/Mailgun)
- Automated cleanup via cron jobs

## Security Considerations

1. **Isolated Demos**: Each demo in separate directory
2. **Port Management**: Track used ports to prevent conflicts
3. **Backup Before Delete**: Always verify backup exists before archiving
4. **Process Management**: Properly stop PHP servers to avoid zombies
5. **TTL Enforcement**: Prevent accumulation of abandoned demos
6. **Quota Limits**: Prevent resource exhaustion

## Benefits

✅ **Instant Feedback**: Customers see live demo immediately
✅ **No Manual Work**: Fully automated deployment
✅ **Resource Management**: TTL + quota prevent bloat
✅ **Data Safety**: Blueprints backed up before cleanup
✅ **Scalable**: Easy to add cloud deployment later
✅ **Testable**: Complete test coverage (unit, integration, E2E)

## Implementation Ready

This design is approved and ready for implementation. See the accompanying implementation plan for detailed step-by-step instructions.
