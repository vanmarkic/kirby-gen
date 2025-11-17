# Kirby CMS Adapter

Convert CMS-agnostic content schemas to production-ready Kirby CMS sites.

## Features

- **Complete ICMSAdapter Implementation** - Fully implements the CMS adapter interface
- **Blueprint Generation** - Generates Kirby YAML blueprints from generic schemas
- **Content File Generation** - Creates Kirby .txt content files with proper serialization
- **Template Generation** - PHP templates with atomic design structure
- **Design System Integration** - Converts design tokens to CSS custom properties
- **Site Scaffolding** - Complete Kirby installation with best practices
- **Field Type Mapping** - Intelligent mapping of generic to Kirby field types
- **Validation** - Schema validation with helpful warnings and suggestions

## Installation

```bash
npm install @kirby-gen/kirby-generator
```

## Quick Start

```typescript
import { KirbyCMSAdapter } from '@kirby-gen/kirby-generator';

// Initialize adapter
const adapter = new KirbyCMSAdapter({
  kirbyVersion: '4.0.0',
  enableDrafts: true,
  enablePreview: true,
});

// Generate complete site
const site = await adapter.generateSite({
  projectId: 'my-portfolio',
  schema,
  content,
  designSystem,
  outputPath: './output/kirby-site',
});

console.log('Site generated at:', site.sitePath);
```

## Components

### 1. **KirbyCMSAdapter** (Main Adapter)

The main adapter class implementing `ICMSAdapter`:

```typescript
const adapter = new KirbyCMSAdapter({
  kirbyVersion: '4.0.0',      // Kirby version
  enableDrafts: true,         // Enable draft status
  enablePreview: true,        // Enable preview functionality
  useTabLayout: true,         // Use tabs in blueprints
  includeDesignTokens: false, // Generate design token blueprint
  phpVersion: '8.0',          // PHP version for templates
  debugMode: false,           // Debug mode
});
```

**Methods:**
- `convertSchema(schema)` - Convert schema to blueprints
- `convertContent(content)` - Convert content to .txt files
- `convertDesignSystem(designSystem)` - Convert to CSS
- `generateSite(config)` - Generate complete site
- `validateSchema(schema)` - Validate schema compatibility

### 2. **FieldMapper**

Maps generic field types to Kirby field types:

```typescript
import { FieldMapper } from '@kirby-gen/kirby-generator';

const mapper = new FieldMapper();
const kirbyField = mapper.mapField(genericField);
```

**Field Type Mapping:**

| Generic → Kirby | Notes |
|-----------------|-------|
| `text` → `text` | Single-line text |
| `richtext` → `writer` | Rich text editor |
| `markdown` → `markdown` | Markdown editor |
| `boolean` → `toggle` | Toggle switch |
| `image` → `files` | File field with max: 1 |
| `structure` → `structure` | Repeatable fields |
| `blocks` → `blocks` | Block editor |
| `relation` → `pages` | Page selector |

### 3. **BlueprintGenerator**

Generates Kirby blueprint YAML files:

```typescript
import { BlueprintGenerator } from '@kirby-gen/kirby-generator';

const generator = new BlueprintGenerator({
  enableDrafts: true,
  enablePreview: true,
  useTabLayout: true,
});

const yaml = generator.generateBlueprint(entity);
```

**Features:**
- Tab-based or column-based layouts
- Status management (draft/published/unlisted)
- Field grouping and organization
- Design token blueprints
- Site blueprint generation

### 4. **ContentGenerator**

Generates Kirby .txt content files:

```typescript
import { ContentGenerator } from '@kirby-gen/kirby-generator';

const generator = new ContentGenerator({
  dateFormat: 'Y-m-d H:i:s',
  booleanFormat: 'true/false',
  includeMetadata: true,
});

const contentFile = generator.generateContentFile(item, entitySchema);
```

**Features:**
- Proper field serialization
- Multiline field handling
- Structure/list serialization
- Slug generation
- Metadata inclusion

### 5. **TemplateGenerator**

Generates PHP templates:

