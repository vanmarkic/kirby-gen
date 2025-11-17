# Infrastructure Plan - Render Deployment

This document outlines the infrastructure requirements and deployment plan for running Kirby-Gen on Render.

## Overview

Kirby-Gen is a full-stack application requiring:
- Web frontend (React/Vite)
- API backend (Express/TypeScript)
- Python skills service (FastAPI)
- PostgreSQL database (sessions, projects)
- Redis cache (sessions, rate limiting)
- Object storage (S3-compatible for files)
- Background workers (long-running generation tasks)

---

## Render Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          Internet                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │   Render CDN    │ (Automatic)
                └────────┬────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────────┐ ┌───▼──────────┐
│  Static Site   │ │  Web Service │ │ Web Service  │
│   (Frontend)   │ │  (API Backend)│ │(Skills API)  │
│   React/Vite   │ │Express/Socket │ │   FastAPI    │
│                │ │      .IO      │ │              │
└────────────────┘ └────┬─────────┘ └──────┬───────┘
                        │                   │
                        │                   │
        ┌───────────────┼───────────────────┼────────────┐
        │               │                   │            │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────────▼────┐ ┌────▼──────┐
│  PostgreSQL  │ │    Redis    │ │   Background │ │  External │
│   Database   │ │    Cache    │ │    Worker    │ │ S3 Storage│
│   (Managed)  │ │  (Managed)  │ │ (Generation) │ │ (DO/AWS)  │
└──────────────┘ └─────────────┘ └──────────────┘ └───────────┘
```

---

## Required Render Services

### 1. Static Site - Web Frontend
**Service Type**: Static Site
**Purpose**: Serve React/Vite frontend
**Build Command**: `cd packages/web && npm install && npm run build`
**Publish Directory**: `packages/web/dist`

**Configuration**:
- Auto-deploy from `main` branch
- Custom domain support
- Automatic HTTPS
- CDN distribution
- Environment variables:
  ```
  VITE_API_URL=https://api.your-domain.com
  VITE_WS_URL=wss://api.your-domain.com
  ```

**Resources**:
- Free tier suitable (static files)
- Bandwidth: ~1GB/month for 1000 visitors

**Cost**: **$0/month** (Free tier)

---

### 2. Web Service - API Backend
**Service Type**: Web Service
**Purpose**: Express API + Socket.IO server
**Build Command**: `cd packages/api && npm install && npm run build`
**Start Command**: `cd packages/api && npm start`
**Port**: 3000 (auto-detected)

**Configuration**:
- Runtime: Node 20
- Auto-deploy from `main` branch
- Health check path: `/api/health`
- Autoscaling: 1-3 instances

**Environment Variables**:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-populated by Render
REDIS_URL=${{Redis.REDIS_URL}}           # Auto-populated by Render

# Claude API
CLAUDE_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-opus-4-20250514

# Storage (DigitalOcean Spaces or AWS S3)
STORAGE_TYPE=s3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET=kirby-gen-storage
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Skills Service
SKILLS_BASE_URL=${{SkillsAPI.URL}}  # Internal Render URL

# Security
JWT_SECRET=your-secure-random-string-here
SESSION_SECRET=your-session-secret-here

# Deployment (Render-specific)
DEPLOY_TYPE=render
RENDER_API_KEY=your-render-api-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Resources**:
- **Starter**: $7/month (512 MB RAM, 0.5 CPU)
- **Standard**: $25/month (2 GB RAM, 1 CPU) ⭐ **Recommended**
- **Pro**: $85/month (4 GB RAM, 2 CPU)

**Cost**: **$25/month** (Standard instance)

---

### 3. Web Service - Python Skills API
**Service Type**: Web Service (Private)
**Purpose**: FastAPI service for Claude skills
**Build Command**: `cd packages/skills && pip install -r requirements.txt`
**Start Command**: `cd packages/skills && uvicorn src.main:app --host 0.0.0.0 --port $PORT`
**Port**: Auto-assigned

**Configuration**:
- Runtime: Python 3.11
- Auto-deploy from `main` branch
- Health check path: `/health`
- **Private service** (not exposed to internet)

**Environment Variables**:
```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Logging
LOG_LEVEL=info
```

**Resources**:
- **Starter**: $7/month (512 MB RAM, 0.5 CPU) ⭐ **Recommended**
- **Standard**: $25/month (2 GB RAM, 1 CPU)

**Cost**: **$7/month** (Starter instance, private service)

---

### 4. Background Worker - Generation Worker
**Service Type**: Background Worker
**Purpose**: Long-running portfolio generation tasks
**Build Command**: `cd packages/api && npm install && npm run build`
**Start Command**: `cd packages/api && npm run worker`

**Configuration**:
- Runtime: Node 20
- Auto-deploy from `main` branch
- Connects to same PostgreSQL + Redis as API

**Environment Variables**: Same as API Backend

**Resources**:
- **Starter**: $7/month (512 MB RAM, 0.5 CPU)
- **Standard**: $25/month (2 GB RAM, 1 CPU) ⭐ **Recommended**

**Cost**: **$25/month** (Standard instance for reliability)

**Note**: We need to implement a queue-based worker system (see Migration Plan below)

---

### 5. PostgreSQL Database
**Service Type**: PostgreSQL (Managed)
**Purpose**: Store projects, sessions, users

**Configuration**:
- Version: PostgreSQL 15
- Automatic backups (7-day retention)
- Point-in-time recovery
- Connection pooling enabled

**Resources**:
- **Starter**: $7/month (256 MB RAM, shared CPU, 1 GB storage)
- **Standard**: $15/month (1 GB RAM, 0.5 CPU, 10 GB storage) ⭐ **Recommended**
- **Pro**: $50/month (4 GB RAM, 1 CPU, 50 GB storage)

**Cost**: **$15/month** (Standard database)

---

### 6. Redis Cache
**Service Type**: Redis (Managed)
**Purpose**: Sessions, rate limiting, job queues

**Configuration**:
- Version: Redis 7
- Persistence enabled
- Automatic failover

**Resources**:
- **Starter**: $10/month (25 MB RAM)
- **Standard**: $15/month (100 MB RAM) ⭐ **Recommended**
- **Pro**: $50/month (1 GB RAM)

**Cost**: **$15/month** (Standard instance)

---

### 7. Object Storage (External)
**Service Type**: External (DigitalOcean Spaces or AWS S3)
**Purpose**: Store uploaded files, generated sites

#### Option A: DigitalOcean Spaces (Recommended)
- S3-compatible API
- Built-in CDN
- Simple pricing

**Resources**:
- 250 GB storage
- 1 TB outbound transfer
- Additional storage: $0.02/GB/month
- Additional transfer: $0.01/GB

**Cost**: **$5/month** (base plan)

#### Option B: AWS S3
- Pay-as-you-go
- More complex pricing
- Better for high scale

**Estimated Cost**: **~$5-10/month** (100 GB storage, 100 GB transfer)

---

## Total Monthly Cost

| Service | Plan | Cost |
|---------|------|------|
| Static Site (Frontend) | Free | **$0** |
| Web Service (API) | Standard | **$25** |
| Web Service (Skills) | Starter (Private) | **$7** |
| Background Worker | Standard | **$25** |
| PostgreSQL | Standard | **$15** |
| Redis | Standard | **$15** |
| Object Storage (DO Spaces) | Base | **$5** |
| **Total** | | **$92/month** |

### Cost Optimization Options

**Minimal Setup** (~$50/month):
- Frontend: Free
- API: Starter ($7) - Single instance
- Skills: Starter ($7)
- PostgreSQL: Starter ($7)
- Redis: Starter ($10)
- Storage: DO Spaces ($5)
- Skip Background Worker (use API for generation)
- **Total: $36/month** (not recommended for production)

**Production Setup** (~$92/month) ⭐ **Recommended**:
- As outlined above
- Reliable, scalable, suitable for production

**High-Traffic Setup** (~$200/month):
- API: Pro ($85) with autoscaling
- Skills: Standard ($25)
- Worker: Pro ($85)
- PostgreSQL: Pro ($50)
- Redis: Pro ($50)
- **Total: ~$300/month**

---

## Migration Requirements

To deploy on Render, we need to implement:

### 1. PostgreSQL Session Service ✅ Already Have Interface
**File**: `packages/api/src/services/cloud/postgres-session.service.ts` (NEW)

```typescript
import { ISessionService } from '@kirby-gen/shared';
import { Pool } from 'pg';

