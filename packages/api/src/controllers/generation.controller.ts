/**
 * Generation process controller
 */
import { Request, Response } from 'express';
import { IStorageService, SERVICE_KEYS } from '@kirby-gen/shared';
import { getService } from '../config/di-setup';
import { ResponseBuilder } from '../utils/response';
import { NotFoundError, WorkflowError as WorkflowErr } from '../utils/errors';
import { logger } from '../config/logger';
import { WorkflowOrchestrator } from '../workflow/workflow-orchestrator';
import { ProgressEmitter } from '../websocket/progress-emitter';

// Store workflow orchestrator instances
const workflows = new Map<string, WorkflowOrchestrator>();

/**
 * Start generation process
 */
export async function startGeneration(
  req: Request,
  res: Response,
  progressEmitter?: ProgressEmitter
): Promise<void> {
  const { projectId } = req.params;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  logger.info('Starting generation', { projectId });

  // Get project
  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Validate project is ready for generation
  if (project.inputs.contentFiles.length === 0) {
    throw new WorkflowErr(
      'No content files uploaded. Please upload content files first.',
      'validation'
    );
  }

  // Check if generation already in progress
  if (workflows.has(projectId)) {
    throw new WorkflowErr('Generation already in progress for this project', 'validation');
  }

  // Create workflow orchestrator
  const orchestrator = new WorkflowOrchestrator();
  workflows.set(projectId, orchestrator);

  // Subscribe to progress events
  if (progressEmitter) {
    orchestrator.on('progress', (progress) => {
      progressEmitter.emitProgress(projectId, progress);
    });
  }

  // Start generation asynchronously
  res.status(202).json(
    ResponseBuilder.success({
      message: 'Generation started',
      projectId,
      status: 'processing',
    })
  );

  // Execute workflow in background
  orchestrator
    .execute(projectId)
    .then((result) => {
      logger.info('Generation completed', { projectId });
      workflows.delete(projectId);

      if (progressEmitter) {
        progressEmitter.emitWorkflowCompleted(projectId, result);
      }
    })
    .catch((error) => {
      logger.error('Generation failed', { projectId, error });
      workflows.delete(projectId);

      if (progressEmitter) {
        progressEmitter.emitWorkflowFailed(projectId, {
          code: error.code || 'GENERATION_FAILED',
          message: error.message,
          phase: error.details?.phase || 'unknown',
          details: error.details,
        });
      }
    });
}

/**
 * Get generation status
 */
export async function getGenerationStatus(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const isInProgress = workflows.has(projectId);

  res.json(
    ResponseBuilder.success({
      projectId,
      status: project.status,
      isInProgress,
      currentStep: project.currentStep,
      totalSteps: project.totalSteps,
      errors: project.errors,
      generated: project.generated,
    })
  );
}

/**
 * Cancel generation
 */
export async function cancelGeneration(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  logger.info('Cancelling generation', { projectId });

  const orchestrator = workflows.get(projectId);

  if (!orchestrator) {
    throw new NotFoundError('Active generation', projectId);
  }

  // Remove all listeners and mark as cancelled
  orchestrator.removeAllListeners();
  workflows.delete(projectId);

  // Update project status
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
  const project = await storageService.getProject(projectId);

  if (project) {
    project.status = 'failed';
    project.errors.push({
      code: 'GENERATION_CANCELLED',
      message: 'Generation cancelled by user',
      timestamp: new Date(),
      phase: project.status,
    });
    await storageService.updateProject(projectId, project);
  }

  res.json(
    ResponseBuilder.success({
      message: 'Generation cancelled',
      projectId,
    })
  );
}

/**
 * Retry failed generation
 */
export async function retryGeneration(
  req: Request,
  res: Response,
  progressEmitter?: ProgressEmitter
): Promise<void> {
  const { projectId } = req.params;
  const storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);

  logger.info('Retrying generation', { projectId });

  const project = await storageService.getProject(projectId);

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (project.status !== 'failed') {
    throw new WorkflowErr('Can only retry failed generations', 'validation');
  }

  // Clear errors
  project.errors = [];
  project.updatedAt = new Date();
  await storageService.updateProject(projectId, project);

  // Start generation
  return startGeneration(req, res, progressEmitter);
}
