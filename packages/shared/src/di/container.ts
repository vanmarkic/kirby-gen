/**
 * Dependency Injection Container
 * Manages service registration and resolution
 */
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  /**
   * Register a service
   * @param key - Service identifier
   * @param implementation - Service implementation or factory function
   * @param singleton - Whether to create a single instance (default: true)
   */
  register<T>(key: string, implementation: T | (() => T), singleton = true): void {
    if (singleton && typeof implementation === 'function') {
      // Store factory function for lazy initialization
      this.services.set(key, { factory: implementation, singleton: true });
    } else if (singleton) {
      // Store instance directly as singleton
      this.singletons.set(key, implementation);
      this.services.set(key, { singleton: true });
    } else {
      // Store factory function for new instances
      this.services.set(key, { factory: implementation, singleton: false });
    }
  }

  /**
   * Resolve a service
   * @param key - Service identifier
   * @returns Service instance
   * @throws Error if service is not registered
   */
  resolve<T>(key: string): T {
    const service = this.services.get(key);

    if (!service) {
      throw new Error(`Service "${key}" is not registered`);
    }

    // Return existing singleton
    if (service.singleton && this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    // Create new singleton from factory
    if (service.singleton && service.factory) {
      const instance = service.factory();
      this.singletons.set(key, instance);
      return instance;
    }

    // Create new instance from factory
    if (service.factory) {
      return service.factory();
    }

    throw new Error(`Service "${key}" cannot be resolved`);
  }

  /**
   * Check if a service is registered
   * @param key - Service identifier
   * @returns True if service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Unregister a service
   * @param key - Service identifier
   */
  unregister(key: string): void {
    this.services.delete(key);
    this.singletons.delete(key);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service keys
   * @returns Array of service keys
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }
}

// Global container instance
export const container = new ServiceContainer();

// Service keys constants
export const SERVICE_KEYS = {
  STORAGE: 'storage',
  SESSION: 'session',
  DEPLOYMENT: 'deployment',
} as const;

export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS];
