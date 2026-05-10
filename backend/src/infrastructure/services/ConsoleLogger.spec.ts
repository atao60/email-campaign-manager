import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, warn, error } from 'node:console';

import { ConsoleLogger } from './ConsoleLogger';

vi.mock('node:console', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();

    // Clear mock history between tests to prevent call counts from leaking
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore the original console behavior after each test
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should log a message with the [INFO] prefix', () => {
      logger.info('Application started');

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('[INFO] Application started');
    });

    it('should log a message and spread additional metadata', () => {
      const metaObj = { userId: 123 };
      const metaString = 'extra-data';

      logger.info('User logged in', metaObj, metaString);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('[INFO] User logged in', metaObj, metaString);
    });
  });

  describe('warn', () => {
    it('should log a warning with the [WARN] prefix', () => {
      logger.warn('Disk space low');

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[WARN] Disk space low');
    });

    it('should log a warning and spread additional metadata', () => {
      const remainingBytes = 500;

      logger.warn('Disk space low', remainingBytes);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[WARN] Disk space low', remainingBytes);
    });
  });

  describe('error', () => {
    it('should log an error with the [ERROR] prefix', () => {
      logger.error('Failed to connect to database');

      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith('[ERROR] Failed to connect to database');
    });

    it('should log an error message along with the error object', () => {
      const dbError = new Error('Connection timeout');

      logger.error('Failed to connect to database', dbError);

      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith('[ERROR] Failed to connect to database', dbError);
    });
  });
});
