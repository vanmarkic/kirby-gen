# Deployment Guide - Render

Step-by-step guide to deploy Kirby-Gen to Render.

## Prerequisites

Before deploying, ensure you have:
- ✅ GitHub account with repository access
- ✅ Render account (sign up at https://render.com)
- ✅ DigitalOcean account (for Spaces storage)
- ✅ Claude API key (from https://console.anthropic.com)
- ✅ Credit card for Render services (~$92/month)

---

## Pre-Deployment Checklist

### 1. Implement Cloud Services (3-4 days)

The following services need to be implemented before deploying:

#### ✅ Already Done
- [x] Local services (Storage, Session, Git, Deployment)
- [x] Service interfaces (IStorageService, ISessionService, etc.)
- [x] DI container setup
- [x] All Claude skills

#### ⚠️ Need to Implement

**Priority 1 - Essential for Render**:
- [ ] S3StorageService (1 day)
- [ ] PostgresSessionService (1 day)
- [ ] RedisSessionService (1 day)
- [ ] Background worker with BullMQ (2 days)
- [ ] Database migrations (1 day)

**Priority 2 - Optional (use local equivalents initially)**:
- [ ] RenderDeploymentService (2 days)
- [ ] GitHubGitService (2 days)

**Estimated Total**: 5-8 days

---

## Implementation Tasks

### Task 1: S3 Storage Service

**File**: `packages/api/src/services/cloud/s3-storage.service.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { IStorageService, FileMetadata } from '@kirby-gen/shared';

export class S3StorageService implements IStorageService {
  private s3Client: S3Client;

  constructor(
    private bucket: string,
    private region: string,
    endpoint?: string
  ) {
    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(projectId: string, file: Buffer, filename: string): Promise<string> {
    const key = `${projectId}/${filename}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
    }));

    // Return URL
    const endpoint = process.env.S3_ENDPOINT || `https://s3.${this.region}.amazonaws.com`;
    return `${endpoint}/${this.bucket}/${key}`;
  }

  async downloadFile(projectId: string, filename: string): Promise<Buffer> {
    const key = `${projectId}/${filename}`;

    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async listFiles(projectId: string): Promise<string[]> {
    const response = await this.s3Client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: `${projectId}/`,
    }));

    return (response.Contents || [])
      .map(obj => obj.Key!.replace(`${projectId}/`, ''))
      .filter(key => key && !key.endsWith('.meta.json'));
  }

  async deleteFile(projectId: string, filename: string): Promise<void> {
    const key = `${projectId}/${filename}`;
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async deleteProject(projectId: string): Promise<void> {
    const files = await this.listFiles(projectId);

    for (const file of files) {
      await this.deleteFile(projectId, file);
    }
  }

  async fileExists(projectId: string, filename: string): Promise<boolean> {
    const key = `${projectId}/${filename}`;

    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(projectId: string, filename: string): Promise<FileMetadata> {
    const key = `${projectId}/${filename}`;

    const response = await this.s3Client.send(new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    return {
      filename,
      size: response.ContentLength || 0,
      mimeType: response.ContentType || 'application/octet-stream',
      createdAt: response.LastModified || new Date(),
      updatedAt: response.LastModified || new Date(),
    };
  }
}
```

**Install dependencies**:
```bash
cd packages/api
npm install @aws-sdk/client-s3
```

---

### Task 2: PostgreSQL Session Service

**File**: `packages/api/src/services/cloud/postgres-session.service.ts`

```typescript
import { Pool } from 'pg';
import { ISessionService } from '@kirby-gen/shared';
import { ProjectData } from '@kirby-gen/shared';
import { nanoid } from 'nanoid';

export class PostgresSessionService implements ISessionService {
  constructor(private pool: Pool) {}

  async create(projectId: string, data: ProjectData): Promise<string> {
    const sessionId = nanoid();

    await this.pool.query(
      `INSERT INTO sessions (id, project_id, data, created_at, updated_at, expires_at)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW() + INTERVAL '7 days')`,
      [sessionId, projectId, JSON.stringify(data)]
    );

    return sessionId;
  }

  async get(sessionId: string): Promise<ProjectData | null> {
    const result = await this.pool.query(
      'SELECT data FROM sessions WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].data;
  }

  async update(sessionId: string, data: Partial<ProjectData>): Promise<void> {
    // Get existing data
    const existing = await this.get(sessionId);
    if (!existing) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Merge with partial data
    const updated = { ...existing, ...data };

    await this.pool.query(
      'UPDATE sessions SET data = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updated), sessionId]
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }

  async exists(sessionId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM sessions WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())',
      [sessionId]
    );
    return result.rows.length > 0;
  }

  async listSessions(projectId: string): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT id FROM sessions WHERE project_id = $1 AND (expires_at IS NULL OR expires_at > NOW())',
      [projectId]
    );
    return result.rows.map(row => row.id);
  }

  async cleanup(maxAge: number): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM sessions WHERE expires_at < NOW() OR updated_at < NOW() - INTERVAL $1 milliseconds',
      [maxAge]
    );
    return result.rowCount || 0;
  }
}
```

**Database Migration**:
```sql
-- packages/api/src/database/migrations/001_create_sessions.sql
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
```

**Install dependencies**:
```bash
npm install pg
```

---

### Task 3: Redis Session Service

**File**: `packages/api/src/services/cloud/redis-session.service.ts`

```typescript
import { createClient, RedisClientType } from 'redis';
import { ISessionService, ProjectData } from '@kirby-gen/shared';
import { nanoid } from 'nanoid';

