/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DiContainer } from './DiContainer';

describe('DiContainer', () => {
  let container: DiContainer;

  // Use a mix of strings and Symbols to test the DependencyToken union type
  const TOKEN_A = Symbol('TOKEN_A') as any;
  const TOKEN_B = 'TOKEN_B' as any;

  beforeEach(() => {
    // Get the singleton instance and clear it before each test
    // to ensure complete test isolation.
    container = DiContainer.getInstance();
    container.clear();
  });

  describe('Singleton Pattern', () => {
    it('should always return the exact same container instance', () => {
      const instance1 = DiContainer.getInstance();
      const instance2 = DiContainer.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('registerInstance() & resolve()', () => {
    it('should register a pre-built instance and resolve it correctly', () => {
      const mockDatabase = { connect: vi.fn() };

      container.registerInstance(TOKEN_A, mockDatabase);
      const resolved = container.resolve<typeof mockDatabase>(TOKEN_A);

      expect(resolved).toBe(mockDatabase);
    });
  });

  describe('registerSingleton() & Lazy Loading', () => {
    it('should lazily evaluate the factory only upon the first resolve call', () => {
      const factorySpy = vi.fn(() => ({ name: 'LazyService' }));

      // Register the factory
      container.registerSingleton(TOKEN_A, factorySpy);

      // Factory should NOT have been called yet
      expect(factorySpy).not.toHaveBeenCalled();

      // First resolve
      const instance1 = container.resolve(TOKEN_A);
      expect(factorySpy).toHaveBeenCalledTimes(1);
      expect(instance1).toEqual({ name: 'LazyService' });

      // Second resolve
      const instance2 = container.resolve(TOKEN_A);
      // Factory should still only have been called once (cached)
      expect(factorySpy).toHaveBeenCalledTimes(1);
      // It should return the exact same cached reference
      expect(instance1).toBe(instance2);
    });

    it('should allow a factory to resolve its own dependencies from the container', () => {
      // 1. Register a primitive dependency
      container.registerInstance('CONFIG' as any, { port: 8080 });

      // 2. Register a service that depends on the config
      container.registerSingleton('SERVER' as any, (c) => {
        const config = c.resolve<{ port: number }>('CONFIG' as any);
        return `Server running on port ${config.port}`;
      });

      const server = container.resolve<string>('SERVER' as any);
      expect(server).toBe('Server running on port 8080');
    });
  });

  describe('Error Handling', () => {
    it('should throw a descriptive error when trying to resolve an unregistered token', () => {
      const UNKNOWN_TOKEN = Symbol('UNKNOWN');

      expect(() => {
        container.resolve(UNKNOWN_TOKEN as any);
      }).toThrow(`DI Error: No service registered for key Symbol(UNKNOWN)`);
    });
  });

  describe('isRegistered()', () => {
    it('should return false for unregistered tokens', () => {
      expect(container.isRegistered('MISSING' as any)).toBe(false);
    });

    it('should return true for a token registered via registerInstance', () => {
      container.registerInstance(TOKEN_A, {});
      expect(container.isRegistered(TOKEN_A)).toBe(true);
    });

    it('should return true for a token registered via registerSingleton (even if uninstantiated)', () => {
      container.registerSingleton(TOKEN_B, () => ({}));
      expect(container.isRegistered(TOKEN_B)).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should wipe out all factories and cached instances', () => {
      container.registerInstance(TOKEN_A, { id: 1 });
      container.registerSingleton(TOKEN_B, () => ({ id: 2 }));

      // Force the singleton to instantiate so it's in the instances cache
      container.resolve(TOKEN_B);

      expect(container.isRegistered(TOKEN_A)).toBe(true);
      expect(container.isRegistered(TOKEN_B)).toBe(true);

      // Wipe it
      container.clear();

      expect(container.isRegistered(TOKEN_A)).toBe(false);
      expect(container.isRegistered(TOKEN_B)).toBe(false);

      expect(() => container.resolve(TOKEN_A)).toThrow();
      expect(() => container.resolve(TOKEN_B)).toThrow();
    });
  });
});
