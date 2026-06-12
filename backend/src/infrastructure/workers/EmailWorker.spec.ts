import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';

import { EmailWorker } from './EmailWorker';
import type { EmailPort, LoggerPort, TimeProvider } from '@domain/ports';
import { type FailedEmailRepository } from '@domain/repositories/FailedEmailRepository';
import { Contact } from '@domain/models/Contact';

// 1. Mock external dependencies
const mockOn = vi.fn();
const mockClose = vi.fn();

vi.mock('bullmq', () => {
  // Use a standard 'function' here instead of an arrow function
  // so that it can be correctly instantiated with 'new Worker()'
  const Worker = vi.fn().mockImplementation(function () {
    return {
      on: mockOn,
      close: mockClose
    };
  });
  return { Worker };
});

vi.mock('ioredis', () => {
  // Use a standard 'function' here as well for 'new Redis()'
  const Redis = vi.fn().mockImplementation(function () {
    return {};
  });

  return { default: Redis };
});

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234')
}));

describe('EmailWorker', () => {
  let mockEmailPort: EmailPort;
  let mockFailedEmailRepo: FailedEmailRepository;
  let mockLogger: LoggerPort;
  let mockRedisClient: Redis;
  let mockTimeProvider: Mocked<TimeProvider>;
  let emailWorker: EmailWorker;

  const MOCK_NOW = new Date('2026-05-10T10:00:00Z');

  // Helper mock job data
  const mockJob = {
    id: 'job-123',
    data: {
      contact: {
        id: 'c-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@test.com',
        jobTitle: 'Dev',
        company: 'Acme'
      },
      message: {
        subject: 'Hello',
        bodyHtml: '<p>Hi Alice</p>',
        // Added attachments to verify they are seamlessly passed through the worker
        attachments: [{ filename: 'logo.png', path: '/tmp/logo.png', cid: 'logo.png' }]
      }
    }
  } as unknown as Job;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEmailPort = {
      send: vi.fn(),
      scheduleSend: vi.fn()
    };
    mockFailedEmailRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn().mockResolvedValue([])
    };
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    mockRedisClient = new Redis() as unknown as Redis;
    mockTimeProvider = { getCurrentDate: vi.fn(() => MOCK_NOW) };

    emailWorker = new EmailWorker(mockRedisClient, mockEmailPort, mockFailedEmailRepo, mockLogger, mockTimeProvider);
  });

  // --- Helper Functions to extract mocked BullMQ internals ---
  const getProcessor = (): ((job: Job) => Promise<void>) => {
    // The processor is the second argument passed to the Worker constructor
    return vi.mocked(Worker).mock.calls[0]?.[1] as unknown as (job: Job) => Promise<void>;
  };

  const getEventHandler = (eventName: string): ((...args: unknown[]) => unknown) => {
    // Find the call to .on() that matches the event name and return its callback
    const call = mockOn.mock.calls.find((c) => c[0] === eventName);
    if (!call) throw new Error(`Event handler for ${eventName} not found`);
    return call[1];
  };

  describe('Initialization', () => {
    it('should initialize the BullMQ worker on the correct queue', () => {
      expect(Worker).toHaveBeenCalledWith('email-queue', expect.any(Function), { connection: mockRedisClient });
      expect(mockOn).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('failed', expect.any(Function));
    });
  });

  describe('Job Processor logic', () => {
    it('should reconstruct the Contact domain object and call the actual mailer', async () => {
      const processor = getProcessor();

      await processor(mockJob);

      // Verify the contact was reconstructed correctly
      expect(mockEmailPort.send).toHaveBeenCalledTimes(1);

      const passedContact = vi.mocked(mockEmailPort.send).mock.calls[0]?.[0];
      expect(passedContact).toBeInstanceOf(Contact);
      expect(passedContact?.id).toBe('c-1');
      expect(passedContact?.email).toBe('alice@test.com');

      // Verify the message payload was passed
      const passedMessage = vi.mocked(mockEmailPort.send).mock.calls[0]?.[1];
      expect(passedMessage).toEqual(mockJob.data.message);
      expect(passedMessage!.attachments).toHaveLength(1);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Processing email job job-123 for alice@test.com');
    });

    it('should bubble up errors thrown by the mailer so BullMQ can catch them', async () => {
      const processor = getProcessor();
      const sendError = new Error('SMTP Connection Refused');
      vi.mocked(mockEmailPort.send).mockRejectedValueOnce(sendError);

      await expect(processor(mockJob)).rejects.toThrow('SMTP Connection Refused');
    });
  });

  describe('Event Listeners', () => {
    it('should log an info message when a job completes successfully', () => {
      const onCompleted = getEventHandler('completed');

      onCompleted(mockJob);

      expect(mockLogger.info).toHaveBeenCalledWith('Job job-123 completed successfully');
    });

    it('should log an error and save a FailedEmail record when a job fails', async () => {
      const onFailed = getEventHandler('failed');
      const mockError = new Error('Bounced email');

      await onFailed(mockJob, mockError);

      expect(mockLogger.error).toHaveBeenCalledWith('Job job-123 failed for alice@test.com', mockError);

      // Verify the FailedEmail entity was saved with the right properties
      expect(mockFailedEmailRepo.save).toHaveBeenCalledTimes(1);
      const savedFailure = vi.mocked(mockFailedEmailRepo.save).mock.calls[0]?.[0];

      expect(savedFailure?.id).toBe('mock-uuid-1234');
      expect(savedFailure?.contactId).toBe('c-1');
      expect(savedFailure?.emailAddress).toBe('alice@test.com');
      expect(savedFailure?.reason).toBe('Bounced email');
      expect(savedFailure?.failedAt).toEqual(MOCK_NOW); // Proves the mocked date was used
    });

    it('should log a CRITICAL error if saving the failure record to the repository fails', async () => {
      const onFailed = getEventHandler('failed');
      const jobError = new Error('Bounced email');
      const dbError = new Error('Database is down');

      // Force the repository to throw
      vi.mocked(mockFailedEmailRepo.save).mockRejectedValueOnce(dbError);

      await onFailed(mockJob, jobError);

      // It should catch the repo error and log it as critical
      expect(mockLogger.error).toHaveBeenCalledWith('CRITICAL: Failed to save failure record to repository', dbError);
    });

    it('should gracefully handle a missing job object in the failure handler', async () => {
      const onFailed = getEventHandler('failed');
      const mockError = new Error('Internal queue error');

      await onFailed(undefined, mockError);

      expect(mockLogger.error).toHaveBeenCalledWith('Job undefined failed for undefined', mockError);
      expect(mockFailedEmailRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should gracefully close the worker', async () => {
      await emailWorker.close();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
