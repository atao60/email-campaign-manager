import type { AppDependencies, DependencyToken } from './Types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { iocContainer } from '@config/tsoa-ioc';

// Type for a function that manufactures a service (Factory).
// It receives the container itself to resolve its own dependencies recursively.
type Factory<T> = (container: DiContainer) => T;

/**
 * Dependency Injection Container (IoC Container).
 * Implements the Singleton pattern to be accessible globally.
 * Handles lazy instantiation (Lazy Loading) of services.
 *
 * Note. This container only holds the Use Cases (e.g., DI_TYPES.GetCampaignStatusUseCase),
 * but it does not have the controllers registered inside it. @see {@link iocContainer}
 */
export class DiContainer {
  private static instance: DiContainer;

  // Cache of already existing instances (Singletons)
  private readonly services = new Map<DependencyToken, unknown>();
  // Storage for factory recipes
  private readonly factories = new Map<DependencyToken, Factory<unknown>>();

  private constructor() {}

  /**
   * Global access point to the container.
   */
  public static getInstance(): DiContainer {
    if (!DiContainer.instance) {
      DiContainer.instance = new DiContainer();
    }
    return DiContainer.instance;
  }

  /**
   * Registers a recipe to create a service.
   * The service will only be instantiated upon the first call to resolve().
   * * @param key The identification symbol (Token) (see GTNTypes)
   * @param factory The function that creates the instance
   */
  public registerSingleton<T>(key: DependencyToken, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  /**
   * Registers an already existing instance (useful for mocks or config).
   * * @param key The identification symbol
   * @param instance The ready-to-use instance
   */
  public registerInstance<T>(key: DependencyToken, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * Resolves (retrieves) a service.
   * If the service does not exist yet, it is created via its factory.
   *
   * @param key The identification symbol
   * @returns The requested service instance
   * @throws Error if no provider is found for the key
   */
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

  /**
   * Clears the container.
   * Destroys all instances and removes all factories.
   * Crucial for ensuring isolation between unit/integration tests.
   */
  public clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  /**
   * Checks if a service is already registered (either as an active instance or a factory).
   * Useful for avoiding duplicate registrations or verifying test setup.
   */
  public isRegistered(key: DependencyToken): boolean {
    return this.services.has(key) || this.factories.has(key);
  }
}
