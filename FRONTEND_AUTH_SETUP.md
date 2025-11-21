# Frontend Authentication Setup

## Quick Setup Guide

The frontend now automatically sends the `AUTH_TOKEN` with every API request.

## Local Development

### Option 1: No Auth (Simplest)

**Backend:**
```bash
# packages/api/.env or root .env
AUTH_ENABLED=false
```

**Frontend:**
```bash
# packages/web/.env (no token needed)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

Frontend works without authentication.

---

### Option 2: With Auth (Testing production setup)

**Backend:**
```bash
# Generate token
openssl rand -hex 32

# Set in .env
AUTH_ENABLED=true
AUTH_TOKEN=<generated-token>
```

**Frontend:**
```bash
# packages/web/.env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_AUTH_TOKEN=<same-token-as-backend>
```

---

## Production Deployment (Coolify)

### Step 1: Generate Token

```bash
openssl rand -hex 32
# Example output: c1017a6e1737024c2c6d71e87a6febb6d1623e11b61b948759300d59d2a126be
```

### Step 2: Set Environment Variables in Coolify

In Coolify resource settings → Environment Variables:

```bash
# Required
CLAUDE_API_KEY=sk-ant-xxxxx
NODE_ENV=production

# Authentication (CRITICAL)
AUTH_ENABLED=true
AUTH_TOKEN=c1017a6e1737024c2c6d71e87a6febb6d1623e11b61b948759300d59d2a126be

# Frontend will use the same token
# (passed automatically via docker-compose)
```

**Important:** The `AUTH_TOKEN` is shared between API and Web services automatically via `docker-compose.production.yml`.

### Step 3: Deploy

Coolify will:
1. Build web service with `VITE_AUTH_TOKEN=${AUTH_TOKEN}`
2. Token gets baked into the frontend build
3. Frontend automatically sends token with every request

---

## How It Works

### Backend (API Server)

```typescript
// packages/api/src/middleware/auth.ts
export function optionalAuth(req, res, next) {
  if (!env.AUTH_ENABLED) {
    return next(); // Skip auth if disabled
  }

  const token = req.headers['x-auth-token'];
  if (token && token !== env.AUTH_TOKEN) {
    throw new UnauthorizedError('Invalid token');
  }

  next();
}
```

### Frontend (React)

```typescript
// packages/web/src/api/client.ts
apiClient.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_AUTH_TOKEN;
  if (token) {
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});
```

**Every API request automatically includes:**
```
X-Auth-Token: c1017a6e1737024c2c6d71e87a6febb6d1623e11b61b948759300d59d2a126be
```

---

## Security Notes

### ⚠️ Important: Token Visibility

The `AUTH_TOKEN` is **compiled into the frontend bundle**. This means:

✅ **Pros:**
- Simple to implement
- No login page needed
- Works for personal/small team use

⚠️ **Cons:**
- Anyone who accesses your site can extract the token
- Token visible in browser DevTools → Network tab
- Token visible in compiled JavaScript

**This is acceptable for:**
- Personal projects
- Internal tools
- Small teams
- Sites behind additional auth (Coolify basic auth)

**NOT suitable for:**
- Public applications
- Apps with sensitive data
- Multi-user platforms with quotas

---

## Additional Security Layers

### Option 1: Add Coolify Basic Auth

Add password protection at the proxy level:

**In Coolify:**
1. Go to your app → Settings → Security
2. Enable "Basic Authentication"
3. Set username/password

Now users need:
1. Proxy password (Coolify basic auth) ← First barrier
2. Then frontend loads with token ← Second barrier

### Option 2: IP Whitelist

Restrict access to specific IPs:

**In Coolify:**
1. Settings → Security → IP Whitelist
2. Add your office/home IP addresses

### Option 3: VPN/Tailscale

Deploy on private network:
- Only accessible via VPN
- Most secure for internal tools

---

## Testing Authentication

### Test 1: Without Token (Should Fail if AUTH_ENABLED=true)

```bash
curl -X POST http://your-domain/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Expected (if AUTH_ENABLED=true):
# {"success":false,"error":{"code":"UNAUTHORIZED",...}}
```

### Test 2: With Token (Should Work)

```bash
curl -X POST http://your-domain/api/projects \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: your-token-here" \
  -d '{"name":"Test"}'

# Expected:
# {"success":true,"data":{...}}
```

### Test 3: Frontend Works

1. Open your app in browser
2. Open DevTools → Network tab
3. Create a project
4. Check request headers → Should see `X-Auth-Token`

---

## Troubleshooting

### Frontend Gets 401 Unauthorized

**Cause:** Token mismatch or missing

**Fix:**
```bash
# 1. Check backend has AUTH_TOKEN set
echo $AUTH_TOKEN

# 2. Check frontend was built with token
docker-compose -f docker-compose.production.yml logs web | grep VITE_AUTH_TOKEN

# 3. Verify tokens match
# Backend: Check Coolify env vars
# Frontend: Check docker-compose build args
```

### Token Not Sent in Requests

**Cause:** Frontend built without token

**Fix:**
```bash
# Rebuild web service
docker-compose -f docker-compose.production.yml build --no-cache web
docker-compose -f docker-compose.production.yml up -d web
```

### Want to Change Token

**Steps:**
1. Generate new token: `openssl rand -hex 32`
2. Update in Coolify env vars: `AUTH_TOKEN=new-token`
3. Redeploy (Coolify auto-rebuild)
4. Both API and Web will use new token

---

## Future: Proper User Authentication

For multi-user applications, consider implementing:

### Phase 1: Login Page
- User enters password
- Token stored in sessionStorage
- Not visible in compiled code

### Phase 2: User Accounts
- Database with users
- JWT tokens per user
- Per-user quotas
- Session management

### Phase 3: OAuth
- Login with Google/GitHub
- No password management
- Social auth integration

See [SECURITY.md](SECURITY.md) for full authentication roadmap.

---

## Summary

| Environment | AUTH_ENABLED | VITE_AUTH_TOKEN | Security Level |
|-------------|--------------|-----------------|----------------|
| **Local Dev** | false | (empty) | 🟡 Low (dev only) |
| **Personal Prod** | true | Generated | 🟡 Medium (personal use) |
| **+ Coolify Auth** | true | Generated | 🟢 Good (small team) |
| **+ IP Whitelist** | true | Generated | 🟢 Good (trusted network) |
| **Future: User Auth** | true | Per-user JWT | 🟢 High (public app) |

---

**Last Updated:** 2025-11-21
**Status:** ✅ Implemented and ready for deployment
