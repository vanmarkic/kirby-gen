/**
 * Transform domain model to Kirby blueprints
 * Usage: npx ts-node scripts/transform-domain-to-blueprints.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { BlueprintGenerator } from '../../kirby-generator/src/adapters/kirby/blueprint-generator';

const INPUT_FILE = path.join(__dirname, '../data/claude-output/manual-flow/01-domain-model.json');
const OUTPUT_DIR = path.join(__dirname, '../data/claude-output/manual-flow/blueprints');

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 TRANSFORMING DOMAIN MODEL TO KIRBY BLUEPRINTS');
  console.log('='.repeat(80) + '\n');

  // Read domain model
  console.log(`📖 Reading domain model from: ${path.relative(process.cwd(), INPUT_FILE)}`);
  const domainModelJson = await fs.readFile(INPUT_FILE, 'utf-8');
  const domainModel = JSON.parse(domainModelJson);

  console.log(`✅ Loaded domain model with ${domainModel.entities.length} entities\n`);

  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Generate blueprints
  const generator = new BlueprintGenerator();
  const generatedFiles: string[] = [];

  for (const entity of domainModel.entities) {
    console.log(`🔨 Generating blueprint for: ${entity.name}`);

    const blueprint = generator.generateBlueprint(entity);
    const filename = `${entity.id}.yml`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(filepath, blueprint, 'utf-8');
    generatedFiles.push(filename);

    console.log(`   ✅ Saved: blueprints/${filename}`);
  }

  // Create README
  console.log(`\n📋 Creating README...`);

  const readme = `# Kirby Blueprints - Generated from Domain Model

**Source:** ${path.basename(INPUT_FILE)}
**Generated:** ${new Date().toISOString()}
**Entities:** ${domainModel.entities.length}

## Files Generated

${generatedFiles.map(f => `- \`${f}\``).join('\n')}

## Domain Model Summary

**Name:** ${domainModel.metadata.name}
**Description:** ${domainModel.metadata.description}
**Version:** ${domainModel.version}

### Entities

${domainModel.entities.map((entity: any, idx: number) => `
#### ${idx + 1}. ${entity.name} (\`${entity.id}.yml\`)
- **Plural:** ${entity.pluralName}
- **Description:** ${entity.description || 'N/A'}
- **Fields:** ${entity.fields.length}
- **Icon:** ${entity.icon || 'N/A'}
- **Sortable:** ${entity.sortable ? 'Yes' : 'No'}
`).join('\n')}

### Relationships

${domainModel.relationships.map((rel: any, idx: number) => `
${idx + 1}. **${rel.from}** ${rel.label} **${rel.to}** (${rel.type})
`).join('\n')}

## Installation

To use these blueprints in a Kirby installation:

1. Copy all \`.yml\` files to your Kirby \`site/blueprints/pages/\` directory
2. Update the panel to see the new page types
3. Adjust field options and validation as needed

## Field Types Used

This blueprint uses the following Kirby field types:
- text
- textarea
- richtext
- date
- time
- select
- url
- gallery
- files
- image
- tags
- structure
- list

## Notes

- All fields have help text and placeholders
- Required fields are marked as required
- Field widths are optimized for the panel layout
- Relationships are defined but may need manual configuration in Kirby
`;

  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), readme, 'utf-8');
  console.log(`   ✅ Saved: README.md\n`);

  // Final summary
  console.log('='.repeat(80));
  console.log('✨ TRANSFORMATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📁 Output: ${path.relative(process.cwd(), OUTPUT_DIR)}`);
  console.log(`📊 Files: ${generatedFiles.length} blueprints + 1 README\n`);
}

main().catch(console.error);
