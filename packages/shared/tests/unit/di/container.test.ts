import { ServiceContainer, SERVICE_KEYS } from '../../../src/di/container';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('register and resolve', () => {
    it('should register and resolve a singleton service', () => {
      const mockService = { name: 'test-service' };
      container.register('test', mockService);

      const resolved = container.resolve('test');
      expect(resolved).toBe(mockService);
    });

    it('should register and resolve a service from factory', () => {
      const mockService = { name: 'test-service' };
      const factory = jest.fn(() => mockService);

      container.register('test', factory);
      const resolved = container.resolve('test');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(resolved).toBe(mockService);
    });

    it('should return same instance for singleton services', () => {
      const factory = jest.fn(() => ({ name: 'test-service' }));

      container.register('test', factory, true);
      const resolved1 = container.resolve('test');
      const resolved2 = container.resolve('test');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(resolved1).toBe(resolved2);
    });

    it('should return new instances for non-singleton services', () => {
      const factory = jest.fn(() => ({ name: 'test-service' }));

      container.register('test', factory, false);
      const resolved1 = container.resolve('test');
      const resolved2 = container.resolve('test');

      expect(factory).toHaveBeenCalledTimes(2);
      expect(resolved1).not.toBe(resolved2);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => container.resolve('unknown')).toThrow('Service "unknown" is not registered');
    });
  });

  describe('has', () => {
    it('should return true for registered services', () => {
      container.register('test', { name: 'test' });
      expect(container.has('test')).toBe(true);
    });

    it('should return false for unregistered services', () => {
      expect(container.has('unknown')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister a service', () => {
      container.register('test', { name: 'test' });
      expect(container.has('test')).toBe(true);

      container.unregister('test');
      expect(container.has('test')).toBe(false);
    });

    it('should remove singleton instances', () => {
      const factory = jest.fn(() => ({ name: 'test' }));
      container.register('test', factory);

      container.resolve('test');
      expect(factory).toHaveBeenCalledTimes(1);

      container.unregister('test');
      container.register('test', factory);
      container.resolve('test');

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('should clear all services', () => {
      container.register('test1', { name: 'test1' });
      container.register('test2', { name: 'test2' });

      expect(container.has('test1')).toBe(true);
      expect(container.has('test2')).toBe(true);

      container.clear();

      expect(container.has('test1')).toBe(false);
      expect(container.has('test2')).toBe(false);
    });
  });

  describe('getRegisteredServices', () => {
    it('should return all registered service keys', () => {
      container.register('test1', { name: 'test1' });
      container.register('test2', { name: 'test2' });
      container.register('test3', { name: 'test3' });

      const services = container.getRegisteredServices();
      expect(services).toHaveLength(3);
      expect(services).toContain('test1');
      expect(services).toContain('test2');
      expect(services).toContain('test3');
    });

    it('should return empty array when no services registered', () => {
      const services = container.getRegisteredServices();
      expect(services).toHaveLength(0);
    });
  });

  describe('SERVICE_KEYS', () => {
    it('should have standard service keys', () => {
      expect(SERVICE_KEYS.STORAGE).toBe('storage');
      expect(SERVICE_KEYS.SESSION).toBe('session');
      expect(SERVICE_KEYS.GIT).toBe('git');
      expect(SERVICE_KEYS.DEPLOYMENT).toBe('deployment');
    });
  });

  describe('real-world scenarios', () => {
    it('should support dependency injection pattern', () => {
      // Mock services
      class MockStorageService {
        upload = jest.fn();
      }

      class MockSessionService {
        constructor(private storage: any) {}
        save = jest.fn(() => this.storage.upload());
      }

      // Register storage
      const storageService = new MockStorageService();
      container.register(SERVICE_KEYS.STORAGE, storageService);

      // Register session with storage dependency
      container.register(SERVICE_KEYS.SESSION, () => {
        const storage = container.resolve(SERVICE_KEYS.STORAGE);
        return new MockSessionService(storage);
      });

      // Resolve and use
      const sessionService = container.resolve<MockSessionService>(SERVICE_KEYS.SESSION);
      sessionService.save();

      expect(storageService.upload).toHaveBeenCalled();
    });
  });
});
