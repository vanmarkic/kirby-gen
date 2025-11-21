/**
 * Dependency Injection Container Setup
 * Registers all services for the application
 */
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import {
  LocalStorageService,
  LocalSessionService,
  LocalDeploymentService,
} from '../services/local';
import { env } from './env';
import { logger } from './logger';

/**
 * Initialize and configure the DI container
 */
export function setupDependencyInjection(): void {
  logger.info('Setting up dependency injection container');

  try {
    // Register Storage Service
    container.register(
      SERVICE_KEYS.STORAGE,
      () =>
        new LocalStorageService({
          basePath: env.STORAGE_DIR,
          createDirectories: true,
        }),
      true // singleton
    );

    // Register Session Service
    container.register(
      SERVICE_KEYS.SESSION,
      () =>
        new LocalSessionService({
          basePath: env.SESSION_DIR,
          createDirectories: true,
        }),
      true
    );

    // Register Deployment Service
    container.register(
      SERVICE_KEYS.DEPLOYMENT,
      () =>
        new LocalDeploymentService({
          basePath: env.DEPLOYMENT_DIR,
          portStart: env.DEPLOYMENT_PORT_START,
          createDirectories: true,
        }),
      true
    );

    logger.info('Dependency injection container configured successfully', {
      services: container.getRegisteredServices(),
    });
  } catch (error) {
    logger.error('Failed to setup dependency injection', { error });
    throw error;
  }
}

/**
 * Get a service from the container
 */
export function getService<T>(key: string): T {
  return container.resolve<T>(key);
}

/**
 * Cleanup function for graceful shutdown
 */
export async function cleanupServices(): Promise<void> {
  logger.info('Cleaning up services');

  try {
    // TODO: Add deployment cleanup when we have a way to list all deployments
    // across all projects. Currently listDeployments() requires a projectId.

    logger.info('Services cleaned up successfully');
  } catch (error) {
    logger.error('Error during service cleanup', { error });
  }
}
