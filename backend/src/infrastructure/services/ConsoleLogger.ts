import { type LoggerPort } from '@domain/ports/LoggerPort';

export class ConsoleLogger implements LoggerPort {
  public info(message: string, ...meta: unknown[]): void {
    if (meta.length > 0) {
      console.log(`[INFO] ${message}`, ...meta);
    } else {
      console.log(`[INFO] ${message}`);
    }
  }

  public warn(message: string, ...meta: unknown[]): void {
    if (meta.length > 0) {
      console.warn(`[WARN] ${message}`, ...meta);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  public error(message: string, error?: unknown): void {
    if (error) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
}
