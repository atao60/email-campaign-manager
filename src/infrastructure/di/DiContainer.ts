import type { AppDependencies, DependencyToken } from './Types';

// Type for a function that manufactures a service (Factory).
// It receives the container itself to resolve its own dependencies recursively.
type Factory<T> = (container: DiContainer) => T;

/**
 * Dependency Injection Container (IoC Container).
 * Implements the Singleton pattern to be accessible globally.
 * Handles lazy instantiation (Lazy Loading) of services.
 */
export class DiContainer {
  private static instance: DiContainer;

  private readonly services = new Map<DependencyToken, unknown>();
  private readonly factories = new Map<DependencyToken, Factory<unknown>>();

  private constructor() {}

  public static getInstance(): DiContainer {
    if (!DiContainer.instance) {
      DiContainer.instance = new DiContainer();
    }
    return DiContainer.instance;
  }

  public registerSingleton<T>(key: DependencyToken, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  public registerInstance<T>(key: DependencyToken, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * By using a generic constraint K that extends keyof AppDependencies,
   * TypeScript automatically knows exactly what this method returns based on the token!
   */
  public resolve<K extends keyof AppDependencies>(key: K): AppDependencies[K];
  public resolve<T>(key: DependencyToken): T; // Fallback for unmapped internal infra types
  public resolve<T>(key: DependencyToken): T {
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`DI Error: No service registered for key ${String(key)}`);
    }

    const instance = factory(this) as T;
    this.services.set(key, instance);

    return instance;
  }

  public clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  public isRegistered(key: DependencyToken): boolean {
    return this.services.has(key) || this.factories.has(key);
  }
}
