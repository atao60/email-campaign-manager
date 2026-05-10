import { describe, it, expect, vi, beforeEach } from 'vitest';

import { UpdateDeliveryStatusUseCase } from './UpdateDeliveryStatusUseCase';
import type { CampaignHistoryRepository } from '@domain/repositories/CampaignHistoryRepository';

describe('UpdateDeliveryStatusUseCase', () => {
  let mockHistoryRepo: CampaignHistoryRepository;
  let useCase: UpdateDeliveryStatusUseCase;

  beforeEach(() => {
    // Mock the repository interface
    mockHistoryRepo = {
      save: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      updateEmailStatus: vi.fn() // The method we are testing
    };

    useCase = new UpdateDeliveryStatusUseCase(mockHistoryRepo);
  });

  it('should delegate the status update directly to the repository', async () => {
    const campaignId = 'camp_123';
    const emailAddress = 'test@example.com';
    const newStatus = 'OK';
    const reason = 'Delivered successfully';

    await useCase.execute(campaignId, emailAddress, newStatus, reason);

    // Verify that the repository was called with the exact parameters
    expect(mockHistoryRepo.updateEmailStatus).toHaveBeenCalledTimes(1);
    expect(mockHistoryRepo.updateEmailStatus).toHaveBeenCalledWith(campaignId, emailAddress, newStatus, reason);
  });

  it('should handle updates without a reason', async () => {
    const campaignId = 'camp_123';
    const emailAddress = 'test@example.com';
    const newStatus = 'FAILED';

    await useCase.execute(campaignId, emailAddress, newStatus);

    expect(mockHistoryRepo.updateEmailStatus).toHaveBeenCalledWith(campaignId, emailAddress, newStatus, undefined);
  });
});
