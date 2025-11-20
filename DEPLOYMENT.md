# Deployment Guide - Coolify

Complete deployment configuration for Hetzner VPS + Coolify with local file-based services.

## Overview

This deployment uses:
- **Hetzner VPS** (CPX31: 8GB RAM, 4 vCPU, €13.50/month)
- **Coolify** for container orchestration and deployment
- **Local file system** for storage (Docker volumes)
- **Local JSON files** for session management
- **No external dependencies** (S3, PostgreSQL, Redis not required)

**Total Cost: ~€14/month** (Hetzner VPS + domain)

## Architecture

```
┌─────────────────────────────────────────┐
│          Coolify (Reverse Proxy)        │
│              + SSL/TLS                   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴──────┐
       │              │
       ▼              ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│   Web   │◄───│   API   │◄───│ Skills  │
│ (React) │    │(Node.js)│    │(Python) │
│  :5173  │    │  :3000  │    │  :8001  │
└─────────┘    └────┬────┘    └─────────┘
                    │
                    ▼
              ┌──────────┐
              │ Volumes  │
              │ storage  │
              │ sessions │
              │deployments│
              │ uploads  │
              └──────────┘
```

## Files Included

- `docker-compose.production.yml` - Multi-service orchestration
- `Dockerfile.web` - React frontend with nginx
- `Dockerfile.api` - Node.js/Express backend
- `Dockerfile.skills` - Python FastAPI skills server
- `packages/web/nginx.conf` - Nginx configuration

## Prerequisites

- Hetzner VPS (CPX31 recommended: 8GB RAM, 4 vCPU, €13.50/month)
- Docker & Docker Compose installed on the server
- Coolify installed
- Claude API key from https://console.anthropic.com
- Domain name (optional, but recommended for SSL)

## Quick Start

### 1. Install Coolify on Your Server

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Access Coolify at `http://YOUR_SERVER_IP:8000`

### 2. Connect GitHub to Coolify

1. In Coolify: **Sources** → **Add** → **GitHub**
2. Register GitHub App
3. Install on `vanmarkic/kirby-gen` repository

### 3. Create New Resource in Coolify

1. **New Resource** → **Git**
2. Select `kirby-gen` repository
3. **Build Pack**: Docker Compose
4. **Docker Compose Location**: `docker-compose.production.yml`
5. **Branch**: `master` (or `main`)

### 4. Configure Persistent Volumes

Coolify automatically detects volumes from `docker-compose.production.yml`.

Verify these 4 volumes are configured:

| Volume | Destination Path | Purpose |
|--------|-----------------|---------|
| storage | `/tmp/kirby-gen/storage` | Generated Kirby sites |
| sessions | `/tmp/kirby-gen/sessions` | User session data |
| deployments | `/tmp/kirby-gen/deployments` | Deployment artifacts |
| uploads | `/tmp/kirby-gen/uploads` | User-uploaded assets |

### 5. Set Environment Variables

In Coolify resource settings, add:

#### Required
```bash
CLAUDE_API_KEY=sk-ant-xxxxx
NODE_ENV=production
```

#### Recommended (match volume paths)
```bash
STORAGE_DIR=/tmp/kirby-gen/storage
SESSION_DIR=/tmp/kirby-gen/sessions
DEPLOYMENT_DIR=/tmp/kirby-gen/deployments
UPLOAD_DIR=/tmp/kirby-gen/uploads
```

#### Optional
```bash
PORT=3000
```

### 6. Configure Domain (Optional)

1. In Coolify resource settings: **Domains**
2. Add your domain: `kirby.yourdomain.com`
3. Update your DNS:
   - Add A record: `kirby` → `YOUR_SERVER_IP`
4. Coolify will automatically provision SSL via Let's Encrypt

### 7. Deploy

1. Click **Deploy** in Coolify
2. Monitor build logs (first build takes 5-10 minutes)
3. Wait for all services to be running

## Access Your Application

**With domain configured:**
- Web Interface: `https://kirby.yourdomain.com`
- API: `https://kirby.yourdomain.com/api` (proxied by nginx)

**Without domain (local access):**
- Web Interface: `http://YOUR_SERVER_IP:5173`
- API Backend: `http://YOUR_SERVER_IP:3000`
- Skills Server: `http://YOUR_SERVER_IP:8001` (internal only)

## Manual Deployment (Without Coolify)

If you prefer to deploy manually without Coolify:

```bash
# Clone repository
git clone https://github.com/vanmarkic/kirby-gen.git
cd kirby-gen

# Create .env file
cat > .env << EOF
CLAUDE_API_KEY=your_api_key_here
NODE_ENV=production
STORAGE_DIR=/tmp/kirby-gen/storage
SESSION_DIR=/tmp/kirby-gen/sessions
DEPLOYMENT_DIR=/tmp/kirby-gen/deployments
UPLOAD_DIR=/tmp/kirby-gen/uploads
EOF

# Build and run
docker-compose -f docker-compose.production.yml up -d
```

## Production Features

### SSL/TLS
Coolify automatically provisions SSL certificates via Let's Encrypt when you configure a domain.

### Automatic Backups

Configure in Coolify: **Resource** → **Settings** → **Backups**

Recommended backup schedule:
- **Daily** backups of Docker volumes
- **Retention**: 7 days
- **Backup location**: S3-compatible storage (optional)

### Auto-Deploy on Git Push

Coolify automatically:
1. Detects git push to `master` branch
2. Pulls latest code
3. Rebuilds containers
4. Zero-downtime deployment

### Monitoring

Coolify provides built-in monitoring:
- Real-time resource usage (CPU, RAM, disk)
- Application logs (per service)
- Deployment history
- Uptime tracking

Access via: **Resource** → **Metrics**

## Troubleshooting

