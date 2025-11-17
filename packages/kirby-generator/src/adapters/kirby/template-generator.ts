/**
 * Template Generator
 * Generates PHP templates for Kirby CMS with atomic design structure
 */

import { render } from 'ejs';
import { EntitySchema, FieldSchema, GenericFieldType } from '@kirby-gen/shared';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Template Type
 */
export type TemplateType = 'page' | 'snippet' | 'layout' | 'component';

/**
 * Atomic Design Level
 */
export type AtomicLevel = 'atom' | 'molecule' | 'organism' | 'template';

/**
 * Template Configuration
 */
export interface TemplateGeneratorConfig {
  useAtomicDesign?: boolean;
  includeComments?: boolean;
  phpVersion?: string;
  useStrictTypes?: boolean;
  templateEngine?: 'php' | 'twig';
}

/**
 * Template Result
 */
export interface TemplateResult {
  path: string;
  content: string;
  type: TemplateType;
}

/**
 * Template Generator
 */
export class TemplateGenerator {
  private config: TemplateGeneratorConfig;
  private templatesPath: string;

  constructor(config: TemplateGeneratorConfig = {}) {
    this.config = {
      useAtomicDesign: true,
      includeComments: true,
      phpVersion: '8.0',
      useStrictTypes: true,
      templateEngine: 'php',
      ...config,
    };
    this.templatesPath = path.join(__dirname, '../../templates');
  }

  /**
   * Generate main template for an entity
   */
  async generateTemplate(entity: EntitySchema): Promise<TemplateResult> {
    const templateName = this.entityToTemplate(entity.id);

    const content = this.buildTemplate(entity);

    return {
      path: `templates/${templateName}.php`,
      content,
      type: 'page',
    };
  }

  /**
   * Build template content
   */
  private buildTemplate(entity: EntitySchema): string {
    const parts: string[] = [];

    // PHP header
    if (this.config.useStrictTypes) {
      parts.push('<?php declare(strict_types=1); ?>');
    } else {
      parts.push('<?php');
    }

    // Template comments
    if (this.config.includeComments) {
      parts.push('/**');
      parts.push(` * Template: ${entity.name}`);
      if (entity.description) {
        parts.push(` * ${entity.description}`);
      }
      parts.push(' */');
    }

    parts.push('');

    // Snippet or layout call
    parts.push('<?php snippet(\'header\') ?>');
    parts.push('');

    // Main content
    parts.push('<main class="page-content">');
    parts.push('  <article class="<?= $page->template() ?>">');

    // Add header section
    parts.push('    <?php snippet(\'page-header\', [\'page\' => $page]) ?>');
    parts.push('');

    // Add fields
    parts.push('    <div class="page-body">');
    entity.fields.forEach((field) => {
      parts.push(this.generateFieldOutput(field));
    });
    parts.push('    </div>');

    parts.push('  </article>');
    parts.push('</main>');
    parts.push('');

    // Footer
    parts.push('<?php snippet(\'footer\') ?>');

    return parts.join('\n');
  }

  /**
   * Generate field output in template
   */
  private generateFieldOutput(field: FieldSchema): string {
    const fieldName = field.name;
    const lines: string[] = [];

    switch (field.type) {
      case 'text':
      case 'textarea':
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="field field-${fieldName}">`);
        lines.push(`          <h2 class="field-label"><?= $page->${fieldName}() ?></h2>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
        break;

      case 'richtext':
      case 'markdown':
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="field field-${fieldName}">`);
        lines.push(`          <?= $page->${fieldName}()->kirbytext() ?>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
        break;

      case 'blocks':
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="field field-${fieldName}">`);
        lines.push(`          <?= $page->${fieldName}()->toBlocks() ?>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
        break;

      case 'image':
        lines.push(`      <?php if ($image = $page->${fieldName}()->toFile()): ?>`);
        lines.push(`        <figure class="field field-${fieldName}">`);
        lines.push(`          <img src="<?= $image->url() ?>" alt="<?= $image->alt() ?>">`);
        lines.push(`        </figure>`);
        lines.push(`      <?php endif ?>`);
        break;

      case 'gallery':
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="gallery field-${fieldName}">`);
        lines.push(`          <?php foreach ($page->${fieldName}()->toFiles() as $image): ?>`);
        lines.push(`            <figure>`);
        lines.push(`              <img src="<?= $image->url() ?>" alt="<?= $image->alt() ?>">`);
        lines.push(`            </figure>`);
        lines.push(`          <?php endforeach ?>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
        break;

      case 'structure':
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="structure field-${fieldName}">`);
        lines.push(`          <?php foreach ($page->${fieldName}()->toStructure() as $item): ?>`);
        lines.push(`            <?php snippet('${fieldName}-item', ['item' => $item]) ?>`);
        lines.push(`          <?php endforeach ?>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
        break;

      case 'relation':
      case 'relations':
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="relations field-${fieldName}">`);
        lines.push(`          <?php foreach ($page->${fieldName}()->toPages() as $related): ?>`);
        lines.push(`            <?php snippet('card', ['page' => $related]) ?>`);
        lines.push(`          <?php endforeach ?>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
        break;

      default:
        lines.push(`      <?php if ($page->${fieldName}()->isNotEmpty()): ?>`);
        lines.push(`        <div class="field field-${fieldName}">`);
        lines.push(`          <?= $page->${fieldName}() ?>`);
        lines.push(`        </div>`);
        lines.push(`      <?php endif ?>`);
    }

    return lines.join('\n');
  }

