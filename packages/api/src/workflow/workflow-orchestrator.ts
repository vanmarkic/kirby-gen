/**
 * Main workflow orchestration
 * Coordinates all phases of portfolio generation
 */
import { EventEmitter } from 'events';
import path from 'path';
import {
  ProjectData,
  ProjectStatus,
  IStorageService,
  ISessionService,
  IDeploymentService,
  IKirbyDeploymentService,
} from '@kirby-gen/shared';
import { SERVICE_KEYS } from '@kirby-gen/shared';
import { getService } from '../config/di-setup';
import { logger, logWorkflowProgress } from '../config/logger';
import { WorkflowError as WorkflowErr } from '../utils/errors';
import { skillClient } from './skill-client';
import {
  WorkflowState,
  WorkflowProgress,
  WorkflowError,
  WorkflowContext,
  PhaseResult,
  WORKFLOW_PHASES,
} from './workflow-types';
import { env } from '../config/env';

/**
 * Workflow orchestrator
 * Manages the entire portfolio generation workflow
 */
export class WorkflowOrchestrator extends EventEmitter {
  private storageService: IStorageService;
  private sessionService: ISessionService;
  private deploymentService: IDeploymentService;
  private kirbyDeploymentService: IKirbyDeploymentService;

  constructor() {
    super();
    this.storageService = getService<IStorageService>(SERVICE_KEYS.STORAGE);
    this.sessionService = getService<ISessionService>(SERVICE_KEYS.SESSION);
    this.deploymentService = getService<IDeploymentService>(SERVICE_KEYS.DEPLOYMENT);
    this.kirbyDeploymentService = getService<IKirbyDeploymentService>(SERVICE_KEYS.KIRBY_DEPLOYMENT);
  }

  /**
   * Execute the complete workflow for a project
   */
  async execute(projectId: string): Promise<ProjectData> {
    logger.info(`Starting workflow for project: ${projectId}`);

    // Load project data
    const project = await this.storageService.getProject(projectId);
    if (!project) {
      throw new WorkflowErr('Project not found', 'initialization', { projectId });
    }

    // Initialize workflow state
    const state: WorkflowState = {
      projectId,
      status: 'mapping',
      currentPhase: 'domain-mapping',
      currentPhaseOrder: 1,
      completedPhases: [],
      failedPhases: [],
      startedAt: new Date(),
      errors: [],
      progress: [],
    };

    try {
      // Create workflow context
      const context = await this.createContext(projectId);

      // Execute phases sequentially
      await this.executePhase1_DomainMapping(project, state, context);
      await this.executePhase2_ContentStructuring(project, state, context);
      await this.executePhase3_DesignAutomation(project, state, context);
      await this.executePhase4_CMSAdaptation(project, state, context);
      await this.executeInstantDeployment(project, state, context);
      await this.executePhase5_Deployment(project, state, context);

      // Mark as completed
      state.status = 'completed';
      state.completedAt = new Date();
      project.status = 'completed';

      this.emitProgress(state, 'completed', 100, 'Portfolio generation completed!');

      logger.info(`Workflow completed for project: ${projectId}`);
      return project;
    } catch (error: any) {
      logger.error(`Workflow failed for project: ${projectId}`, { error });

      const workflowError: WorkflowError = {
        code: error.code || 'WORKFLOW_FAILED',
        message: error.message,
        phase: state.currentPhase,
        details: error.details,
        timestamp: new Date(),
      };

      state.errors.push(workflowError);
      state.status = 'failed';
      project.status = 'failed';
      project.errors.push({
        code: workflowError.code,
        message: workflowError.message,
        details: workflowError.details,
        timestamp: workflowError.timestamp,
        phase: project.status,
      });

      this.emitProgress(state, 'failed', state.currentPhaseOrder * 20, error.message, workflowError);

      // Save failed state
      await this.storageService.updateProject(projectId, project);

      throw error;
    }
  }

  /**
   * Phase 1: Domain Mapping (if not already done)
   */
  private async executePhase1_DomainMapping(
    project: ProjectData,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    const phase = 'domain-mapping';
    state.currentPhase = phase;
    state.currentPhaseOrder = 1;

    // Skip if already completed
    if (project.domainModel) {
      logger.info(`Phase ${phase} already completed, skipping`);
      state.completedPhases.push(phase);
      this.emitProgress(state, 'completed', 20, 'Domain mapping already completed');
      return;
    }

    this.emitProgress(state, 'started', 5, 'Starting domain mapping...');

    try {
      // Prepare content files
      const contentFiles = project.inputs.contentFiles.map((file: { filename: string; originalName: string; mimeType: string }) => ({
        path: path.join(context.uploadDir, file.filename),
        filename: file.originalName,
        mimeType: file.mimeType,
      }));

      // Call domain mapping skill
      this.emitProgress(state, 'in_progress', 10, 'Analyzing content files...');
      const result = await skillClient.domainMapping({ contentFiles });

      // Update project
      project.domainModel = result.domainModel;
      project.status = 'structuring';
      await this.storageService.updateProject(project.id, project);

      state.completedPhases.push(phase);
      this.emitProgress(state, 'completed', 20, 'Domain mapping completed');

      logWorkflowProgress(project.id, phase, 'completed', result);
    } catch (error: any) {
      state.failedPhases.push(phase);
      throw new WorkflowErr(`Domain mapping failed: ${error.message}`, phase, error);
    }
  }

