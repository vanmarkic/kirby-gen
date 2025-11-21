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