```typescript
import { TemplateGenerator } from '@kirby-gen/kirby-generator';

const generator = new TemplateGenerator({
  useAtomicDesign: true,
  includeComments: true,
  phpVersion: '8.0',
  useStrictTypes: true,
});

const template = await generator.generateTemplate(entity);
```

**Generated Templates:**
- Entity-specific templates
- Default template
- Home template
- Snippets (header, footer, card, etc.)

### 6. **ThemeGenerator**

Generates CSS with design tokens:

```typescript
import { ThemeGenerator } from '@kirby-gen/kirby-generator';

const generator = new ThemeGenerator({
  cssVariablePrefix: '--',
  includeUtilities: true,
  includeReset: true,
});

const cssFiles = generator.generateTheme(designSystem);
```

**Generated Files:**
- `theme.css` - CSS custom properties
- `base.css` - Base styles and typography
- `utilities.css` - Utility classes
- `main.css` - Main import file

### 7. **SiteScaffolder**

Scaffolds complete Kirby installation:

```typescript
import { SiteScaffolder } from '@kirby-gen/kirby-generator';

const scaffolder = new SiteScaffolder({
  installKirby: true,
  kirbyVersion: '4.0.0',
  createGitignore: true,
  createHtaccess: true,
  setupPanel: true,
});

const files = scaffolder.generateSiteStructure();
```

**Generated Files:**
- `index.php` - Entry point
- `site/config/config.php` - Configuration
- `.gitignore` - Git ignore rules
- `.htaccess` - Apache configuration
- `README.md` - Documentation
- `composer.json` - PHP dependencies

## Examples

See the `examples/` directory for complete examples:

- **`portfolio-schema.json`** - Example schema
- **`expected-outputs/`** - Example generated files
- **`usage.ts`** - Usage examples
- **`README.md`** - Detailed documentation

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
```

## Field Type Support

### Fully Supported
- Text fields (text, textarea, richtext, markdown)
- Numbers (number, range)
- Booleans (toggle)
- Choices (select, multiselect, radio, checkboxes)
- Dates (date, time)
- Media (image, file, gallery, files)
- Structured data (structure, list, blocks)
- Relations (pages)
- Special (url, email, tel, color, tags)

### Requires Custom Implementation
- `location` - Needs custom field plugin
- `json` - Stored as text, custom field recommended
- `unique` validation - Requires custom hook

## Generated Directory Structure

```
kirby-site/
├── index.php
├── site/
│   ├── blueprints/
│   │   ├── site.yml
│   │   └── pages/
│   ├── templates/
│   ├── snippets/
│   ├── config/
│   └── plugins/
├── content/
├── assets/
│   ├── css/
│   └── js/
└── media/
```

## Configuration Options

### KirbyAdapterOptions

```typescript
interface KirbyAdapterOptions {
  kirbyVersion?: string;        // Default: '4.0.0'
  enableDrafts?: boolean;       // Default: true
  enablePreview?: boolean;      // Default: true
  useTabLayout?: boolean;       // Default: true
  includeDesignTokens?: boolean; // Default: false
  phpVersion?: string;          // Default: '8.0'
  debugMode?: boolean;          // Default: false
}
```

## Validation

The adapter validates schemas and provides helpful feedback:

```typescript
const validation = await adapter.validateSchema(schema);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}
```

**Common Validations:**
- Entity IDs and names
- Required fields
- Field type compatibility
- Relationship validity
- Title field presence

## Best Practices

1. **Always validate schemas** before generation
2. **Use meaningful entity IDs** (they become template names)
3. **Include a title field** in every entity
4. **Specify displayField** for better UX
5. **Use slugSource** for automatic slug generation
6. **Test generated sites** with PHP built-in server

## Development

```bash
# Build
npm run build

# Development mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

## API Reference

See the [full API documentation](./docs/api.md) for detailed information.

## Contributing

Contributions welcome! Please read the contributing guidelines first.

## License

MIT

## Related Packages

- `@kirby-gen/shared` - Shared types and interfaces
- `@kirby-gen/cli` - Command-line interface
- `@kirby-gen/local-services` - Local service implementations