  /**
   * Phase 2: Content Structuring
   */
  private async executePhase2_ContentStructuring(
    project: ProjectData,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    const phase = 'content-structuring';
    state.currentPhase = phase;
    state.currentPhaseOrder = 2;

    this.emitProgress(state, 'started', 25, 'Starting content structuring...');

    try {
      if (!project.domainModel) {
        throw new Error('Domain model not found');
      }

      // Prepare content files
      const contentFiles = project.inputs.contentFiles.map((file: { filename: string; originalName: string; mimeType: string }) => ({
        path: path.join(context.uploadDir, file.filename),
        filename: file.originalName,
        mimeType: file.mimeType,
      }));

      // Call content structuring skill
      this.emitProgress(state, 'in_progress', 30, 'Structuring content...');
      const result = await skillClient.contentStructuring({
        domainModel: project.domainModel,
        contentFiles,
      });

      // Update project
      project.structuredContent = result.structuredContent;
      project.status = 'design';
      await this.storageService.updateProject(project.id, project);

      state.completedPhases.push(phase);
      this.emitProgress(state, 'completed', 40, 'Content structuring completed');

      logWorkflowProgress(project.id, phase, 'completed', result);
    } catch (error: any) {
      state.failedPhases.push(phase);
      throw new WorkflowErr(`Content structuring failed: ${error.message}`, phase, error);
    }
  }

  /**
   * Phase 3: Design Automation
   */
  private async executePhase3_DesignAutomation(
    project: ProjectData,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    const phase = 'design-automation';
    state.currentPhase = phase;
    state.currentPhaseOrder = 3;

    this.emitProgress(state, 'started', 45, 'Starting design automation...');

    try {
      // Prepare branding assets
      const brandingAssets: any = {};

      if (project.inputs.brandingAssets.logo) {
        brandingAssets.logo = {
          path: path.join(context.uploadDir, project.inputs.brandingAssets.logo.filename),
        };
      }

      if (project.inputs.brandingAssets.colors) {
        brandingAssets.colors = project.inputs.brandingAssets.colors;
      }

      if (project.inputs.brandingAssets.fonts) {
        brandingAssets.fonts = project.inputs.brandingAssets.fonts;
      }

      if (project.inputs.brandingAssets.guidelines) {
        brandingAssets.guidelines = {
          path: path.join(context.uploadDir, project.inputs.brandingAssets.guidelines.filename),
        };
      }

      // Call design automation skill
      this.emitProgress(state, 'in_progress', 50, 'Generating design system...');
      const result = await skillClient.designAutomation({
        brandingAssets,
        pinterestUrl: project.inputs.pinterestUrl,
        domainModel: project.domainModel,
      });

      // Update project
      project.designSystem = result.designSystem;
      project.status = 'blueprints';
      await this.storageService.updateProject(project.id, project);

      state.completedPhases.push(phase);
      this.emitProgress(state, 'completed', 60, 'Design automation completed');

      logWorkflowProgress(project.id, phase, 'completed', result);
    } catch (error: any) {
      state.failedPhases.push(phase);
      throw new WorkflowErr(`Design automation failed: ${error.message}`, phase, error);
    }
  }

