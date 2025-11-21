/**
 * Complete flow test: Description → Domain Model → Kirby Blueprint
 *
 * This test demonstrates the full transformation pipeline:
 * 1. Call domain-mapping-test endpoint with a description
 * 2. Save the domain model to file
 * 3. Transform domain model to Kirby blueprints
 * 4. Save blueprints to files
 */

import fs from 'fs/promises';
import path from 'path';
import { BlueprintGenerator } from '../../../kirby-generator/src/adapters/kirby/blueprint-generator';

// Define types locally since @kirby-gen/shared import doesn't work
interface ContentSchema {
  version: string;
  entities: EntitySchema[];
  relationships: RelationshipSchema[];
  metadata: {
    name: string;
    description?: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface EntitySchema {
  id: string;
  name: string;
  pluralName: string;
  description?: string;
  displayField?: string;
  icon?: string;
  sortable?: boolean;
  timestamps?: boolean;
  slugSource?: string;
  fields: FieldSchema[];
}

interface FieldSchema {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  width?: string;
  options?: any;
  validation?: any;
}

interface RelationshipSchema {
  id: string;
  type: string;
  from: string;
  to: string;
  label: string;
  inversLabel?: string;
  required?: boolean;
  cascadeDelete?: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: {
    domainModel: ContentSchema;
    contentSchema: ContentSchema;
  };
  error?: {
    code: string;
    message: string;
    details: any;
  };
  metadata: {
    duration: number;
    test_mode?: boolean;
    entities_count?: number;
    relationships_count?: number;
  };
}

// Test output directory
const OUTPUT_DIR = path.join(__dirname, '../../data/claude-output/complete-flow-test');

describe('Complete Flow: Domain Mapping → Kirby Blueprints', () => {
  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  });

  it('should transform description → domain model → Kirby blueprints and save all outputs', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 STARTING COMPLETE TRANSFORMATION FLOW');
    console.log('='.repeat(80) + '\n');

    // STEP 1: Call domain-mapping-test endpoint
    console.log('📝 STEP 1: Generating domain model from description...\n');

    const description = `
I'm a musician playing gigs. I want to showcase both upcoming and past gigs with:
- Venue name and location
- Date and time
- Ticket links for upcoming shows
- Photos and videos from performances

I also need:
- A bio/about section for my artist profile
- Discography section with albums and singles
- Music samples (audio clips)
- Band members showcase with their roles and photos
`;

    const requestBody = {
      description: description.trim(),
      profession: 'musician'
    };

    // Save the input description
    await fs.writeFile(
      path.join(OUTPUT_DIR, '01-input-description.txt'),
      description.trim(),
      'utf-8'
    );
    console.log('✅ Saved: 01-input-description.txt\n');

    // Call the test endpoint
    const response = await fetch('http://localhost:8001/skills/domain-mapping-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json() as ApiResponse;

    // Save the raw API response
    await fs.writeFile(
      path.join(OUTPUT_DIR, '02-api-response.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    console.log('✅ Saved: 02-api-response.json\n');

    // Check if successful
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.domainModel).toBeDefined();

    if (!result.data) {
      throw new Error('No data in response');
    }

    const domainModel: ContentSchema = result.data.domainModel;

    console.log(`📊 Domain Model Generated:`);
    console.log(`   - Version: ${domainModel.version}`);
    console.log(`   - Entities: ${domainModel.entities.length}`);
    console.log(`   - Relationships: ${domainModel.relationships.length}`);
    console.log(`   - Duration: ${result.metadata.duration.toFixed(2)}s\n`);

    // List entities
    console.log('📦 Entities:');
    domainModel.entities.forEach((entity: EntitySchema, idx: number) => {
      console.log(`   ${idx + 1}. ${entity.name} (${entity.fields.length} fields)`);
    });
    console.log();

    // STEP 2: Save the domain model
    console.log('💾 STEP 2: Saving domain model...\n');

    await fs.writeFile(
      path.join(OUTPUT_DIR, '03-domain-model.json'),
      JSON.stringify(domainModel, null, 2),
      'utf-8'
    );
    console.log('✅ Saved: 03-domain-model.json\n');

    // Create a readable summary
    const summary = `# Domain Model Summary

## Metadata
- Name: ${domainModel.metadata.name}
- Description: ${domainModel.metadata.description || 'N/A'}
- Version: ${domainModel.version}
- Created: ${domainModel.metadata.createdAt}

## Entities (${domainModel.entities.length})

${domainModel.entities.map((entity: EntitySchema, idx: number) => `
### ${idx + 1}. ${entity.name} (${entity.pluralName})
**Description:** ${entity.description || 'N/A'}
**Fields:** ${entity.fields.length}
${entity.fields.map((field: FieldSchema) => `  - ${field.label} (${field.name}): ${field.type}${field.required ? ' *required*' : ''}`).join('\n')}
`).join('\n')}

## Relationships (${domainModel.relationships.length})

${domainModel.relationships.map((rel: RelationshipSchema, idx: number) => `
${idx + 1}. **${rel.from}** ${rel.label} **${rel.to}** (${rel.type})
   - Inverse: ${rel.to} ${rel.inversLabel || 'belongs to'} ${rel.from}
   - Required: ${rel.required ? 'Yes' : 'No'}
   - Cascade Delete: ${rel.cascadeDelete ? 'Yes' : 'No'}
`).join('\n')}
`;

    await fs.writeFile(
      path.join(OUTPUT_DIR, '04-domain-model-summary.md'),
      summary,
      'utf-8'
    );
    console.log('✅ Saved: 04-domain-model-summary.md\n');

    // STEP 3: Transform to Kirby blueprints
    console.log('🔄 STEP 3: Transforming to Kirby blueprints...\n');

    const blueprintGenerator = new BlueprintGenerator();
    const blueprintsDir = path.join(OUTPUT_DIR, 'blueprints');
    await fs.mkdir(blueprintsDir, { recursive: true });

    // Generate blueprint for each entity
    const blueprintFiles: { entity: string; filename: string; path: string }[] = [];

    for (const entity of domainModel.entities) {
      console.log(`   🔨 Generating blueprint for ${entity.name}...`);

      const blueprint = blueprintGenerator.generateBlueprint(entity as any);
      const filename = `${entity.id}.yml`;
      const filepath = path.join(blueprintsDir, filename);

      await fs.writeFile(filepath, blueprint, 'utf-8');

      blueprintFiles.push({
        entity: entity.name,
        filename,
        path: filepath
      });

      console.log(`      ✅ Saved: blueprints/${filename}`);
    }
    console.log();

    // STEP 4: Create index file
    console.log('📋 STEP 4: Creating index of all generated files...\n');

    const index = `# Complete Transformation Flow - Test Output

**Generated:** ${new Date().toISOString()}
**Test:** domain-to-blueprint-complete-flow.test.ts

## Input
- \`01-input-description.txt\` - Original description from user

## Intermediate
- \`02-api-response.json\` - Raw response from domain-mapping-test endpoint
- \`03-domain-model.json\` - Extracted domain model (ContentSchema)
- \`04-domain-model-summary.md\` - Human-readable summary

## Output - Kirby Blueprints (${blueprintFiles.length} files)

${blueprintFiles.map(bf => `- \`blueprints/${bf.filename}\` - ${bf.entity} blueprint`).join('\n')}

## Statistics

### Domain Model
- Entities: ${domainModel.entities.length}
- Total Fields: ${domainModel.entities.reduce((sum: number, e: EntitySchema) => sum + e.fields.length, 0)}
- Relationships: ${domainModel.relationships.length}

### API Performance
- Duration: ${result.metadata.duration.toFixed(2)}s
- Model Used: ${result.metadata.test_mode ? 'Haiku (test mode)' : 'Unknown'}

## Entity Details

${domainModel.entities.map((entity: EntitySchema, idx: number) => `
### ${idx + 1}. ${entity.name}
- **Plural:** ${entity.pluralName}
- **Description:** ${entity.description || 'N/A'}
- **Fields:** ${entity.fields.length}
- **Display Field:** ${entity.displayField || 'N/A'}
- **Icon:** ${entity.icon || 'N/A'}
- **Sortable:** ${entity.sortable ? 'Yes' : 'No'}
- **Timestamps:** ${entity.timestamps ? 'Yes' : 'No'}
- **Slug Source:** ${entity.slugSource || 'N/A'}
- **Blueprint:** \`blueprints/${entity.id}.yml\`
`).join('\n')}

## Next Steps

1. Review the generated blueprints in the \`blueprints/\` directory
2. Copy blueprints to a Kirby installation: \`site/blueprints/pages/\`
3. Test in Kirby panel to ensure fields render correctly
4. Adjust field options and validation as needed
`;

    await fs.writeFile(
      path.join(OUTPUT_DIR, 'README.md'),
      index,
      'utf-8'
    );
    console.log('✅ Saved: README.md\n');

    // Final summary
    console.log('='.repeat(80));
    console.log('✨ TRANSFORMATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📁 Output Directory: ${OUTPUT_DIR}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Input: 1 description file`);
    console.log(`   - Domain Model: 1 JSON + 1 Markdown summary`);
    console.log(`   - Kirby Blueprints: ${blueprintFiles.length} YAML files`);
    console.log(`   - Total Files: ${4 + blueprintFiles.length + 1} (including README)\n`);

    console.log(`💡 Next: Review files in ${path.relative(process.cwd(), OUTPUT_DIR)}\n`);

    // Assertions
    expect(blueprintFiles.length).toBeGreaterThan(0);
    expect(blueprintFiles.length).toBe(domainModel.entities.length);
  }, 120000); // 2 minute timeout for API call
});