export class RedisSessionService implements ISessionService {
  private client: RedisClientType;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    this.client.connect();
  }

  async create(projectId: string, data: ProjectData): Promise<string> {
    const sessionId = nanoid();
    const key = `session:${sessionId}`;

    await this.client.setEx(key, 604800, JSON.stringify(data)); // 7 days TTL
    await this.client.sAdd(`project:${projectId}:sessions`, sessionId);

    return sessionId;
  }

  async get(sessionId: string): Promise<ProjectData | null> {
    const key = `session:${sessionId}`;
    const data = await this.client.get(key);

    return data ? JSON.parse(data) : null;
  }

  async update(sessionId: string, data: Partial<ProjectData>): Promise<void> {
    const key = `session:${sessionId}`;
    const existing = await this.get(sessionId);

    if (!existing) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = { ...existing, ...data };
    await this.client.setEx(key, 604800, JSON.stringify(updated));
  }

  async delete(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.client.del(key);
  }

  async exists(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async listSessions(projectId: string): Promise<string[]> {
    const members = await this.client.sMembers(`project:${projectId}:sessions`);
    return members;
  }

  async cleanup(maxAge: number): Promise<number> {
    // Redis automatically expires keys with TTL
    // This method is for compatibility
    return 0;
  }
}
```

**Install dependencies**:
```bash
npm install redis
```

---

### Task 4: Background Worker with BullMQ

**File**: `packages/api/src/worker/generation-worker.ts`

```typescript
import { Worker, Queue, Job } from 'bullmq';
import { WorkflowOrchestrator } from '../workflow/workflow-orchestrator';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { createLogger } from '../config/logger';

const logger = createLogger('worker');

// Create queue
export const generationQueue = new Queue('generation', {
  connection: {
    url: process.env.REDIS_URL,
  },
});