export class PostgresSessionService implements ISessionService {
  constructor(private pool: Pool) {}

  async create(projectId: string, data: ProjectData): Promise<string> {
    const sessionId = nanoid();
    await this.pool.query(
      'INSERT INTO sessions (id, project_id, data, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
      [sessionId, projectId, JSON.stringify(data)]
    );
    return sessionId;
  }

  async get(sessionId: string): Promise<ProjectData | null> {
    const result = await this.pool.query(
      'SELECT data FROM sessions WHERE id = $1',
      [sessionId]
    );
    return result.rows[0]?.data || null;
  }

  // ... implement other methods
}
```

**Effort**: 1-2 days

---

### 2. S3 Storage Service ✅ Already Have Interface
**File**: `packages/api/src/services/cloud/s3-storage.service.ts` (NEW)

```typescript
import { IStorageService } from '@kirby-gen/shared';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export class S3StorageService implements IStorageService {
  constructor(
    private s3Client: S3Client,
    private bucket: string
  ) {}

  async uploadFile(projectId: string, file: Buffer, filename: string): Promise<string> {
    const key = `${projectId}/${filename}`;
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
    }));
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  // ... implement other methods
}
```

**Dependencies**: `@aws-sdk/client-s3`
**Effort**: 1 day

---

### 3. Redis Session Service ✅ Already Have Interface
**File**: `packages/api/src/services/cloud/redis-session.service.ts` (NEW)

```typescript
import { ISessionService } from '@kirby-gen/shared';
import { createClient } from 'redis';

