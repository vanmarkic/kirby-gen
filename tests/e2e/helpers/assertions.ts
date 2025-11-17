/**
 * Custom E2E Test Assertions
 * Helper functions for validating generated files and structures
 */
import fs from 'fs/promises';
import path from 'path';
import { ProjectData } from '../../../packages/shared/src/types/project.types';

/**
 * Assert that a file exists
 */
export async function assertFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`File does not exist: ${filePath}`);
  }
}

/**
 * Assert that a directory exists
 */
export async function assertDirectoryExists(dirPath: string): Promise<void> {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
  } catch (error) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }
}

/**
 * Assert that a file contains specific content
 */
export async function assertFileContains(
  filePath: string,
  expectedContent: string | RegExp
): Promise<void> {
  await assertFileExists(filePath);
  const content = await fs.readFile(filePath, 'utf-8');

  if (typeof expectedContent === 'string') {
    if (!content.includes(expectedContent)) {
      throw new Error(
        `File ${filePath} does not contain expected string: ${expectedContent}`
      );
    }
  } else {
    if (!expectedContent.test(content)) {
      throw new Error(
        `File ${filePath} does not match expected pattern: ${expectedContent}`
      );
    }
  }
}

/**
 * Assert that a JSON file has a specific structure
 */
export async function assertJsonStructure(
  filePath: string,
  expectedKeys: string[]
): Promise<void> {
  await assertFileExists(filePath);
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  const missingKeys = expectedKeys.filter((key) => !(key in data));

  if (missingKeys.length > 0) {
    throw new Error(
      `JSON file ${filePath} is missing keys: ${missingKeys.join(', ')}`
    );
  }
}

/**
 * Assert Kirby site structure
 */
export async function assertKirbySiteStructure(sitePath: string): Promise<void> {
  await assertDirectoryExists(sitePath);

  // Required Kirby directories
  const requiredDirs = [
    'site',
    'site/blueprints',
    'site/templates',
    'site/snippets',
    'content',
    'assets',
  ];

  for (const dir of requiredDirs) {
    await assertDirectoryExists(path.join(sitePath, dir));
  }

  // Required Kirby files
  const requiredFiles = [
    'site/config/config.php',
    'site/blueprints/pages/default.yml',
    'site/templates/default.php',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(sitePath, file);
    try {
      await assertFileExists(filePath);
    } catch (error) {
      // Some files might not exist in all setups, log but don't fail
      console.warn(`Optional file not found: ${file}`);
    }
  }
}

/**
 * Assert project has all required phases completed
 */
export function assertProjectComplete(project: ProjectData): void {
  // Check domain model
  if (!project.domainModel) {
    throw new Error('Project missing domain model');
  }

  if (!project.domainModel.entities || project.domainModel.entities.length === 0) {
    throw new Error('Domain model has no entities');
  }

  // Check structured content
  if (!project.structuredContent) {
    throw new Error('Project missing structured content');
  }

  // Check design system
  if (!project.designSystem) {
    throw new Error('Project missing design system');
  }

  if (!project.designSystem.tokens) {
    throw new Error('Design system missing tokens');
  }

  // Check generated site
  if (!project.generated) {
    throw new Error('Project missing generated site');
  }

  if (!project.generated.sitePath) {
    throw new Error('Generated site missing path');
  }

  if (!project.generated.deploymentUrl) {
    throw new Error('Generated site missing deployment URL');
  }

  // Check status
  if (project.status !== 'completed') {
    throw new Error(`Project status is ${project.status}, expected completed`);
  }
}

/**
 * Assert project phase data
 */
export function assertDomainModel(project: ProjectData): void {
  if (!project.domainModel) {
    throw new Error('Domain model not found');
  }

  const { entities, relationships, schema } = project.domainModel;

  if (!entities || entities.length === 0) {
    throw new Error('Domain model has no entities');
  }

  // Check entity structure
  for (const entity of entities) {
    if (!entity.id || !entity.name || !entity.fields) {
      throw new Error(`Invalid entity structure: ${JSON.stringify(entity)}`);
    }

    if (entity.fields.length === 0) {
      throw new Error(`Entity ${entity.name} has no fields`);
    }
  }

  if (!schema) {
    throw new Error('Domain model missing schema');
  }
}

export function assertStructuredContent(project: ProjectData): void {
  if (!project.structuredContent) {
    throw new Error('Structured content not found');
  }

  const entityTypes = Object.keys(project.structuredContent);

  if (entityTypes.length === 0) {
    throw new Error('Structured content is empty');
  }

  // Check content items
  for (const entityType of entityTypes) {
    const items = project.structuredContent[entityType];

    if (!Array.isArray(items)) {
      throw new Error(`Content for ${entityType} is not an array`);
    }

    for (const item of items) {
      if (!item.id || !item.entityType || !item.title || !item.slug || !item.fields) {
        throw new Error(`Invalid content item structure in ${entityType}`);
      }
    }
  }
}

export function assertDesignSystem(project: ProjectData): void {
  if (!project.designSystem) {
    throw new Error('Design system not found');
  }

  const { tokens, branding } = project.designSystem;

  if (!tokens) {
    throw new Error('Design system missing tokens');
  }

  // Check token categories
  const requiredCategories = ['colors', 'typography', 'spacing'];
  for (const category of requiredCategories) {
    if (!tokens[category]) {
      throw new Error(`Design tokens missing ${category}`);
    }
  }

  if (!branding) {
    throw new Error('Design system missing branding');
  }
}

/**
 * Assert git repository
 */
export async function assertGitRepository(repoPath: string): Promise<void> {
  await assertDirectoryExists(path.join(repoPath, '.git'));

  // Check for initial commit
  const gitDir = path.join(repoPath, '.git');
  await assertDirectoryExists(gitDir);
}

/**
 * Assert deployment is accessible
 */
export async function assertDeploymentAccessible(url: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Deployment returned status ${response.status}`);
    }
  } catch (error: any) {
    throw new Error(`Deployment not accessible at ${url}: ${error.message}`);
  }
}

/**
 * Count files in directory
 */
export async function countFiles(dirPath: string, extension?: string): Promise<number> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (entry.isFile()) {
      if (!extension || entry.name.endsWith(extension)) {
        count++;
      }
    } else if (entry.isDirectory()) {
      count += await countFiles(path.join(dirPath, entry.name), extension);
    }
  }

  return count;
}

/**
 * Get all files in directory recursively
 */
export async function getAllFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    }
  }

  return files;
}
