# Security Guide for Kirby-Gen

## Overview

This document outlines security measures implemented in Kirby-Gen and provides deployment guidelines to prevent Claude API abuse and unauthorized access.

## Security Architecture

### 1. Network Isolation (Skills Server)

**Implementation:** Docker network isolation prevents direct public access to the Claude API proxy.

**How it works:**
- Skills server runs on `internal` Docker network only
- API server bridges both `public` and `internal` networks
- Skills server has **no port mapping** to host machine
- Only API server can reach skills server via `http://skills:8001`

**Configuration:** See [docker-compose.production.yml](docker-compose.production.yml)

```yaml
networks:
  public:
    driver: bridge
  internal:
    driver: bridge
    internal: true  # Prevents external access
```

### 2. IP Whitelist (Defense in Depth)

**Implementation:** Application-level IP filtering in skills server.

**Location:** `packages/skills/src/middleware/ip_whitelist.py`

**Configuration:**
```bash
# Environment variables
ALLOWED_IPS=172.16.0.0/12,10.0.0.0/8,192.168.0.0/16  # Docker networks
ENABLE_IP_WHITELIST=true
```

Supports:
- Individual IPs: `192.168.1.100`
- CIDR notation: `10.0.0.0/8`
- Multiple entries: Comma-separated

### 3. Authentication System

**Default:** Disabled in development, **MUST be enabled in production**

**Implementation:** Token-based authentication with optional middleware

**Configuration:**
```bash
# Production settings
AUTH_ENABLED=true
AUTH_TOKEN=your-secure-random-token-here  # Generate with: openssl rand -hex 32
```

**Endpoints requiring auth:**
- `DELETE /api/projects/:projectId/generate` (cancel generation)
- Add more as needed using `authenticate` middleware

**Endpoints with optional auth:**
- `POST /api/projects/:projectId/generate` (start generation)
- All domain mapping endpoints
- Uses `optionalAuth` middleware

### 4. Rate Limiting

**Three-tier approach:**

#### Tier 1: General API (IP-based)
```typescript
// 100 requests per 15 minutes per IP
windowMs: 900000,
max: 100
```

#### Tier 2: File Uploads
```typescript
// 20 uploads per 15 minutes
windowMs: 900000,
max: 20
```

#### Tier 3: Generation (Strict)
```typescript
// 10 generations per hour
windowMs: 3600000,
max: 10
```

**Limitation:** IP-based rate limiting can be bypassed with VPN/proxies. Consider implementing user-based rate limiting for production.

### 5. Input Validation & Size Limits

**Protection against:** Excessive token usage and cost abuse

**Limits defined in:** `packages/api/src/middleware/validator.ts`

```typescript
export const CLAUDE_INPUT_LIMITS = {
  MAX_MESSAGE_LENGTH: 5000,        // characters per message
  MAX_CONVERSATION_HISTORY: 50,    // messages in conversation
  MAX_CONTENT_FILES: 20,           // files per request
  MAX_FIELD_COUNT: 100,            // fields per entity
}
```

Applied to:
- Domain model update endpoints
- File upload endpoints
- Claude conversation endpoints

## Deployment Security Checklist

### Pre-Deployment (CRITICAL)

- [ ] **Generate AUTH_TOKEN**
  ```bash
  openssl rand -hex 32
  ```

- [ ] **Set environment variables**
  ```bash
  AUTH_ENABLED=true
  AUTH_TOKEN=<generated-token>
  ALLOWED_IPS=<your-docker-network-cidrs>
  ENABLE_IP_WHITELIST=true
  ```

- [ ] **Configure CORS** (restrict to your domain)
  ```bash
  CORS_ORIGIN=https://your-domain.com
  ```