  /**
   * Generate snippets (atomic design components)
   */
  async generateSnippets(): Promise<TemplateResult[]> {
    const snippets: TemplateResult[] = [];

    // Header snippet
    snippets.push({
      path: 'snippets/header.php',
      content: this.generateHeaderSnippet(),
      type: 'snippet',
    });

    // Footer snippet
    snippets.push({
      path: 'snippets/footer.php',
      content: this.generateFooterSnippet(),
      type: 'snippet',
    });

    // Page header snippet
    snippets.push({
      path: 'snippets/page-header.php',
      content: this.generatePageHeaderSnippet(),
      type: 'snippet',
    });

    // Card snippet
    snippets.push({
      path: 'snippets/card.php',
      content: this.generateCardSnippet(),
      type: 'snippet',
    });

    return snippets;
  }

  /**
   * Generate header snippet
   */
  private generateHeaderSnippet(): string {
    return `<?php
/**
 * Snippet: Header
 * Site header with navigation
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $page->title() ?> | <?= $site->title() ?></title>

  <?php if ($page->metaDescription()->isNotEmpty()): ?>
    <meta name="description" content="<?= $page->metaDescription() ?>">
  <?php endif ?>

  <?= css('assets/css/main.css') ?>
  <?= css('assets/css/theme.css') ?>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="<?= $site->url() ?>" class="site-logo">
        <?= $site->title() ?>
      </a>

      <nav class="site-nav">
        <ul>
          <?php foreach ($site->children()->listed() as $item): ?>
            <li>
              <a href="<?= $item->url() ?>" <?= e($item->isOpen(), 'aria-current="page"') ?>>
                <?= $item->title() ?>
              </a>
            </li>
          <?php endforeach ?>
        </ul>
      </nav>
    </div>
  </header>
`;
  }

  /**
   * Generate footer snippet
   */
  private generateFooterSnippet(): string {
    return `<?php
/**
 * Snippet: Footer
 * Site footer
 */
?>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; <?= date('Y') ?> <?= $site->title() ?>. All rights reserved.</p>
    </div>
  </footer>

  <?= js('assets/js/main.js') ?>
</body>
</html>
`;
  }

  /**
   * Generate page header snippet
   */
  private generatePageHeaderSnippet(): string {
    return `<?php
/**
 * Snippet: Page Header
 * Standard page header with title
 */
?>
<header class="page-header">
  <h1 class="page-title"><?= $page->title() ?></h1>

  <?php if ($page->subtitle()->isNotEmpty()): ?>
    <p class="page-subtitle"><?= $page->subtitle() ?></p>
  <?php endif ?>
</header>
`;
  }

  /**
   * Generate card snippet
   */
  private generateCardSnippet(): string {
    return `<?php
/**
 * Snippet: Card
 * Content card for listings
 */
?>
<article class="card">
  <?php if ($image = $page->image()): ?>
    <div class="card-image">
      <img src="<?= $image->url() ?>" alt="<?= $image->alt() ?>">
    </div>
  <?php endif ?>

  <div class="card-content">
    <h3 class="card-title">
      <a href="<?= $page->url() ?>"><?= $page->title() ?></a>
    </h3>

    <?php if ($page->excerpt()->isNotEmpty()): ?>
      <p class="card-excerpt"><?= $page->excerpt() ?></p>
    <?php endif ?>
  </div>
</article>
`;
  }

  /**
   * Generate default template
   */
  generateDefaultTemplate(): TemplateResult {
    return {
      path: 'templates/default.php',
      content: `<?php
/**
 * Template: Default
 * Fallback template for pages
 */
?>
<?php snippet('header') ?>

<main class="page-content">
  <article class="default-page">
    <?php snippet('page-header', ['page' => $page]) ?>

    <div class="page-body">
      <?php if ($page->text()->isNotEmpty()): ?>
        <div class="content">
          <?= $page->text()->kirbytext() ?>
        </div>
      <?php endif ?>
    </div>
  </article>
</main>

<?php snippet('footer') ?>
`,
      type: 'page',
    };
  }

  /**
   * Generate home template
   */
  generateHomeTemplate(): TemplateResult {
    return {
      path: 'templates/home.php',
      content: `<?php
/**
 * Template: Home
 * Homepage template
 */
?>
<?php snippet('header') ?>

<main class="page-content">
  <div class="home-page">
    <section class="hero">
      <h1><?= $page->title() ?></h1>
      <?php if ($page->subtitle()->isNotEmpty()): ?>
        <p class="lead"><?= $page->subtitle() ?></p>
      <?php endif ?>
    </section>

    <?php if ($page->text()->isNotEmpty()): ?>
      <section class="content">
        <?= $page->text()->kirbytext() ?>
      </section>
    <?php endif ?>

    <?php if ($featuredPages = $page->children()->listed()->limit(6)): ?>
      <section class="featured">
        <h2>Featured</h2>
        <div class="card-grid">
          <?php foreach ($featuredPages as $featured): ?>
            <?php snippet('card', ['page' => $featured]) ?>
          <?php endforeach ?>
        </div>
      </section>
    <?php endif ?>
  </div>
</main>

<?php snippet('footer') ?>
`,
      type: 'page',
    };
  }

  /**
   * Convert entity ID to template name
   */
  private entityToTemplate(entityId: string): string {
    return entityId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Generate all templates for entities
   */
  async generateAllTemplates(entities: EntitySchema[]): Promise<TemplateResult[]> {
    const templates: TemplateResult[] = [];

    // Generate entity templates
    for (const entity of entities) {
      templates.push(await this.generateTemplate(entity));
    }

    // Generate default templates
    templates.push(this.generateDefaultTemplate());
    templates.push(this.generateHomeTemplate());

    // Generate snippets
    const snippets = await this.generateSnippets();
    templates.push(...snippets);

    return templates;
  }
}
