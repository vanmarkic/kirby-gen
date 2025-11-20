/**
 * Preview URLs and downloads controller
 */
import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { IStorageService, IDeploymentService, SERVICE_KEYS } from '@kirby-gen/shared';
import { getService } from '../config/di-setup';
import { ResponseBuilder } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

/**
 * Get preview URL
 */
export async function getPreviewUrl(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  logger.info('Getting preview URL', { projectId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (!project.generated) {
    throw new NotFoundError('Generated site', projectId);
  }

  const deploymentService = getService<IDeploymentService>(SERVICE_KEYS.DEPLOYMENT);
  const deployment = await deploymentService.getStatus(project.generated.deploymentId);

  if (!deployment) {
    throw new NotFoundError('Deployment', project.generated.deploymentId);
  }

  res.json(
    ResponseBuilder.success({
      url: deployment.url,
      status: deployment.status,
      deployedAt: deployment.readyAt,
    })
  );
}

/**
 * Download generated site
 */
export async function downloadSite(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { format = 'zip' } = req.query;

  logger.info('Downloading site', { projectId, format });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (!project.generated) {
    throw new NotFoundError('Generated site', projectId);
  }

  const sitePath = project.generated.sitePath;

  // Verify site exists
  try {
    await fs.access(sitePath);
  } catch (error) {
    throw new NotFoundError('Site files', sitePath);
  }

  // Create archive
  const archive = archiver(format as 'zip' | 'tar', {
    zlib: { level: 9 },
  });

  // Set headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="portfolio-${projectId}.${format}"`
  );

  // Pipe archive to response
  archive.pipe(res);

  // Add site files to archive
  archive.directory(sitePath, false);

  // Finalize archive
  await archive.finalize();

  logger.info('Site download completed', { projectId, format });
}

/**
 * Download project data (JSON)
 */
export async function downloadProjectData(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  logger.info('Downloading project data', { projectId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Set headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="project-${projectId}.json"`
  );

  res.json(project);
}

/**
 * Get deployment logs
 */
export async function getDeploymentLogs(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  logger.info('Getting deployment logs', { projectId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (!project.generated) {
    throw new NotFoundError('Deployment', projectId);
  }

  // TODO: Implement getLogs in IDeploymentService interface
  // Temporarily return empty logs until getLogs is implemented in deployment service
  const logs: string[] = [];

  res.json(ResponseBuilder.success({ logs }));
}

/**
 * Restart deployment
 */
export async function restartDeployment(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  logger.info('Restarting deployment', { projectId });

  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (!project.generated) {
    throw new NotFoundError('Deployment', projectId);
  }

  const deploymentService = getService<IDeploymentService>(SERVICE_KEYS.DEPLOYMENT);

  // Stop existing deployment
  await deploymentService.stop(project.generated.deploymentId);

  // Start new deployment
  const deployment = await deploymentService.deploy(projectId, project.generated.sitePath);

  // Update project
  project.generated.deploymentId = deployment.deploymentId;
  project.generated.deploymentUrl = deployment.url;
  await storageService.updateProject(projectId, project);

  res.json(
    ResponseBuilder.success({
      deployment,
    })
  );
}
