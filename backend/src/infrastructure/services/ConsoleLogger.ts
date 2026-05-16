import { error, log, warn } from 'node:console';

import { type LoggerPort } from '@domain/ports';

export class ConsoleLogger implements LoggerPort {
  public info(message: string, ...meta: unknown[]): void {
    if (meta.length > 0) {
      log(`[INFO] ${message}`, ...meta);
    } else {
      log(`[INFO] ${message}`);
    }
  }

  public warn(message: string, ...meta: unknown[]): void {
    if (meta.length > 0) {
      warn(`[WARN] ${message}`, ...meta);
    } else {
      warn(`[WARN] ${message}`);
    }
  }

  public error(message: string, err?: unknown): void {
    if (err) {
      error(`[ERROR] ${message}`, err);
    } else {
      error(`[ERROR] ${message}`);
    }
  }
}
