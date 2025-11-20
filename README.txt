kirby-gen Deployment Configuration Files
========================================

This zip contains all necessary files to deploy kirby-gen on Hetzner with Coolify.

CONTENTS:
---------
1. docker-compose.production.yml - Multi-service orchestration
2. Dockerfile.web - React frontend container
3. Dockerfile.api - Node.js backend container  
4. Dockerfile.skills - Python FastAPI container
5. packages/web/nginx.conf - Web server configuration
6. DEPLOYMENT.md - Complete deployment guide

QUICK START:
-----------
1. Extract this zip to your kirby-gen repository root
2. Read DEPLOYMENT.md for step-by-step instructions
3. Add files to git and push
4. Deploy via Coolify

STRUCTURE:
----------
kirby-gen/
├── docker-compose.production.yml   (root)
├── Dockerfile.web                  (root)
├── Dockerfile.api                  (root)
├── Dockerfile.skills               (root)
├── DEPLOYMENT.md                   (root)
└── packages/
    └── web/
        └── nginx.conf              (add this file)

NEXT STEPS:
-----------
1. Extract all files to your kirby-gen directory
2. Commit to git: git add . && git commit -m "Add deployment config"
3. Push: git push origin main
4. Follow DEPLOYMENT.md for Coolify setup

COST: €13.50/month (Hetzner CPX31)
vs €50-80/month on Railway/Render

Questions? Check DEPLOYMENT.md or contact support.

Created: 2025-11-20
For: github.com/vanmarkic/kirby-gen
