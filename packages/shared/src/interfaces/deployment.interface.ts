/**
 * Deployment Service Interface
 * Abstracts deployment operations (local PHP server, Vercel, Netlify, etc.)
 */
export interface IDeploymentService {
  /**
   * Deploy a site
   * @param projectId - Unique project identifier
   * @param buildPath - Path to the built site
   * @returns Deployment result with URL
   */
  deploy(projectId: string, buildPath: string): Promise<DeploymentResult>;

  /**
   * Get deployment status
   * @param deploymentId - Unique deployment identifier
   * @returns Deployment status information
   */
  getStatus(deploymentId: string): Promise<DeploymentStatus>;

  /**
   * Rollback to a previous deployment
   * @param deploymentId - Deployment ID to rollback to
   */
  rollback(deploymentId: string): Promise<void>;

  /**
   * Stop a deployment
   * @param deploymentId - Unique deployment identifier
   */
  stop(deploymentId: string): Promise<void>;

  /**
   * Delete a deployment
   * @param deploymentId - Unique deployment identifier
   */
  delete(deploymentId: string): Promise<void>;

  /**
   * List all deployments for a project
   * @param projectId - Unique project identifier
   * @returns Array of deployments
   */
  listDeployments(projectId: string): Promise<Deployment[]>;
}

export interface DeploymentResult {
  deploymentId: string;
  url: string;
  status: 'deploying' | 'ready' | 'error';
  message?: string;
}

export interface DeploymentStatus {
  deploymentId: string;
  status: 'deploying' | 'building' | 'ready' | 'error' | 'stopped';
  url?: string;
  error?: string;
  createdAt: Date;
  readyAt?: Date;
}

export interface Deployment {
  deploymentId: string;
  projectId: string;
  url: string;
  status: 'deploying' | 'ready' | 'error' | 'stopped';
  createdAt: Date;
  readyAt?: Date;
}
