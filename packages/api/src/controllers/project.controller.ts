/**
 * Project CRUD operations controller
 */
import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { IStorageService, ProjectData, SERVICE_KEYS } from '@kirby-gen/shared';
import { getService } from '../config/di-setup';
import { ResponseBuilder } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

/**
 * Create a new project
 */
export async function createProject(req: Request, res: Response): Promise<void> {
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  const projectData: ProjectData = {
    id: nanoid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    inputs: {
      contentFiles: [],
      brandingAssets: {},
    },
    status: 'input',
    currentStep: 0,
    totalSteps: 5,
    errors: [],
  };

  logger.info('Creating new project', { projectId: projectData.id });

  const project = await storageService.createProject(projectData);

  res.status(201).json(ResponseBuilder.created(project));
}

/**
 * Get project by ID
 */
export async function getProject(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  logger.debug('Getting project', { projectId });

  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  res.json(ResponseBuilder.success(project));
}

/**
 * List all projects
 */
export async function listProjects(req: Request, res: Response): Promise<void> {
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const { page = '1', limit = '10', status } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  logger.debug('Listing projects', { page: pageNum, limit: limitNum, status });

  const projects = await storageService.listProjects();

  // Filter by status if provided
  let filteredProjects = projects;
  if (status) {
    filteredProjects = projects.filter((p) => p.status === status);
  }

  // Pagination
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;
  const paginatedProjects = filteredProjects.slice(start, end);

  res.json(
    ResponseBuilder.paginated(paginatedProjects, pageNum, limitNum, filteredProjects.length)
  );
}

/**
 * Update project
 */
export async function updateProject(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const updates = req.body;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  logger.info('Updating project', { projectId, updates });

  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Merge updates
  const updatedProject = {
    ...project,
    ...updates,
    id: project.id, // Prevent ID change
    createdAt: project.createdAt, // Prevent creation date change
    updatedAt: new Date(),
  };

  await storageService.updateProject(projectId, updatedProject);

  res.json(ResponseBuilder.success(updatedProject));
}

/**
 * Delete project
 */
export async function deleteProject(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  logger.info('Deleting project', { projectId });

  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  await storageService.deleteProject(projectId);

  res.status(204).send();
}

/**
 * Get project status
 */
export async function getProjectStatus(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const status = {
    id: project.id,
    status: project.status,
    currentStep: project.currentStep,
    totalSteps: project.totalSteps,
    errors: project.errors,
    updatedAt: project.updatedAt,
  };

  res.json(ResponseBuilder.success(status));
}
