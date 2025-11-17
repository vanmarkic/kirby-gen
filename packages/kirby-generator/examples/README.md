# Kirby Adapter Examples

This directory contains examples demonstrating the usage of the Kirby CMS Adapter.

## Files

### Schema Examples

- **`portfolio-schema.json`** - Complete portfolio schema with projects and testimonials
  - Demonstrates various field types (text, richtext, image, gallery, tags, etc.)
  - Shows relationship definitions
  - Includes validation rules and field options

### Expected Outputs

- **`expected-outputs/blueprint-project.yml`** - Generated Kirby blueprint for the Project entity
  - Shows how generic fields are mapped to Kirby field types
  - Demonstrates tab-based layout
  - Includes field configuration options

- **`expected-outputs/content-project.txt`** - Generated Kirby content file
  - Shows the .txt format used by Kirby
  - Demonstrates field serialization
  - Includes metadata fields

### Usage Examples

- **`usage.ts`** - TypeScript examples showing how to use the adapter
  - Basic usage example
  - Full site generation example
  - Individual component usage

## Running Examples

### Basic Example

```typescript
import { KirbyCMSAdapter } from '@kirby-gen/kirby-generator';

const adapter = new KirbyCMSAdapter({
  kirbyVersion: '4.0.0',
  enableDrafts: true,
});

// Validate and convert schema
const validation = await adapter.validateSchema(schema);
const blueprints = await adapter.convertSchema(schema);
```

### Full Site Generation

```typescript
const config = {
  projectId: 'my-portfolio',
  schema,
  content,
  designSystem,
  outputPath: './output/kirby-site',
};

const site = await adapter.generateSite(config);
console.log('Site generated at:', site.sitePath);
```

## Field Type Mapping

The adapter maps generic field types to Kirby field types:

| Generic Type | Kirby Type | Notes |
|--------------|------------|-------|
| `text` | `text` | Single-line text input |
| `textarea` | `textarea` | Multi-line text input |
| `richtext` | `writer` | Rich text editor |
| `markdown` | `markdown` | Markdown editor |
| `boolean` | `toggle` | Toggle switch |
| `select` | `select` | Dropdown selection |
| `image` | `files` | Single file with `max: 1` |
| `gallery` | `files` | Multiple images |
| `structure` | `structure` | Repeatable structured data |
| `blocks` | `blocks` | Block editor |
| `tags` | `tags` | Tag input |
| `date` | `date` | Date picker |
| `url` | `url` | URL input with validation |
| `email` | `email` | Email input with validation |

## Generated Structure

When you generate a complete site, the following structure is created:

```
kirby-site/
├── index.php                 # Entry point
├── .htaccess                 # Apache configuration
├── .gitignore               # Git ignore rules
├── README.md                # Site documentation
├── composer.json            # PHP dependencies
├── package.json             # Node dependencies
├── site/
│   ├── config/
│   │   └── config.php       # Site configuration
│   ├── blueprints/
│   │   ├── site.yml         # Site blueprint
│   │   └── pages/           # Page blueprints
│   │       ├── project.yml
│   │       └── testimonial.yml
│   ├── templates/           # PHP templates
│   │   ├── project.php
│   │   ├── testimonial.php
│   │   ├── default.php
│   │   └── home.php
│   ├── snippets/            # Reusable template parts
│   │   ├── header.php
│   │   ├── footer.php
│   │   ├── page-header.php
│   │   └── card.php
│   └── plugins/             # Custom plugins
│       └── custom-panel/
│           ├── index.php
│           └── panel.css
├── content/                 # Content files (.txt)
│   ├── project-1/
│   │   └── project-1.txt
│   └── project-2/
│       └── project-2.txt
└── assets/                  # Static assets
    ├── css/
    │   ├── main.css         # Main stylesheet (imports)
    │   ├── theme.css        # Design tokens (CSS vars)
    │   ├── base.css         # Base styles
    │   └── utilities.css    # Utility classes
    └── js/
        └── main.js
```

## Design System Integration

The adapter converts design tokens to CSS custom properties:

```css
:root {
  /* Colors */
  --primary: #0066ff;
  --color-primary-500: #0066ff;
  --color-neutral-900: #111827;

  /* Typography */
  --font-body: Inter, sans-serif;
  --font-size-base: 16px;

  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;

  /* Effects */
  --shadow-default: 0 2px 4px rgba(0,0,0,0.1);
  --border-default: 1px solid #ccc;
  --radius-default: 4px;
}
```

## Next Steps

After generating a site:

1. Install Kirby via Composer: `composer install`
2. Configure your web server
3. Visit `/panel` to set up admin account
4. Start adding content!

## Learn More

- [Kirby Documentation](https://getkirby.com/docs)
- [Kirby Panel Fields](https://getkirby.com/docs/reference/panel/fields)
- [Kirby Templates](https://getkirby.com/docs/guide/templates/basics)
