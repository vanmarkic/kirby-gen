/**
 * Domain mapping controller - proxy to domain mapping skill
 */
import { Request, Response } from 'express';
import path from 'path';
import { IStorageService, SERVICE_KEYS } from '@kirby-gen/shared';
import { getService } from '../config/di-setup';
import { ResponseBuilder } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';
import { skillClient } from '../workflow/skill-client';
import { env } from '../config/env';

/**
 * Generate domain model from content
 */
export async function generateDomainModel(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { existingModel } = req.body;

  logger.info('Generating domain model', { projectId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (project.inputs.contentFiles.length === 0) {
    throw new NotFoundError('Content files', projectId);
  }

  // Prepare content files
  const contentFiles = project.inputs.contentFiles.map((file: { filename: string; originalName: string; mimeType: string }) => ({
    path: path.join(env.UPLOAD_DIR, projectId, file.filename),
    filename: file.originalName,
    mimeType: file.mimeType,
  }));

  // Call domain mapping skill
  const result = await skillClient.domainMapping({
    contentFiles,
    existingModel,
  });

  // Update project
  project.domainModel = result.domainModel;
  project.status = 'structuring';
  project.currentStep = 1;
  project.updatedAt = new Date();
  await storageService.updateProject(projectId, project);

  res.json(
    ResponseBuilder.success({
      domainModel: result.domainModel,
      projectStatus: project.status,
    })
  );
}

/**
 * Update domain model
 */
export async function updateDomainModel(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { domainModel } = req.body;

  logger.info('Updating domain model', { projectId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Update domain model
  project.domainModel = domainModel;
  project.updatedAt = new Date();
  await storageService.updateProject(projectId, project);

  res.json(
    ResponseBuilder.success({
      domainModel: project.domainModel,
    })
  );
}

/**
 * Get domain model
 */
export async function getDomainModel(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (!project.domainModel) {
    throw new NotFoundError('Domain model', projectId);
  }

  res.json(
    ResponseBuilder.success({
      domainModel: project.domainModel,
    })
  );
}

/**
 * Validate domain model structure
 */
export async function validateDomainModel(req: Request, res: Response): Promise<void> {
  const { domainModel } = req.body;

  logger.info('Validating domain model');

  // Basic validation
  const issues: string[] = [];

  if (!domainModel.entities || !Array.isArray(domainModel.entities)) {
    issues.push('Missing or invalid entities array');
  }

  if (!domainModel.relationships || !Array.isArray(domainModel.relationships)) {
    issues.push('Missing or invalid relationships array');
  }

  if (!domainModel.schema) {
    issues.push('Missing schema');
  }

  // Validate entities
  if (domainModel.entities) {
    domainModel.entities.forEach((entity: { id?: string; name?: string; fields?: unknown }, index: number) => {
      if (!entity.id) {
        issues.push(`Entity at index ${index} missing ID`);
      }
      if (!entity.name) {
        issues.push(`Entity at index ${index} missing name`);
      }
      if (!entity.fields || !Array.isArray(entity.fields)) {
        issues.push(`Entity at index ${index} missing or invalid fields`);
      }
    });
  }

  // Validate relationships
  if (domainModel.relationships) {
    domainModel.relationships.forEach((rel: { id?: string; from?: string; to?: string; type?: string }, index: number) => {
      if (!rel.id) {
        issues.push(`Relationship at index ${index} missing ID`);
      }
      if (!rel.from || !rel.to) {
        issues.push(`Relationship at index ${index} missing from/to references`);
      }
      if (!['one-to-one', 'one-to-many', 'many-to-many'].includes(rel.type || '')) {
        issues.push(`Relationship at index ${index} has invalid type: ${rel.type}`);
      }
    });
  }

  const isValid = issues.length === 0;

  res.json(
    ResponseBuilder.success({
      valid: isValid,
      issues,
    })
  );
}
