/**
 * Server entry point
 * Initializes and starts the API server
 */
import { createApp } from './app';
import { Server } from './server';
import { setupDependencyInjection, cleanupServices } from './config/di-setup';
import { logger } from './config/logger';
import { env } from './config/env';

/**
 * Initialize and start the server
 */
async function main() {
  try {
    logger.info('Starting Kirby-Gen API server...');

    // Setup dependency injection
    setupDependencyInjection();

    // Create Express app
    const app = createApp();

    // Create and start server
    const server = new Server(app);
    await server.start();

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      try {
        // Stop accepting new connections
        await server.stop();

        // Cleanup services
        await cleanupServices();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });

    logger.info('Server is ready to accept requests');
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
main();