### Build Fails: npm command not found (exit code 127)

**Symptom:** Build fails with error at `RUN npm run build -w packages/shared --if-present`

**Cause:** Incorrect npm workspace syntax in Dockerfiles

**Fix:** Use `--workspace=` instead of `-w`:
```dockerfile
# ❌ Wrong
RUN npm run build -w packages/shared --if-present

# ✅ Correct
RUN npm run build --workspace=packages/shared --if-present
```

**Fixed in:** [Dockerfile.web:21](Dockerfile.web#L21), [Dockerfile.api:21](Dockerfile.api#L21)

### Build Fails with Memory Error

Free up disk space:
```bash
ssh root@YOUR_SERVER_IP
docker system prune -a
```

### Check Service Logs

In Coolify:
1. Go to your resource
2. Click **Logs**
3. Select service (web, api, skills)
4. View real-time logs

Or via SSH:
```bash
# View all services
docker-compose -f docker-compose.production.yml logs -f

# View specific service
docker-compose -f docker-compose.production.yml logs web
docker-compose -f docker-compose.production.yml logs api
docker-compose -f docker-compose.production.yml logs skills
```

### Restart Services

In Coolify: **Resource** → **Actions** → **Restart**

Or via SSH:
```bash
docker-compose -f docker-compose.production.yml restart
```

### Access Container Shell

```bash
# API container
docker-compose -f docker-compose.production.yml exec api sh

# Skills container
docker-compose -f docker-compose.production.yml exec skills bash

# Web container (nginx)
docker-compose -f docker-compose.production.yml exec web sh
```

### Check Container Status

```bash
docker-compose -f docker-compose.production.yml ps
```

### Services Not Starting

**Common issues:**
- Missing `CLAUDE_API_KEY` environment variable
- Insufficient memory (upgrade to CPX31 or higher)
- Port conflicts (ensure ports 3000, 5173, 8001 are free)

**Solution:**
1. Check Coolify logs for error messages
2. Verify all environment variables are set
3. Ensure volumes are properly mounted
4. Check Docker daemon is running: `systemctl status docker`

### Volume Data Not Persisting

**Check volume mounts:**
```bash
docker volume ls
docker volume inspect m8s84o8os4oowsscwgog4ssc_storage
```

**Verify data exists:**
```bash
docker-compose -f docker-compose.production.yml exec api ls -la /tmp/kirby-gen/storage
```

## Updates & Rollbacks

### Automatic Updates

Coolify automatically deploys when you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin master
```

Coolify will detect the push and redeploy within 1-2 minutes.

### Manual Update

```bash
cd kirby-gen
git pull
docker-compose -f docker-compose.production.yml up -d --build
```

### Rollback

In Coolify dashboard:
1. Go to your resource
2. Click **Deployments**
3. Select previous successful deployment
4. Click **Redeploy**

## Scaling

### Vertical Scaling (Recommended for Start)

Upgrade Hetzner VPS:
- **CPX31** (8GB RAM): €13.50/month - Good for testing
- **CPX41** (16GB RAM): €27/month - Recommended for production
- **CPX51** (32GB RAM): €54/month - High traffic

### Horizontal Scaling (Future)

For multi-instance deployment, you'll need to implement:
- S3-compatible storage (DigitalOcean Spaces, AWS S3)
- PostgreSQL or Redis for shared sessions
- Load balancer for API/Web services

See `ARCHITECTURE.md` for cloud service interfaces.

## Cost Comparison

| Provider | Configuration | Monthly Cost |
|----------|--------------|--------------|
| **Hetzner + Coolify** | CPX31 (8GB) + domain | **€14** |
| Railway | 3 services | $45-60 |
| Render | 3 services + DB | $35-50 |
| Vercel + others | Not suitable for this architecture | N/A |

**Savings: €30-45/month with Hetzner + Coolify**

## Additional Apps on Same Server

You can deploy additional apps on the same Hetzner VPS via Coolify:

### SiYuan (Note-taking)
- **Image**: `b3log/siyuan`
- **Port**: 6806
- **Domain**: `siyuan.yourdomain.com`

### Excalidraw (Diagramming)
- **Image**: `excalidraw/excalidraw`
- **Port**: 80
- **Domain**: `draw.yourdomain.com`

### Outline (Wiki/Docs)
- Use Docker Compose with Postgres + Redis
- See Coolify documentation for multi-service apps

## Security Best Practices

1. **Always use HTTPS** - Configure domain for automatic SSL
2. **Firewall rules** - Only expose ports 80, 443, 22 (SSH)
3. **Regular updates** - Keep Coolify and Docker updated
4. **Backup regularly** - Enable automated backups in Coolify
5. **Rotate API keys** - Update `CLAUDE_API_KEY` periodically
6. **Monitor logs** - Check for suspicious activity

## Support & Resources

- **Coolify Docs**: https://coolify.io/docs
- **Hetzner Docs**: https://docs.hetzner.com
- **kirby-gen Issues**: https://github.com/vanmarkic/kirby-gen/issues
- **CLAUDE.md**: Project-specific development guide
- **ARCHITECTURE.md**: System architecture and design patterns

## Future: Cloud Services (Optional)

Currently, the app uses local file system storage and JSON session files. This works great for single-server deployments.

For horizontal scaling across multiple servers, you'll need:
- **S3StorageService** - Shared file storage across instances
- **PostgresSessionService** or **RedisSessionService** - Shared session state
- **BullMQ Worker** - Background job processing with Redis

Service interfaces are already defined in `packages/shared/src/interfaces/`. Implementation is straightforward when needed.

---

**Created:** 2025-11-20
**Updated:** 2025-11-21
**For:** kirby-gen deployment on Hetzner + Coolify
**Architecture:** Local services (file system + JSON)
