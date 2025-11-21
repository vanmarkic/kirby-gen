# Real Anthropic API Integration Test

## Overview

This test makes **real API calls** to Anthropic's Claude API and incurs costs. It is designed to:

1. Read the conversation prompt from a real session file
2. Call the Anthropic API via the skills server
3. Save both the prompt and API response to files for inspection
4. Generate a domain model from the conversation
5. Validate the domain model structure

## ⚠️ Important Notes

- **This test costs money** - Each run makes real API calls to Anthropic
- The test is **skipped by default** to prevent accidental API charges
- Output files are saved to `packages/api/data/claude-output/real-api-test/`

## Prerequisites

1. **Skills server must be running**:
   ```bash
   cd packages/skills
   source venv/bin/activate
   npm run dev
   # Server should be running on http://localhost:8001
   ```

2. **Environment variables** must be set:
   ```bash
   # In packages/skills/.env
   ANTHROPIC_API_KEY=sk-ant-xxx...
   ```

3. **Verify setup**:
   ```bash
   # Check if skills server is running
   curl http://localhost:8001/health
   # Should return: {"status":"healthy"}
   ```

## Running the Test

### Option 1: Using Environment Variable

```bash
cd packages/api

# Enable the real API test for this run only
ENABLE_REAL_API_TEST=true npm test -- tests/integration/anthropic-domain-mapping-real-api.integration.test.ts
```

### Option 2: Export Environment Variable

```bash
cd packages/api

# Enable for current shell session
export ENABLE_REAL_API_TEST=true

# Run the test
npm test -- tests/integration/anthropic-domain-mapping-real-api.integration.test.ts

# Disable after testing
unset ENABLE_REAL_API_TEST
```

## What the Test Does

### 1. Reads Conversation Prompt
- Loads: `packages/api/data/claude-output/session-1763698560040-prompt.txt`
- This contains a real conversation about a musician's portfolio

### 2. Calls Anthropic API
- Sends the prompt to the skills server
- Skills server forwards to Anthropic's Claude API
- Intercepts and captures the raw API response

### 3. Saves Output Files
All files are saved to: `packages/api/data/claude-output/real-api-test/`

- **sent-prompt.txt** - The exact prompt sent to the API
- **api-response.json** - The complete raw API response
- **domain-model.json** - The parsed domain model
- **error.json** - Error details (if the call fails)

### 4. Validates Domain Model
The test verifies:
- Domain model was successfully generated
- Contains expected entities (Gig, Release, Artist, etc.)
- Has proper field structures
- Includes relationships between entities

## Expected Output

```
📖 Reading conversation prompt file...
✓ Prompt file loaded successfully

💾 Saving prompt to output directory...
✓ Prompt saved to: .../sent-prompt.txt

🚀 Calling Anthropic API via skills server...
⚠️  This will incur API costs!
✓ API call completed in 2543ms

💾 Saving API response...
✓ API response saved to: .../api-response.json

💾 Saving domain model...
✓ Domain model saved to: .../domain-model.json

✅ Verifying domain model structure...

📊 Domain Model Summary:
   - Total entities: 5
   - Total relationships: 4

📋 Generated Entities:
   1. Gig (Gigs)
      - Fields: 9
      - Description: A live music performance
   2. ArtistProfile (Artist Profiles)
      - Fields: 5
      - Description: Artist bio and information
   ...

🔗 Relationships:
   1. gig → photos (one-to-many)
   2. gig → videos (one-to-many)
   ...

🎵 Musician Portfolio Validation:
   ✓ Has gig/performance entity
   ✓ Has release/album entity
   ✓ Has artist/profile entity

✅ Real API test completed successfully!

📁 Output files saved to: .../real-api-test
   - Prompt: sent-prompt.txt
   - Response: api-response.json
   - Domain Model: domain-model.json
```

## Troubleshooting

### Skills Server Not Running
```
Error: connect ECONNREFUSED ::1:8001
```
**Solution**: Start the skills server:
```bash
cd packages/skills
source venv/bin/activate
npm run dev
```

### Missing API Key
```
Error: ANTHROPIC_API_KEY environment variable is required
```
**Solution**: Add API key to `packages/skills/.env`:
```
ANTHROPIC_API_KEY=sk-ant-xxx...
```

### Test Still Skipped
```
⏭️  Skipping real API test (costs money!)
```
**Solution**: Enable the test with the environment variable:
```bash
ENABLE_REAL_API_TEST=true npm test -- ...
```

## Cost Estimation

- Each test run makes 1 API call to Claude
- Typical prompt size: ~500 tokens
- Expected response: ~1500 tokens
- Estimated cost: ~$0.015 per run (Claude 3.5 Sonnet)

## Output File Structure

### sent-prompt.txt
```
You are an expert in domain modeling and content structure analysis...
[Complete prompt sent to API]
```

### api-response.json
```json
{
  "timestamp": "2025-11-21T05:30:00.000Z",
  "duration_ms": 2543,
  "raw_response": {
    "success": true,
    "data": {
      "domainModel": { ... }
    }
  },
  "parsed_result": {
    "success": true,
    "entity_count": 5,
    "relationship_count": 4
  }
}
```

### domain-model.json
```json
{
  "entities": [
    {
      "id": "gig",
      "name": "Gig",
      "pluralName": "Gigs",
      "fields": [ ... ]
    }
  ],
  "relationships": [ ... ]
}
```

## Cleanup

To remove test output files:
```bash
rm -rf packages/api/data/claude-output/real-api-test
```