  /**
   * Phase 4: CMS Adaptation (Kirby Generator)
   */
  private async executePhase4_CMSAdaptation(
    project: ProjectData,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    const phase = 'cms-adaptation';
    state.currentPhase = phase;
    state.currentPhaseOrder = 4;

    this.emitProgress(state, 'started', 65, 'Starting CMS adaptation...');

    try {
      if (!project.domainModel || !project.structuredContent || !project.designSystem) {
        throw new Error('Required data missing for CMS adaptation');
      }

      // Call Kirby adapter (this would be imported from @kirby-gen/kirby-generator)
      this.emitProgress(state, 'in_progress', 70, 'Generating Kirby CMS structure...');

      // For now, we'll simulate this - in reality, you'd import KirbyAdapter
      // const kirbyAdapter = new KirbyAdapter();
      // const result = await kirbyAdapter.generate({...});

      // Simulated result for now
      const outputPath = path.join(context.outputDir, 'site');

      // Save generated artifacts to storage
      this.emitProgress(state, 'in_progress', 75, 'Saving generated artifacts...');

      // TODO: Collect actual generated file references from Kirby adapter
      // For now, we'll use placeholder data
      await this.storageService.saveGeneratedArtifacts(project.id, {
        blueprints: [],
        templates: [],
        content: [],
        assets: [],
        generatedAt: new Date(),
        cmsAdapter: 'kirby',
      });

      // Update project
      project.generated = {
        cmsName: 'kirby',
        cmsVersion: '4.0.0',
        sitePath: outputPath,
        deploymentUrl: '', // Will be set in deployment phase
        deploymentId: '',
        kirbyVersion: '4.0.0',
        generatedAt: new Date(),
      };
      project.status = 'deploying';
      await this.storageService.updateProject(project.id, project);

      state.completedPhases.push(phase);
      this.emitProgress(state, 'completed', 80, 'CMS adaptation completed');

      logWorkflowProgress(project.id, phase, 'completed', { outputPath });
    } catch (error: any) {
      state.failedPhases.push(phase);
      throw new WorkflowErr(`CMS adaptation failed: ${error.message}`, phase, error);
    }
  }

  /**
   * Phase 4.5: Instant Demo Deployment
   */
  private async executeInstantDeployment(
    project: ProjectData,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    const phase = 'instant-demo';
    state.currentPhase = phase;
    state.currentPhaseOrder = 4.5;

    this.emitProgress(state, 'started', 82, 'Deploying instant demo site...');

    try {
      // Deploy Kirby demo
      this.emitProgress(state, 'in_progress', 83, 'Installing Kirby and copying blueprints...');
      const deployment = await this.kirbyDeploymentService.deploy(project.id);

      // Update project with deployment info
      this.emitProgress(state, 'in_progress', 84, 'Updating project metadata...');
      project.demoDeployment = {
        url: deployment.url,
        panelUrl: deployment.panelUrl,
        deployedAt: deployment.deployedAt,
        port: deployment.port,
      };
      await this.storageService.updateProject(project.id, project);

      state.completedPhases.push(phase);
      this.emitProgress(
        state,
        'completed',
        85,
        `Demo deployed: ${deployment.url}`
      );

      logWorkflowProgress(project.id, phase, 'completed', { deployment });
    } catch (error: any) {
      state.failedPhases.push(phase);
      throw new WorkflowErr(`Instant deployment failed: ${error.message}`, phase, error);
    }
  }

  /**
   * Phase 5: Deployment
   */
  private async executePhase5_Deployment(
    project: ProjectData,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    const phase = 'deployment';
    state.currentPhase = phase;
    state.currentPhaseOrder = 5;

    this.emitProgress(state, 'started', 85, 'Starting deployment...');

    try {
      if (!project.generated) {
        throw new Error('Generated site not found');
      }

      // Deploy the site
      this.emitProgress(state, 'in_progress', 90, 'Deploying site...');
      const deployment = await this.deploymentService.deploy(
        project.id,
        project.generated.sitePath
      );

      // Update project
      project.generated.deploymentUrl = deployment.url;
      project.generated.deploymentId = deployment.deploymentId;
      await this.storageService.updateProject(project.id, project);

      state.completedPhases.push(phase);
      this.emitProgress(state, 'completed', 100, 'Deployment completed');

      logWorkflowProgress(project.id, phase, 'completed', deployment);
    } catch (error: any) {
      state.failedPhases.push(phase);
      throw new WorkflowErr(`Deployment failed: ${error.message}`, phase, error);
    }
  }

  /**
   * Create workflow context
   */
  private async createContext(projectId: string): Promise<WorkflowContext> {
    // Get project data to create session
    const projectData = await this.storageService.getProject(projectId);
    if (!projectData) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const sessionId = await this.sessionService.create(projectId, projectData);

    return {
      projectId,
      workingDir: path.join(env.SESSION_DIR, sessionId),
      uploadDir: path.join(env.UPLOAD_DIR, projectId),
      outputDir: path.join(env.STORAGE_DIR, projectId, 'output'),
      sessionId,
    };
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    state: WorkflowState,
    status: WorkflowProgress['status'],
    progress: number,
    message: string,
    error?: WorkflowError
  ): void {
    const progressEvent: WorkflowProgress = {
      projectId: state.projectId,
      phase: state.currentPhase,
      status,
      progress,
      message,
      timestamp: new Date(),
      error,
    };

    state.progress.push(progressEvent);
    this.emit('progress', progressEvent);

    logWorkflowProgress(state.projectId, state.currentPhase, message, { progress, status });
  }
}
