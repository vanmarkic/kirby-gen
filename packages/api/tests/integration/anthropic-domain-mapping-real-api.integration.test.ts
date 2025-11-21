/**
 * Integration Test: Real Anthropic API → Domain Mapping
 * Tests the flow from conversation prompt file through REAL Claude API to domain model
 * IMPORTANT: This test makes real API calls and incurs costs. Run manually when needed.
 *
 * To run this test:
 * 1. Set ANTHROPIC_API_KEY environment variable
 * 2. Run: npm test -- tests/integration/anthropic-domain-mapping-real-api.integration.test.ts
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { config } from 'dotenv';
import { skillClient } from '../../src/workflow/skill-client';

// Load environment variables from root .env file
const envPath = path.resolve(__dirname, '../../../../.env');
console.log('Loading .env from:', envPath);
const dotenvResult = config({ path: envPath });
if (dotenvResult.error) {
  console.warn('⚠️  Could not load .env file:', dotenvResult.error.message);
} else {
  console.log('✓ .env file loaded successfully');
}

// Skip this test by default to avoid accidental API charges
const ENABLE_REAL_API_TEST = process.env.ENABLE_REAL_API_TEST === 'true';

describe('Real Anthropic API to Domain Mapping Integration', () => {
  const promptFilePath = path.join(
    __dirname,
    '../../data/claude-output/session-1763698560040-prompt.txt'
  );

  const outputDir = path.join(__dirname, '../../data/claude-output/real-api-test');
  const promptOutputPath = path.join(outputDir, 'sent-prompt.txt');
  const responseOutputPath = path.join(outputDir, 'api-response.json');
  const domainModelOutputPath = path.join(outputDir, 'domain-model.json');

  beforeAll(async () => {
    // Create output directory
    await fs.ensureDir(outputDir);

    // Check for API key (supports both ANTHROPIC_API_KEY and CLAUDE_API_KEY)
    if (ENABLE_REAL_API_TEST) {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      const claudeKey = process.env.CLAUDE_API_KEY;
      const apiKey = anthropicKey || claudeKey;

      console.log(`\nAPI Key check:`);
      console.log(`  - ANTHROPIC_API_KEY present: ${!!anthropicKey ? 'YES' : 'NO'}`);
      console.log(`  - CLAUDE_API_KEY present: ${!!claudeKey ? 'YES' : 'NO'}`);
      console.log(`  - Using key from: ${anthropicKey ? 'ANTHROPIC_API_KEY' : claudeKey ? 'CLAUDE_API_KEY' : 'NONE'}`);

      if (!apiKey) {
        console.error('\n❌ No API key found!');
        console.error('   Please set one of these environment variables:');
        console.error('   - ANTHROPIC_API_KEY=sk-ant-your-key-here');
        console.error('   - CLAUDE_API_KEY=sk-ant-your-key-here\n');

        throw new Error(
          'API key required for real API tests. Set ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable.'
        );
      }

      // Set ANTHROPIC_API_KEY if only CLAUDE_API_KEY is present (for compatibility)
      if (claudeKey && !anthropicKey) {
        process.env.ANTHROPIC_API_KEY = claudeKey;
      }

      console.log(`✓ API key loaded, ready to make real API call\n`);
    }
  });

  // Conditional test - only runs if explicitly enabled
  (ENABLE_REAL_API_TEST ? it : it.skip)(
    'should call real Anthropic API and transform conversation to domain model',
    async () => {
      // ===== STEP 1: Read the conversation prompt file =====
      console.log('\n📖 Reading conversation prompt file...');
      expect(await fs.pathExists(promptFilePath)).toBe(true);
      const promptContent = await fs.readFile(promptFilePath, 'utf-8');

      // Verify we have the musician conversation
      expect(promptContent).toContain("i'm a musician playing gigs");
      console.log('✓ Prompt file loaded successfully');

      // ===== STEP 2: Save the prompt that will be sent =====
      console.log('\n💾 Saving prompt to output directory...');
      await fs.writeFile(promptOutputPath, promptContent, 'utf-8');
      console.log(`✓ Prompt saved to: ${promptOutputPath}`);

      // ===== STEP 3: Call Domain Mapping Skill with REAL API =====
      console.log('\n🚀 Calling Anthropic API via skills server...');
      console.log('⚠️  This will incur API costs!');

      const startTime = Date.now();

      let result;
      let rawResponse;

      try {
        // Intercept the actual fetch to capture the response
        const originalFetch = global.fetch;
        global.fetch = jest.fn(async (input: any, init?: any) => {
          const response = await originalFetch(input, init);

          // Clone response to read it twice
          const clonedResponse = response.clone();
          rawResponse = await clonedResponse.json();

          return response;
        }) as any;

        result = await skillClient.domainMapping({
          contentFiles: [
            {
              path: promptFilePath,
              filename: 'session-1763698560040-prompt.txt',
              mimeType: 'text/plain',
            },
          ],
        });

        // Restore original fetch
        global.fetch = originalFetch;

      } catch (error: any) {
        console.error('\n❌ API call failed:', error.message);

        // Save error details
        await fs.writeFile(
          path.join(outputDir, 'error.json'),
          JSON.stringify(
            {
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf-8'
        );

        throw error;
      }

      const duration = Date.now() - startTime;
      console.log(`✓ API call completed in ${duration}ms`);

      // ===== STEP 4: Save API Response =====
      console.log('\n💾 Saving API response...');

      const responseData = {
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        raw_response: rawResponse,
        parsed_result: {
          success: !!result.domainModel,
          entity_count: result.domainModel?.entities?.length || 0,
          relationship_count: result.domainModel?.relationships?.length || 0,
        },
      };

      await fs.writeFile(
        responseOutputPath,
        JSON.stringify(responseData, null, 2),
        'utf-8'
      );
      console.log(`✓ API response saved to: ${responseOutputPath}`);

      // ===== STEP 5: Save Domain Model =====
      console.log('\n💾 Saving domain model...');
      await fs.writeFile(
        domainModelOutputPath,
        JSON.stringify(result.domainModel, null, 2),
        'utf-8'
      );
      console.log(`✓ Domain model saved to: ${domainModelOutputPath}`);

      // ===== STEP 6: Verify Domain Model =====
      console.log('\n✅ Verifying domain model structure...');

      expect(result.domainModel).toBeDefined();
      expect(result.domainModel.entities).toBeDefined();
      expect(Array.isArray(result.domainModel.entities)).toBe(true);
      expect(result.domainModel.entities.length).toBeGreaterThan(0);

      console.log(`\n📊 Domain Model Summary:`);
      console.log(`   - Total entities: ${result.domainModel.entities.length}`);
      console.log(`   - Total relationships: ${result.domainModel.relationships?.length || 0}`);

      // List all entities
      console.log(`\n📋 Generated Entities:`);
      result.domainModel.entities.forEach((entity: any, idx: number) => {
        console.log(`   ${idx + 1}. ${entity.name} (${entity.pluralName})`);
        console.log(`      - Fields: ${entity.fields?.length || 0}`);
        if (entity.description) {
          console.log(`      - Description: ${entity.description}`);
        }
      });

      // List relationships if any
      if (result.domainModel.relationships && result.domainModel.relationships.length > 0) {
        console.log(`\n🔗 Relationships:`);
        result.domainModel.relationships.forEach((rel: any, idx: number) => {
          console.log(`   ${idx + 1}. ${rel.from} → ${rel.to} (${rel.type})`);
        });
      }

      // Verify specific entities for musician portfolio
      const entityIds = result.domainModel.entities.map((e: any) => e.id.toLowerCase());

      console.log(`\n🎵 Musician Portfolio Validation:`);

      // Check for expected entities (be flexible with naming)
      const hasGigEntity = entityIds.some((id: string) =>
        id.includes('gig') || id.includes('performance') || id.includes('show')
      );
      const hasReleaseEntity = entityIds.some((id: string) =>
        id.includes('release') || id.includes('album') || id.includes('music')
      );
      const hasArtistEntity = entityIds.some((id: string) =>
        id.includes('artist') || id.includes('profile') || id.includes('bio')
      );

      console.log(`   ${hasGigEntity ? '✓' : '✗'} Has gig/performance entity`);
      console.log(`   ${hasReleaseEntity ? '✓' : '✗'} Has release/album entity`);
      console.log(`   ${hasArtistEntity ? '✓' : '✗'} Has artist/profile entity`);

      // At least one music-related entity should exist
      expect(hasGigEntity || hasReleaseEntity || hasArtistEntity).toBe(true);

      console.log('\n✅ Real API test completed successfully!');
      console.log(`\n📁 Output files saved to: ${outputDir}`);
      console.log(`   - Prompt: sent-prompt.txt`);
      console.log(`   - Response: api-response.json`);
      console.log(`   - Domain Model: domain-model.json`);

    },
    120000 // 2 minute timeout for real API call
  );

  it('should skip real API test by default to avoid costs', () => {
    if (!ENABLE_REAL_API_TEST) {
      console.log('\n⏭️  Skipping real API test (costs money!)');
      console.log('   To enable: export ENABLE_REAL_API_TEST=true');
      console.log('   Make sure ANTHROPIC_API_KEY is set in .env');
    }
    expect(true).toBe(true);
  });
});
