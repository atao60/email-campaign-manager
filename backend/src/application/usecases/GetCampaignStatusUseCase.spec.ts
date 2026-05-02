import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GetCampaignStatusUseCase } from './GetCampaignStatusUseCase';
import { type QueueMonitorPort } from '@domain/ports/QueueMonitorPort';
import { type FailedEmailRepositoryPort } from '@domain/ports/FailedEmailRepositoryPort';
import { FailedEmail } from '@domain/models/FailedEmail';
import { type ContactId, type FailedEmailId } from '@domain/models/BrandedTypes';

describe('GetCampaignStatusUseCase', () => {
  let mockQueueMonitor: QueueMonitorPort;
  let mockFailedEmailRepo: FailedEmailRepositoryPort;
  let useCase: GetCampaignStatusUseCase;

  beforeEach(() => {
    mockQueueMonitor = {
      getMetrics: vi.fn()
    };
    mockFailedEmailRepo = {
      save: vi.fn(),
      findAll: vi.fn()
    };

    useCase = new GetCampaignStatusUseCase(mockQueueMonitor, mockFailedEmailRepo);
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
    expect(status).toEqual({
      waiting: 10,
      active: 2,
      completed: 50,
      failed: 1,
      hardFailures: 3 // Length of the mock array
    });
  });
});
