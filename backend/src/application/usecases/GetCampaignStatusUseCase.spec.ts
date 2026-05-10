import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GetCampaignStatusUseCase } from './GetCampaignStatusUseCase';
import { type QueueMonitorPort } from '@domain/ports/QueueMonitorPort';
import { type FailedEmailRepository } from '@domain/repositories/FailedEmailRepository';
import { FailedEmail } from '@domain/models/FailedEmail';
import { type ContactId, type FailedEmailId } from '@domain/models/BrandedTypes';

describe('GetCampaignStatusUseCase', () => {
  let mockQueueMonitor: QueueMonitorPort;
  let mockFailedEmailRepo: FailedEmailRepository;
  let useCase: GetCampaignStatusUseCase;

  beforeEach(() => {
    // Create mock implementations
    mockQueueMonitor = {
      getMetrics: vi.fn()
    };
    mockFailedEmailRepo = {
      save: vi.fn(),
      findAll: vi.fn()
    };

    // Inject the mocks into the Use Case
    useCase = new GetCampaignStatusUseCase(mockQueueMonitor, mockFailedEmailRepo);
  });

  afterEach(() => {
    // Always restore mocks to prevent cross-test pollution
    vi.restoreAllMocks();
  });

  it('should aggregate live queue metrics with hard failure counts', async () => {
    // Mock BullMQ metrics
    vi.mocked(mockQueueMonitor.getMetrics).mockResolvedValue({
      waiting: 10,
      active: 2,
      completed: 50,
      failed: 1 // Soft queue failures
    });

    // Mock 3 permanent hard failures in the JSON file
    const mockFailures = [
      new FailedEmail('f-1' as FailedEmailId, 'c-1' as ContactId, 'a@test.com', 'Error 1', new Date()),
      new FailedEmail('f-2' as FailedEmailId, 'c-2' as ContactId, 'b@test.com', 'Error 2', new Date()),
      new FailedEmail('f-3' as FailedEmailId, 'c-3' as ContactId, 'c@test.com', 'Error 3', new Date())
    ];
    vi.mocked(mockFailedEmailRepo.findAll).mockResolvedValue(mockFailures);

    const status = await useCase.execute();

    expect(mockQueueMonitor.getMetrics).toHaveBeenCalledWith('email-queue');
    expect(mockFailedEmailRepo.findAll).toHaveBeenCalled();
    expect(status).toEqual({
      waiting: 10,
      active: 2,
      completed: 50,
      failed: 1,
      hardFailures: 3 // Length of the mock array
    });
  });

  it('should return 0 hard failures if the failed emails repository is empty', async () => {
    // Mock empty queue metrics
    vi.mocked(mockQueueMonitor.getMetrics).mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 100,
      failed: 0
    });

    // Mock empty hard failures
    vi.mocked(mockFailedEmailRepo.findAll).mockResolvedValue([]);

    const status = await useCase.execute();

    expect(status).toEqual({
      waiting: 0,
      active: 0,
      completed: 100,
      failed: 0,
      hardFailures: 0
    });
  });
});