- [ ] **Set up Anthropic billing alerts**
  - Login to [console.anthropic.com](https://console.anthropic.com)
  - Navigate to Settings > Billing
  - Set alerts: $50, $100, $200, $500
  - Set hard spending limit (if available)

### Network Security

- [ ] Skills server has **no public port mapping**
- [ ] Skills server only on `internal` network
- [ ] API server uses internal service name: `http://skills:8001`
- [ ] IP whitelist enabled in skills server
- [ ] Test: Public cannot reach skills server on port 8001
- [ ] Test: API can reach skills via internal network

### Application Security

- [ ] Authentication enabled (`AUTH_ENABLED=true`)
- [ ] Strong auth token set (32+ random characters)
- [ ] Rate limiting configured (strict for production)
- [ ] Input validation limits applied
- [ ] CORS restricted to your domain
- [ ] Helmet.js security headers enabled
- [ ] No secrets in git history
- [ ] `.env` file in `.gitignore`

### Monitoring

- [ ] Logging configured and working
- [ ] Cost tracking enabled
- [ ] Error alerting set up
- [ ] Anthropic dashboard monitored regularly
- [ ] Review logs for suspicious activity

## Testing Security Configuration

### Test 1: Skills Server Isolation
```bash
# From public internet (should FAIL)
curl http://your-server-ip:8001/health
# Expected: Connection refused or timeout

# From inside API container (should SUCCEED)
docker exec kirby-gen-api curl http://skills:8001/health
# Expected: {"status": "healthy"}
```

### Test 2: Authentication
```bash
# Without token (should FAIL if AUTH_ENABLED=true)
curl -X POST http://your-domain/api/projects/123/generate
# Expected: 401 Unauthorized

# With valid token (should SUCCEED)
curl -X POST http://your-domain/api/projects/123/generate \
  -H "X-Auth-Token: your-token-here"
# Expected: 200 OK
```

### Test 3: Rate Limiting
```bash
# Make 11 generation requests quickly (11th should FAIL)
for i in {1..11}; do
  curl -X POST http://your-domain/api/projects/123/generate
done
# Expected: Last request returns 429 Too Many Requests
```

### Test 4: Input Validation
```bash
# Try to send oversized domain model (should FAIL)
curl -X PUT http://your-domain/api/projects/123/domain-model \
  -H "Content-Type: application/json" \
  -d '{"domainModel": {"entities": [/* 101 entities */]}}'
# Expected: 400 Bad Request - "Too many entities"
```

## Security Incident Response

### If API Costs Spike

1. **Check Anthropic dashboard** for usage patterns
2. **Review API logs** for unusual activity:
   ```bash
   docker logs kirby-gen-api | grep "Claude API"
   ```
3. **Identify source**: Check IP addresses and auth tokens
4. **Block immediately**: Remove compromised AUTH_TOKEN, restart services
5. **Update credentials**: Generate new AUTH_TOKEN
6. **Report**: Document incident and implement additional safeguards

### If Unauthorized Access Detected

1. **Rotate AUTH_TOKEN immediately**
2. **Review all recent activity** in logs
3. **Check for data exfiltration**
4. **Update IP whitelist** if needed
5. **Consider adding user-based quotas**

## Cost Monitoring

### Anthropic API Pricing (as of Nov 2025)

| Model | Input Tokens | Output Tokens |
|-------|-------------|---------------|
| Claude 3.5 Sonnet | $3 / 1M | $15 / 1M |
| Claude Opus 4 | $15 / 1M | $75 / 1M |

### Expected Costs

**Per Generation:**
- Domain mapping: ~5,000 tokens (~$0.02-0.10)
- Content structuring: ~10,000 tokens (~$0.05-0.20)
- Design automation: ~3,000 tokens (~$0.01-0.05)
- **Total per site: ~$0.10-0.40**

**Monthly estimates:**
- 10 sites/day: ~$30-120/month
- 50 sites/day: ~$150-600/month
- 100 sites/day: ~$300-1200/month

### Cost Protection Measures

**Implemented:**
- ✅ Network isolation (prevents direct abuse)
- ✅ IP whitelist (defense in depth)
- ✅ Rate limiting (10 gen/hour per IP)
- ✅ Input size limits (prevent token abuse)
- ✅ Authentication required (production)

**Recommended (Future):**
- ⏳ User-based quotas (daily/monthly limits per user)
- ⏳ Cost tracking per user/project
- ⏳ Auto-suspend on threshold breach
- ⏳ CAPTCHA on generation endpoints
- ⏳ Usage dashboard for admins

## Future Security Enhancements

### Phase 2: User Management
- JWT-based authentication
- User accounts and sessions
- Per-user quotas and tracking
- OAuth integration (Google, GitHub)

### Phase 3: Advanced Monitoring
- Anomaly detection (unusual usage patterns)
- Audit logging (comprehensive trail)
- Real-time alerts (Slack, email)
- Usage dashboard (Grafana, custom)

### Phase 4: Enterprise Features
- Team accounts and permissions
- SSO integration
- Advanced rate limiting (per-user, per-team)
- Cost allocation and billing

## Support

For security issues or questions:
- Create an issue: [GitHub Issues](https://github.com/your-org/kirby-gen/issues)
- Email: security@your-domain.com
- Do NOT post API keys or sensitive data publicly

## References

- [Anthropic API Documentation](https://docs.anthropic.com)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
