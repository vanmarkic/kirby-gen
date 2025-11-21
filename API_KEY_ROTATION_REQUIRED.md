# ⚠️ IMMEDIATE ACTION REQUIRED: API Key Rotation

**Date:** 2025-11-21
**Status:** CRITICAL - Key was exposed in git history

## What Happened

An Anthropic API key was accidentally committed in `packages/skills/start-server.sh` (commit f429284).

## Actions Taken

✅ Removed `start-server.sh` from ALL git history using git-filter-repo
✅ Created `.env.example` template for proper configuration
✅ Updated `.gitignore` to prevent future exposure
✅ Modified script to load from `.env` file instead

## Required Actions

### 1. Rotate the API Key NOW

**The exposed key must be revoked immediately:**

```
Exposed key: sk-ant-api03-scJWIohg3EDJU2i...K4BEw-KUS1XQAA
```

**Steps:**
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Go to API Keys section
3. **Revoke** the exposed key
4. **Generate** a new API key
5. Update `packages/skills/.env` with new key:
   ```bash
   CLAUDE_API_KEY=your_new_key_here
   ```
6. Update `packages/api/.env` if it shares the same key

### 2. Verify History is Clean

```bash
# This should return no results
git log -p -S "sk-ant-api" --all
```

✅ Verified: No API keys found in history

### 3. Force Push the Cleaned History

```bash
# WARNING: This rewrites history - coordinate with team
git push origin master --force
```

**Note:** Since history was rewritten, all team members will need to:
```bash
git fetch origin
git reset --hard origin/master
```

## Prevention Measures

✅ `.env.example` created - template for environment variables
✅ `.gitignore` updated - explicitly ignores `.env` files
✅ Script refactored - loads from `.env` instead of hardcoding

### Optional: Install git-secrets

Prevent future secret commits:
```bash
brew install git-secrets
cd /Users/dragan/Documents/kirby-gen
git secrets --install
git secrets --add 'sk-ant-api[0-9a-zA-Z\-_]+'
```

## Timeline

- Commit f429284: API key committed
- 2025-11-21: Detected during push to GitHub
- 2025-11-21: History cleaned with git-filter-repo
- **PENDING**: API key rotation

---

**Next Step:** Rotate the API key at https://console.anthropic.com/ before pushing!
