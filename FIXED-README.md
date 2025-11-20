# FIXED Deployment Files for kirby-gen

## What Was Wrong

The previous Dockerfiles didn't handle the monorepo structure properly. They failed at the build step because:

1. The root package.json and tsconfig.json weren't copied
2. The shared package wasn't built before the other packages
3. npm workspaces weren't handled correctly

## What's Fixed

✓ Dockerfiles now handle monorepo structure
✓ Build order: shared → web/api
✓ Proper workspace dependency installation
✓ Added fallback for packages without build scripts

## How to Use These Fixed Files

### Option 1: Replace Files in Your Repo

1. Extract this zip
2. Copy all files to your kirby-gen repository root:
   ```bash
   cd /path/to/kirby-gen
   cp /path/to/extracted/* .
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Fix: Corrected Dockerfiles for monorepo structure"
   git push origin main
   ```
4. In Coolify, click "Redeploy" on your kirby-gen resource

### Option 2: Quick Test (Without Committing)

In Coolify, you can edit the Dockerfiles directly:
1. Go to your kirby-gen resource
2. Click "Source" tab
3. Edit each Dockerfile
4. Save and redeploy

## Files Included

```
kirby-gen-deployment/
├── docker-compose.production.yml    (same as before)
├── Dockerfile.web                   (FIXED - handles monorepo)
├── Dockerfile.api                   (FIXED - handles monorepo)
├── Dockerfile.skills                (same as before)
├── packages/
│   └── web/
│       └── nginx.conf              (same as before)
└── FIXED-README.md                 (this file)
```

## Key Changes in Dockerfiles

### Dockerfile.web (FIXED)
- Now copies root package.json and tsconfig.json
- Builds shared package first
- Handles workspace dependencies properly

### Dockerfile.api (FIXED)
- Same monorepo fixes as Dockerfile.web
- Properly copies built shared package to production stage

## After Deploying

Your kirby-gen app will be accessible at:
- Web: http://YOUR_SERVER_IP:5173
- API: http://YOUR_SERVER_IP:3000
- Skills: http://YOUR_SERVER_IP:8001

Or if you set a domain in Coolify:
- https://kirby.yourdomain.com

## Troubleshooting

If build still fails:
1. Check Coolify logs for specific error
2. Make sure CLAUDE_API_KEY is set in Environment Variables
3. Verify all source files are committed to your repo
4. Try "Clean Build" in Coolify (deletes cache)

## Next Steps

After successful deployment:
1. Test the web interface
2. Verify API is responding
3. Set up domain/SSL (optional)
4. Deploy other apps (SiYuan, Excalidraw, etc.)

---

Created: 2025-11-20
Issue: Monorepo build failure
Status: FIXED
