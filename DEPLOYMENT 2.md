# kirby-gen Deployment Guide

Complete deployment configuration for Hetzner + Coolify

## Files Included

- `docker-compose.production.yml` - Multi-service orchestration
- `Dockerfile.web` - React frontend with nginx
- `Dockerfile.api` - Node.js/Express backend
- `Dockerfile.skills` - Python FastAPI skills server
- `packages/web/nginx.conf` - Nginx configuration
- `DEPLOYMENT.md` - This file

## Prerequisites

- Hetzner VPS (CPX31 recommended: 8GB RAM, 4 vCPU, €13.50/month)
- Docker & Docker Compose installed
- Coolify installed (optional but recommended)
- Claude API key from https://console.anthropic.com

## Quick Start with Coolify

### 1. Install Coolify on Your Server

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Access Coolify at `http://YOUR_SERVER_IP:8000`

### 2. Add Files to Your Repository

Copy all files from this zip to your kirby-gen repository root:

```bash
cd /path/to/kirby-gen
# Extract zip contents here
git add .
git commit -m "Add deployment configuration"
git push origin main
```

### 3. Connect GitHub to Coolify

1. In Coolify: Sources → Add → GitHub
2. Register GitHub App
3. Install on vanmarkic/kirby-gen repository

### 4. Deploy

1. New Resource → Git
2. Select kirby-gen repository
3. Build Pack: **Docker Compose**
4. Docker Compose Location: `docker-compose.production.yml`
5. Set environment variables:
   ```
   CLAUDE_API_KEY=your_api_key_here
   NODE_ENV=production
   ```
6. Domain (optional): `kirby.yourdomain.com`
7. Click **Deploy**

First build takes 5-10 minutes.

## Manual Deployment (Without Coolify)

```bash
# Clone repository
git clone https://github.com/vanmarkic/kirby-gen.git
cd kirby-gen

# Create .env file
cat > .env << EOF
CLAUDE_API_KEY=your_api_key_here
NODE_ENV=production
EOF

# Build and run
docker-compose -f docker-compose.production.yml up -d
```

## Access Your Application

- Web Interface: http://localhost:5173
- API Backend: http://localhost:3000
- Skills Server: http://localhost:8001

With domain configured in Coolify:
- https://kirby.yourdomain.com

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
              └──────────┘
```

## Environment Variables

### Required

- `CLAUDE_API_KEY` - Your Anthropic API key
- `NODE_ENV` - Set to `production`

### Optional

- `PORT` - API port (default: 3000)
- `VITE_API_URL` - Frontend API URL (default: http://api:3000)

## Production Notes

### SSL/TLS

Coolify automatically provisions SSL certificates via Let's Encrypt when you set a domain.

### Backups

Coolify can schedule automatic backups for:
- Docker volumes (storage, sessions, deployments)
- Database (if added later)

Configure in Coolify: Resource → Settings → Backups

### Scaling

To scale horizontally:
1. Upgrade Hetzner VPS (CPX41: 16GB RAM, €27/month)
2. Or add multiple instances and load balancer

### Monitoring

Coolify provides:
- Real-time resource monitoring (CPU, RAM, disk)
- Application logs
- Deployment history
- Uptime tracking

## Troubleshooting

### Build Fails with Memory Error

```bash
ssh root@YOUR_SERVER_IP
docker system prune -a
```

### Check Service Logs

```bash
# Via Docker
docker-compose -f docker-compose.production.yml logs -f

# Or individual services
docker-compose -f docker-compose.production.yml logs web
docker-compose -f docker-compose.production.yml logs api
docker-compose -f docker-compose.production.yml logs skills
```

### Restart Services

```bash
docker-compose -f docker-compose.production.yml restart
```

### Access Container Shell

```bash
# API container
docker-compose -f docker-compose.production.yml exec api sh

# Skills container
docker-compose -f docker-compose.production.yml exec skills bash
```

### Check Container Status

```bash
docker-compose -f docker-compose.production.yml ps
```

## Cost Comparison

### Hetzner + Coolify
- CPX31 (8GB): €13.50/month
- Domain: ~€10/year = €0.83/month
- **Total: €14.33/month**

### Railway
- 3 services × ~$15-20 each = **$45-60/month**

### Render
- 3 services × $7 + database = **$35-50/month**

### Vercel + other services
- Not suitable for this architecture

**You save: €30-45/month with Hetzner**

## Additional Apps

You can deploy these on the same server:

### SiYuan (Note-taking)
```bash
# In Coolify: New Resource → Docker Image
Image: b3log/siyuan
Port: 6806
Domain: siyuan.yourdomain.com
```

### Excalidraw (Diagramming)
```bash
Image: excalidraw/excalidraw
Port: 80
Domain: draw.yourdomain.com
```

### Outline (Wiki/Docs)
Use docker-compose with Postgres + Redis (see Notion guide)

## Support

- Coolify Docs: https://coolify.io/docs
- Hetzner Docs: https://docs.hetzner.com
- kirby-gen Issues: https://github.com/vanmarkic/kirby-gen/issues

## Updates

### Auto-Deploy on Git Push

Coolify automatically:
1. Detects git push
2. Pulls latest code
3. Rebuilds containers
4. Zero-downtime deployment

### Manual Update

```bash
cd kirby-gen
git pull
docker-compose -f docker-compose.production.yml up -d --build
```

### Rollback

In Coolify dashboard:
1. Go to your resource
2. Click "Deployments"
3. Select previous deployment
4. Click "Redeploy"

---

**Created:** 2025-11-20  
**For:** kirby-gen deployment on Hetzner + Coolify  
**Author:** Deployment configuration for vanmarkic