// Create worker
export function startWorker() {
  const worker = new Worker(
    'generation',
    async (job: Job) => {
      const { projectId } = job.data;
      logger.info(`Starting generation for project ${projectId}`, { jobId: job.id });

      const orchestrator = new WorkflowOrchestrator();

      try {
        // Execute workflow with progress updates
        await orchestrator.execute(projectId, (progress) => {
          job.updateProgress(progress.progress);
          logger.info(`Progress: ${progress.progress}%`, { projectId, phase: progress.phase });
        });

        logger.info(`Generation completed for project ${projectId}`, { jobId: job.id });
      } catch (error) {
        logger.error(`Generation failed for project ${projectId}`, { jobId: job.id, error });
        throw error;
      }
    },
    {
      connection: {
        url: process.env.REDIS_URL,
      },
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  logger.info('Worker started');

  return worker;
}
```

**File**: `packages/api/src/worker/index.ts`

```typescript
import { startWorker } from './generation-worker';
import { createLogger } from '../config/logger';

const logger = createLogger('worker-main');

// Start worker
async function main() {
  logger.info('Starting generation worker...');

  try {
    const worker = startWorker();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down worker...');
      await worker.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down worker...');
      await worker.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

main();
```

**Update package.json**:
```json
{
  "scripts": {
    "worker": "node dist/worker/index.js"
  }
}
```

**Install dependencies**:
```bash
npm install bullmq
```

---

### Task 5: Update DI Container for Production

**File**: `packages/api/src/config/di-setup.ts`

```typescript
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { LocalStorageService } from '../services/local/storage.service';
import { LocalSessionService } from '../services/local/session.service';
import { S3StorageService } from '../services/cloud/s3-storage.service';
import { PostgresSessionService } from '../services/cloud/postgres-session.service';
import { RedisSessionService } from '../services/cloud/redis-session.service';
import { Pool } from 'pg';

export function setupDependencyInjection() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Cloud services for production
    console.log('Configuring cloud services for production');

    // S3 Storage
    const s3Service = new S3StorageService(
      process.env.S3_BUCKET!,
      process.env.S3_REGION!,
      process.env.S3_ENDPOINT
    );
    container.register(SERVICE_KEYS.STORAGE, s3Service);

    // PostgreSQL Session
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    const pgSession = new PostgresSessionService(pool);
    container.register(SERVICE_KEYS.SESSION, pgSession);

    // Redis Session (alternative)
    // const redisSession = new RedisSessionService(process.env.REDIS_URL!);
    // container.register(SERVICE_KEYS.SESSION, redisSession);

    // Git and Deployment services (use local for now)
    // TODO: Implement cloud versions
    container.register(SERVICE_KEYS.GIT, new LocalGitService());
    container.register(SERVICE_KEYS.DEPLOYMENT, new LocalDeploymentService());
  } else {
    // Local services for development
    console.log('Configuring local services for development');

    container.register(SERVICE_KEYS.STORAGE, new LocalStorageService());
    container.register(SERVICE_KEYS.SESSION, new LocalSessionService());
    container.register(SERVICE_KEYS.GIT, new LocalGitService());
    container.register(SERVICE_KEYS.DEPLOYMENT, new LocalDeploymentService());
  }
}
```

---

## Deployment Steps

### Step 1: Set Up DigitalOcean Spaces (15 minutes)

1. **Sign up for DigitalOcean**: https://www.digitalocean.com
2. **Create a Space**:
   - Go to Spaces → Create Space
   - Choose region (e.g., NYC3)
   - Name: `kirby-gen-storage`
   - Enable CDN
   - Click "Create Space"
3. **Generate API Keys**:
   - Go to API → Spaces Keys
   - Click "Generate New Key"
   - Save Access Key ID and Secret Key (you'll need these for Render)

---

### Step 2: Set Up Render Account (10 minutes)

1. **Sign up for Render**: https://render.com
2. **Connect GitHub**:
   - Go to Account Settings → GitHub
   - Authorize Render to access your repository
3. **Add Payment Method**:
   - Go to Account Settings → Billing
   - Add credit card

---

### Step 3: Deploy via render.yaml (30 minutes)

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Render configuration"
   git push origin main
   ```

2. **Create Blueprint in Render**:
   - Go to Dashboard → New → Blueprint
   - Select your GitHub repository
   - Render will auto-detect `render.yaml`
   - Click "Apply"

3. **Set Manual Environment Variables**:

   For **kirby-gen-api** service:
   - `CLAUDE_API_KEY`: Your Claude API key
   - `S3_ENDPOINT`: `https://nyc3.digitaloceanspaces.com` (or your region)
   - `S3_BUCKET`: `kirby-gen-storage` (or your bucket name)
   - `S3_ACCESS_KEY_ID`: From DigitalOcean
   - `S3_SECRET_ACCESS_KEY`: From DigitalOcean

   For **kirby-gen-skills** service:
   - `ANTHROPIC_API_KEY`: Your Claude API key

   For **kirby-gen-worker** service:
   - Same as API service

4. **Deploy**:
   - Render will automatically deploy all services
   - Monitor build logs for each service
   - Wait for all services to be "Live" (5-10 minutes)

---

### Step 4: Run Database Migrations (10 minutes)

1. **Get Database URL**:
   - Go to kirby-gen-db → Info tab
   - Copy "External Connection String"

2. **Run migration locally** (or via Render Shell):
   ```bash
   # Set DATABASE_URL
   export DATABASE_URL="postgres://..."

   # Run migration
   cd packages/api
   npm run migrate
   ```

   **Or create migration script**:
   ```bash
   # packages/api/scripts/migrate.sh
   #!/bin/bash
   psql $DATABASE_URL < src/database/migrations/001_create_sessions.sql
   ```

3. **Verify tables**:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

---

### Step 5: Verify Deployment (20 minutes)

1. **Check All Services Are Live**:
   - ✅ kirby-gen-web (Static Site)
   - ✅ kirby-gen-api (Web Service)
   - ✅ kirby-gen-skills (Private Service)
   - ✅ kirby-gen-worker (Background Worker)
   - ✅ kirby-gen-db (PostgreSQL)
   - ✅ kirby-gen-redis (Redis)

2. **Test API Health**:
   ```bash
   curl https://kirby-gen-api.onrender.com/api/health
   ```

3. **Test Frontend**:
   - Visit https://kirby-gen-web.onrender.com
   - Should load homepage
   - Check browser console for errors

4. **Test File Upload**:
   - Create a project
   - Upload a test file
   - Verify it appears in DigitalOcean Spaces

5. **Test Generation**:
   - Start a generation workflow
   - Monitor logs in Render dashboard
   - Verify WebSocket connection works
   - Check that worker picks up job

---

### Step 6: Set Up Custom Domain (Optional, 20 minutes)

1. **Add Custom Domain in Render**:
   - Go to kirby-gen-web service
   - Settings → Custom Domains
   - Add `app.yourdomain.com`
   - Render provides DNS instructions

2. **Update DNS**:
   - Add CNAME record: `app` → `kirby-gen-web.onrender.com`

3. **Update API Domain**:
   - Go to kirby-gen-api service
   - Add custom domain: `api.yourdomain.com`
   - Update DNS: `api` → `kirby-gen-api.onrender.com`

4. **Update Frontend Environment Variables**:
   - Update `VITE_API_URL` to `https://api.yourdomain.com`
   - Redeploy frontend

---

### Step 7: Set Up Monitoring (30 minutes)

1. **Enable Render Metrics**:
   - Already enabled by default
   - View in service dashboard

2. **Set Up Log Aggregation** (Optional):
   - Sign up for Better Stack: https://betterstack.com
   - Add log drain in Render:
     - Service Settings → Logging
     - Add Better Stack endpoint

3. **Set Up Error Tracking** (Optional):
   - Sign up for Sentry: https://sentry.io
   - Add Sentry DSN to environment variables
   - Install Sentry SDK (see ROADMAP.md)

4. **Set Up Alerts**:
   - Render → Service → Notifications
   - Add email/Slack webhook for failures

---

## Post-Deployment Checklist

- [ ] All services showing "Live" in Render dashboard
- [ ] Database tables created and accessible
- [ ] Redis connection working
- [ ] S3 file uploads working
- [ ] API health endpoint returns 200
- [ ] Frontend loads without errors
- [ ] WebSocket connection successful
- [ ] Test generation workflow end-to-end
- [ ] Custom domains configured (if applicable)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy confirmed
- [ ] Team access configured
- [ ] Documentation updated with URLs

---

## Troubleshooting

### Service Won't Start

**Check Build Logs**:
- Render Dashboard → Service → Logs → Build
- Look for npm install errors or missing dependencies

**Common Issues**:
- Missing environment variables
- Wrong Node/Python version
- Missing build command

**Solution**:
- Verify all env vars are set
- Check `render.yaml` configuration
- Test build locally

---

### Database Connection Fails

**Check Connection String**:
```bash
echo $DATABASE_URL
```

**Common Issues**:
- Wrong DATABASE_URL format
- IP not whitelisted (should be empty for Render services)
- Database not ready yet

**Solution**:
- Wait for database to be fully provisioned
- Verify connection string in environment variables
- Test connection with `psql`

---

### File Uploads Fail

**Check S3 Configuration**:
```bash
curl https://kirby-gen-api.onrender.com/api/test-s3
```

**Common Issues**:
- Wrong S3 credentials
- Bucket doesn't exist
- CORS not configured

**Solution**:
- Verify S3 environment variables
- Check bucket exists in DigitalOcean
- Configure CORS in Spaces settings:
  ```json
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
  ```

---

### WebSocket Connection Fails

**Check URL**:
- Should be `wss://` (not `ws://`)
- Should match API URL

**Common Issues**:
- Wrong WebSocket URL in frontend
- CORS issues
- Load balancer timeout

**Solution**:
- Update `VITE_WS_URL` environment variable
- Verify CORS configuration in API
- Check Render WebSocket support is enabled

---

### Worker Not Processing Jobs

**Check Worker Logs**:
- Render Dashboard → kirby-gen-worker → Logs

**Common Issues**:
- Redis connection failed
- Worker not started
- Queue not created

**Solution**:
- Verify REDIS_URL is set
- Check worker start command
- Test Redis connection

---

## Rollback Plan

If deployment fails:

1. **Revert Code**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Render Auto-Deploys**:
   - Render will automatically deploy the reverted commit

3. **Manual Rollback**:
   - Render Dashboard → Service → Deployments
   - Click "Redeploy" on previous working deployment

---

## Cost Monitoring

**Set Up Billing Alerts**:
- Render → Account Settings → Billing → Alerts
- Set alert for 80% of budget

**Monitor Monthly Costs**:
- Render Dashboard → Account → Usage
- DigitalOcean Dashboard → Billing

**Expected Monthly Cost**: ~$92-122/month

---

## Next Steps After Deployment

1. **Test thoroughly** - Run E2E tests against production
2. **Monitor for 24 hours** - Watch for errors/issues
3. **Set up backups** - Configure automated backups
4. **Create runbook** - Document common issues and solutions
5. **Scale as needed** - Adjust instance sizes based on usage

---

## Support

**Render Support**:
- Docs: https://render.com/docs
- Community: https://community.render.com
- Support: support@render.com

**DigitalOcean Support**:
- Docs: https://docs.digitalocean.com
- Community: https://www.digitalocean.com/community
- Support: cloud.digitalocean.com/support

---

**Questions? Issues?**
Check the troubleshooting section or open an issue in the GitHub repository.
