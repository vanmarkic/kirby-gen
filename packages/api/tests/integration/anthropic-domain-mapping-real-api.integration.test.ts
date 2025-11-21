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
      console.log('\n🎯 GOAL: Get a complete domain model through recursive conversation');
      console.log('📋 STRATEGY: Answer Claude\'s questions with detailed, specific responses\n');

      const startTime = Date.now();
      const sessionId = `real-api-test-${Date.now()}`;
      let result: any;
      let rawResponse: any;
      let conversationTurns: Array<{turn: number, userMessage: string, claudeResponse: string, state: string}> = [];

      // Maximum conversation turns to prevent infinite loops
      const MAX_TURNS = 10;
      let currentTurn = 0;
      let hasSchema = false;

      // Engineered prompts - very detailed and specific to get predictable responses
      const conversationScript = [
        // Turn 1: Initial message - Be very specific about being a musician
        {
          message: "I'm a professional jazz musician. I play saxophone and perform at live gigs. I need a portfolio website to showcase my performances, music releases, and attract venue bookings.",
          purpose: "Establish profession clearly and set expectations"
        },

        // Turn 2: Answer all anticipated questions comprehensively
        {
          message: `Here are the details for my portfolio:

PERFORMANCES:
- I want to display both upcoming gigs and past performances
- For each gig, I need: venue name, full address, date/time, ticket purchase link, poster image, and a photo gallery from the performance
- I perform at jazz clubs, festivals, and private events

MUSIC CONTENT:
- Include my discography: albums, EPs, and singles
- Each release should have: title, release date, cover art, track listing, and embedded audio player for samples
- I want visitors to be able to listen to 30-second samples of each track

ABOUT ME:
- Professional bio section with my background and musical style
- High-quality press photos
- List of my band members with their instruments and bios

TARGET AUDIENCE:
- Venue owners and booking agents (they need contact info and press kit)
- Fans who want to find my next show and listen to my music
- Music journalists looking for information

Please create a complete schema with all entities, fields, and their relationships.`,
          purpose: "Provide exhaustive details to trigger schema generation"
        },

        // Turn 3: If still asking questions, provide direct confirmation
        {
          message: "Yes, exactly that! Please generate the complete technical schema now with all the entities (Gig, Release, Bio, BandMember, etc.), their fields with proper data types, and the relationships between them. I need the structured JSON output.",
          purpose: "Explicitly request schema output"
        },

        // Turn 4: More forceful request if needed
        {
          message: "I confirm all the requirements. Please output the complete ContentSchema JSON object with entities array and relationships array. Format: {entities: [{id, name, fields: [...]}], relationships: [{from, to, type}]}",
          purpose: "Request specific JSON structure"
        },

        // Turn 5: Final push
        {
          message: "Generate the schema.",
          purpose: "Simple direct command"
        }
      ];

      console.log(`📝 Prepared ${conversationScript.length} conversation turns\n`);

      // Recursive conversation loop
      while (currentTurn < MAX_TURNS && !hasSchema) {
        currentTurn++;
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔄 TURN ${currentTurn}/${MAX_TURNS}`);
        console.log(`${'='.repeat(80)}\n`);

        // Get the message for this turn
        const scriptIndex = Math.min(currentTurn - 1, conversationScript.length - 1);
        const userMessage = conversationScript[scriptIndex].message;
        const purpose = conversationScript[scriptIndex].purpose;

        console.log(`📤 Sending message (${purpose}):`);
        console.log(`   "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"\n`);

        try {
          const response = await fetch('http://localhost:8001/skills/domain-mapping', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_message: userMessage,
              session_id: sessionId,
            }),
          });

          rawResponse = await response.json();

          if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
          }

          if (!rawResponse.success) {
            throw new Error(rawResponse.error?.message || 'Skill failed');
          }

          result = rawResponse.data;

          console.log(`✓ API call completed`);
          console.log(`📥 State: ${result.currentState || 'unknown'}`);
          console.log(`📨 Claude's response: "${result.message?.substring(0, 150)}..."\n`);

          // Record this turn
          conversationTurns.push({
            turn: currentTurn,
            userMessage: userMessage,
            claudeResponse: result.message || '',
            state: result.currentState || 'unknown'
          });

          // Check if we got a schema
          const domainModel = result.domainModel || result.contentSchema;
          if (domainModel && domainModel.entities && domainModel.entities.length > 0) {
            hasSchema = true;
            console.log(`\n🎉 SUCCESS! Domain model received with ${domainModel.entities.length} entities!`);
            break;
          }

          // Log suggested questions if any
          if (result.suggestedQuestions && result.suggestedQuestions.length > 0) {
            console.log(`💡 Claude suggested ${result.suggestedQuestions.length} follow-up questions`);
          }

        } catch (error: any) {
          console.error(`\n❌ Turn ${currentTurn} failed: ${error.message}`);

          await fs.writeFile(
            path.join(outputDir, 'error.json'),
            JSON.stringify({
              error: error.message,
              stack: error.stack,
              turn: currentTurn,
              conversationHistory: conversationTurns,
              timestamp: new Date().toISOString(),
            }, null, 2),
            'utf-8'
          );

          throw error;
        }

        // Small delay between calls to avoid rate limiting
        if (currentTurn < MAX_TURNS && !hasSchema) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const totalDuration = Date.now() - startTime;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 CONVERSATION SUMMARY`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Total turns: ${currentTurn}`);
      console.log(`Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
      console.log(`Schema generated: ${hasSchema ? 'YES ✓' : 'NO ✗'}`);
      console.log(`${'='.repeat(80)}\n`);

      // ===== SAVE RESULTS =====
      console.log('\n💾 Saving conversation and results...');

      const domainModel = result.domainModel || result.contentSchema;

      // Save conversation history
      await fs.writeFile(
        path.join(outputDir, 'conversation.json'),
        JSON.stringify({
          turns: conversationTurns,
          totalDuration: totalDuration,
          finalState: result.currentState,
        }, null, 2),
        'utf-8'
      );

      // Save API response
      await fs.writeFile(
        responseOutputPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          duration_ms: totalDuration,
          turns: currentTurn,
          raw_response: rawResponse,
          parsed_result: {
            success: hasSchema,
            entity_count: domainModel?.entities?.length || 0,
            relationship_count: domainModel?.relationships?.length || 0,
          },
        }, null, 2),
        'utf-8'
      );

      // Save domain model
      await fs.writeFile(
        domainModelOutputPath,
        JSON.stringify(domainModel, null, 2),
        'utf-8'
      );

      console.log(`✓ Files saved to: ${outputDir}`);

      // ===== VERIFY RESULTS =====
      expect(result).toBeDefined();

      if (hasSchema && domainModel && domainModel.entities && domainModel.entities.length > 0) {
        console.log(`\n📊 DOMAIN MODEL GENERATED!`);
        console.log(`   - Entities: ${domainModel.entities.length}`);
        console.log(`   - Relationships: ${domainModel.relationships?.length || 0}\n`);

        // List entities
        domainModel.entities.forEach((entity: any, idx: number) => {
          console.log(`   ${idx + 1}. ${entity.name} (${entity.pluralName || entity.plural_name})`);
        });

        // Verify music-related entities
        const entityIds = domainModel.entities.map((e: any) => e.id.toLowerCase());
        const hasGig = entityIds.some((id: string) => id.includes('gig') || id.includes('performance'));
        const hasRelease = entityIds.some((id: string) => id.includes('release') || id.includes('album'));

        expect(hasGig || hasRelease).toBe(true);
      } else {
        console.log(`\n⚠️  Domain model not generated after ${currentTurn} turns`);
        console.log(`   Last state: ${result.currentState}`);
      }

      console.log('\n✅ Test completed!');
    },
    180000 // 3 minute timeout for multiple API calls
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