export class RedisSessionService implements ISessionService {
  constructor(private redis: ReturnType<typeof createClient>) {}

  async create(projectId: string, data: ProjectData): Promise<string> {
    const sessionId = nanoid();
    await this.redis.setEx(
      `session:${sessionId}`,
      604800, // 7 days
      JSON.stringify(data)
    );
    return sessionId;
  }

  // ... implement other methods
}
```

**Dependencies**: `redis`
**Effort**: 1 day

---

### 4. Background Worker System (NEW)
**File**: `packages/api/src/worker/generation-worker.ts` (NEW)

We need a job queue system for long-running generation tasks.

**Option A: BullMQ (Recommended)**
```typescript
import { Worker, Queue } from 'bullmq';
import { WorkflowOrchestrator } from '../workflow/workflow-orchestrator';

// Queue definition
export const generationQueue = new Queue('generation', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

// Worker
const worker = new Worker('generation', async (job) => {
  const { projectId } = job.data;
  const orchestrator = new WorkflowOrchestrator();

  // Execute workflow with progress updates
  await orchestrator.execute(projectId, (progress) => {
    job.updateProgress(progress);
  });
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

**In API Controller**:
```typescript
// packages/api/src/controllers/generation.controller.ts
import { generationQueue } from '../worker/generation-worker';

export async function startGeneration(req: Request, res: Response) {
  const { projectId } = req.params;

  // Add job to queue
  const job = await generationQueue.add('generate', {
    projectId,
  });

  res.status(202).json({
    success: true,
    data: {
      jobId: job.id,
      message: 'Generation started',
    }
  });
}
```

**Dependencies**: `bullmq`
**Effort**: 2-3 days

---

### 5. Database Schema & Migrations
**File**: `packages/api/src/database/schema.sql` (NEW)

```sql
-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  status VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Create users table (for future auth)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_projects table (for collaboration)
CREATE TABLE IF NOT EXISTS user_projects (
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);
```

**Migration Tool**: Use `node-pg-migrate` or `knex`
**Effort**: 1 day

---

### 6. Render Deployment Service (NEW)
**File**: `packages/api/src/services/cloud/render-deployment.service.ts` (NEW)

```typescript
import { IDeploymentService } from '@kirby-gen/shared';
import axios from 'axios';

export class RenderDeploymentService implements IDeploymentService {
  constructor(
    private apiKey: string,
    private serviceId: string
  ) {}

  async deploy(projectId: string, buildPath: string): Promise<DeploymentResult> {
    // 1. Upload site files to S3
    const s3Url = await this.uploadToS3(projectId, buildPath);

    // 2. Create Render static site via API
    const response = await axios.post(
      'https://api.render.com/v1/services',
      {
        type: 'static_site',
        name: `portfolio-${projectId}`,
        repo: s3Url,
        autoDeploy: false,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return {
      deploymentId: response.data.service.id,
      url: response.data.service.serviceDetails.url,
      status: 'deploying',
    };
  }

  // ... implement other methods
}
```

**Alternative**: Deploy to Render Disk or use subdomain approach
**Effort**: 2-3 days

---

### 7. WebSocket Support on Render
Render supports WebSocket connections on Web Services.

**Configuration**:
- Enable WebSocket support in `render.yaml`
- Use `wss://` protocol in frontend
- Socket.IO should work out-of-the-box

**No code changes needed** ✅

---

## Deployment Steps

### Phase 1: Preparation (1-2 days)

1. **Implement Cloud Services**
   ```bash
   cd packages/api
   npm install @aws-sdk/client-s3 pg redis bullmq
   ```

2. **Create Migration Files**
   - PostgreSQL schema
   - Migration scripts
   - Seed data (optional)

3. **Update DI Configuration**
   ```typescript
   // packages/api/src/config/di-setup.ts
   if (process.env.NODE_ENV === 'production') {
     container.register('storage', new S3StorageService(...));
     container.register('session', new PostgresSessionService(...));
     // ...
   } else {
     container.register('storage', new LocalStorageService());
     container.register('session', new LocalSessionService());
     // ...
   }
   ```

4. **Create `render.yaml`** (see below)

---

### Phase 2: Render Setup (1 day)

1. **Create Render Account**
   - Sign up at https://render.com
   - Connect GitHub repository

2. **Create Services** (via Render Dashboard or `render.yaml`)
   - PostgreSQL database
   - Redis instance
   - API web service
   - Skills web service (private)
   - Background worker
   - Static site (frontend)

3. **Configure Environment Variables**
   - Add all required env vars to each service
   - Use Render's secret management

4. **Create DigitalOcean Spaces**
   - Sign up at DigitalOcean
   - Create new Space (S3-compatible)
   - Generate access keys
   - Add to Render env vars

---

### Phase 3: Deployment (1 day)

1. **Deploy Database**
   - Run migrations
   - Verify connectivity

2. **Deploy Services**
   - Push to `main` branch
   - Render auto-deploys all services
   - Monitor build logs

3. **Verify Deployment**
   - Check health endpoints
   - Test API connectivity
   - Test WebSocket connection
   - Test file uploads
   - Run E2E tests against production

---

### Phase 4: Testing & Monitoring (1 day)

1. **Run Tests**
   ```bash
   API_URL=https://api.your-domain.com npm run test:e2e
   ```

2. **Set Up Monitoring**
   - Enable Render monitoring
   - Configure log aggregation
   - Set up alerts

3. **Performance Testing**
   - Load test API endpoints
   - Test generation workflow
   - Monitor resource usage

---

## Infrastructure as Code - render.yaml

Create `render.yaml` at repository root for declarative infrastructure:

```yaml
# render.yaml
services:
  # Frontend - Static Site
  - type: web
    name: kirby-gen-web
    env: static
    buildCommand: cd packages/web && npm install && npm run build
    staticPublishPath: packages/web/dist
    envVars:
      - key: VITE_API_URL
        value: https://kirby-gen-api.onrender.com
      - key: VITE_WS_URL
        value: wss://kirby-gen-api.onrender.com

  # API Backend
  - type: web
    name: kirby-gen-api
    env: node
    buildCommand: cd packages/api && npm install && npm run build
    startCommand: cd packages/api && npm start
    healthCheckPath: /api/health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        fromDatabase:
          name: kirby-gen-db
          property: connectionString
      - key: REDIS_URL
        fromDatabase:
          name: kirby-gen-redis
          property: connectionString
      - key: CLAUDE_API_KEY
        sync: false  # Set manually in dashboard
      - key: S3_ENDPOINT
        sync: false
      - key: S3_BUCKET
        sync: false
      - key: S3_ACCESS_KEY_ID
        sync: false
      - key: S3_SECRET_ACCESS_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: SESSION_SECRET
        generateValue: true
      - key: SKILLS_BASE_URL
        fromService:
          name: kirby-gen-skills
          type: web
          property: url

  # Python Skills API (Private Service)
  - type: pserv  # Private service
    name: kirby-gen-skills
    env: python
    buildCommand: cd packages/skills && pip install -r requirements.txt
    startCommand: cd packages/skills && uvicorn src.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false  # Set manually

  # Background Worker
  - type: worker
    name: kirby-gen-worker
    env: node
    buildCommand: cd packages/api && npm install && npm run build
    startCommand: cd packages/api && npm run worker
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: kirby-gen-db
          property: connectionString
      - key: REDIS_URL
        fromDatabase:
          name: kirby-gen-redis
          property: connectionString
      - key: CLAUDE_API_KEY
        sync: false
      - key: S3_ENDPOINT
        sync: false
      - key: S3_BUCKET
        sync: false
      - key: S3_ACCESS_KEY_ID
        sync: false
      - key: S3_SECRET_ACCESS_KEY
        sync: false
      - key: SKILLS_BASE_URL
        fromService:
          name: kirby-gen-skills
          type: pserv
          property: url

databases:
  # PostgreSQL
  - name: kirby-gen-db
    databaseName: kirby_gen
    plan: standard

  # Redis
  - name: kirby-gen-redis
    plan: standard
```

---

## Monitoring & Observability

### 1. Render Built-in Monitoring
- CPU usage
- Memory usage
- Request metrics
- Error rates

### 2. Application Logs
Configure Winston to output JSON logs:
```typescript
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});
```

### 3. External Services (Optional)

**Sentry** (Error Tracking):
- Free tier: 5,000 errors/month
- Cost: $0-26/month

**Better Stack** (Log Management):
- Free tier: 1 GB/month
- Cost: $0-30/month

**Estimated Total**: ~$0-50/month (optional)

---

## Security Checklist

- [ ] Enable Render's automatic HTTPS
- [ ] Set up CORS properly (only allow your frontend domain)
- [ ] Use environment variables for all secrets
- [ ] Enable PostgreSQL connection pooling
- [ ] Configure Redis with authentication
- [ ] Set up S3 bucket policies (private by default)
- [ ] Enable rate limiting
- [ ] Add Helmet.js middleware (already done ✅)
- [ ] Set up CSP headers
- [ ] Enable HTTPS-only cookies
- [ ] Configure WebSocket authentication
- [ ] Set up Render IP whitelisting (if needed)

---

## Backup & Disaster Recovery

### Database Backups
- **Render PostgreSQL**: Automatic daily backups (7-day retention)
- **Manual backups**: Use `pg_dump` scheduled via cron job

### File Backups
- **DigitalOcean Spaces**: Enable versioning
- **Backup strategy**: Weekly full backup to separate bucket

### Disaster Recovery Plan
1. Database: Restore from Render backup or manual dump
2. Files: Restore from S3 bucket or backup bucket
3. Configuration: Stored in Git (render.yaml)
4. Secrets: Stored in password manager (1Password, Bitwarden)

**Recovery Time Objective (RTO)**: < 2 hours
**Recovery Point Objective (RPO)**: < 24 hours

---

## Performance Optimization

### 1. CDN
Render includes CDN for static sites automatically ✅

### 2. Database Connection Pooling
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Redis Caching
Cache frequently accessed data:
- Project metadata
- User sessions
- Design tokens
- Generated content previews

### 4. Image Optimization
Use CDN for images stored in S3:
```
https://your-bucket.s3.amazonaws.com/image.jpg
→ https://your-space.cdn.digitaloceanspaces.com/image.jpg
```

### 5. API Response Caching
```typescript
// Cache for 5 minutes
app.get('/api/projects', cacheMiddleware(300), getProjects);
```

---

## Scaling Strategy

### Horizontal Scaling
Render supports auto-scaling:
```yaml
# In render.yaml
services:
  - type: web
    name: kirby-gen-api
    scaling:
      minInstances: 1
      maxInstances: 5
      targetCPUPercent: 70
```

### Vertical Scaling
Upgrade instance types as needed:
- Starter → Standard: When hitting resource limits
- Standard → Pro: When handling >1000 concurrent users

### Database Scaling
- Enable read replicas for read-heavy workloads
- Upgrade to higher plan when hitting storage/connection limits

---

## Implementation Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Preparation** | Implement cloud services, migrations | 3-4 days | None |
| **Render Setup** | Create accounts, configure services | 1 day | Preparation |
| **Deployment** | Deploy all services, run migrations | 1 day | Render Setup |
| **Testing** | E2E tests, performance testing | 1-2 days | Deployment |
| **Monitoring** | Set up logs, alerts, dashboards | 1 day | Deployment |
| **Launch** | Go live, monitor, iterate | Ongoing | All above |

**Total**: ~7-10 days for complete migration

---

## Cost Summary

### Monthly Costs

**Production Setup** (Recommended):
| Service | Plan | Cost |
|---------|------|------|
| Frontend (Static) | Free | $0 |
| API Backend | Standard | $25 |
| Skills API | Starter (Private) | $7 |
| Background Worker | Standard | $25 |
| PostgreSQL | Standard | $15 |
| Redis | Standard | $15 |
| DigitalOcean Spaces | Base | $5 |
| **Subtotal** | | **$92** |
| Monitoring (optional) | Sentry + Logs | $30 |
| **Total** | | **~$122/month** |

### Annual Cost: ~$1,464/year

### Cost Breakdown by Traffic
- **0-1,000 users/month**: $92/month
- **1,000-10,000 users/month**: $150/month (+ auto-scaling)
- **10,000+ users/month**: $300+/month (Pro instances, replicas)

---

## Next Steps

1. **Review this plan** - Confirm approach and costs
2. **Create Render account** - Sign up and connect GitHub
3. **Create DO Spaces** - Set up object storage
4. **Implement cloud services** - S3, PostgreSQL, Redis services (3-4 days)
5. **Test locally** - Verify all cloud services work
6. **Deploy to Render** - Push and deploy (1 day)
7. **Run E2E tests** - Verify production deployment
8. **Go live** - Start using in production

---

**Questions? Need help with implementation?**
Let me know and I can provide detailed code examples for any component!
