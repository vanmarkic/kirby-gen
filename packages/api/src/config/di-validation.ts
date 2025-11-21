/**
 * DI Container validation
 *
 * POKA-YOKE: Validates that all required services are registered in the
 * DI container at startup, preventing runtime "service not found" errors.
 *
 * Benefits:
 * - Fails fast on missing service registrations
 * - Clear error messages identify which services are missing
 * - Prevents cascading failures from unregistered dependencies
 */
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { logger } from './logger';

/**
 * Validate that all required services are registered
 *
 * @throws Error if any required service is not registered
 */
export function validateDIContainer(): void {
  const requiredServices = Object.entries(SERVICE_KEYS);
  const missing: string[] = [];
  const failed: Array<{ key: string; error: string }> = [];

  logger.info('Validating DI container service registrations...');

  for (const [name, key] of requiredServices) {
    try {
      const service = container.resolve(key);
      if (!service) {
        missing.push(`${name} (${key})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      failed.push({ key: `${name} (${key})`, error: errorMessage });
    }
  }

  // Report results
  if (missing.length > 0 || failed.length > 0) {
    logger.error('❌ DI Container validation failed');

    if (missing.length > 0) {
      logger.error('Missing service registrations:');
      missing.forEach((service) => logger.error(`  - ${service}`));
    }

    if (failed.length > 0) {
      logger.error('Failed to resolve services:');
      failed.forEach(({ key, error }) => {
        logger.error(`  - ${key}: ${error}`);
      });
    }

    throw new Error(
      `DI Container validation failed:\n` +
        `  Missing: ${missing.length}\n` +
        `  Failed: ${failed.length}\n` +
        `  Check packages/api/src/config/di-setup.ts`
    );
  }

  logger.info(`✓ DI Container validated: ${requiredServices.length} services registered`);
}

/**
 * Validate a specific service
 * Useful for testing individual service registrations
 */
export function validateService<T>(key: string, serviceName?: string): T {
  try {
    const service = container.resolve<T>(key);
    if (!service) {
      throw new Error(`Service ${serviceName || key} resolved to null/undefined`);
    }
    return service;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to validate service ${serviceName || key}: ${errorMessage}`
    );
  }
}
