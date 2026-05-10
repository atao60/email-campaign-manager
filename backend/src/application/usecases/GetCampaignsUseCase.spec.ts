import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GetCampaignsUseCase } from './GetCampaignsUseCase';
import type { CampaignHistoryRepository } from '@domain/repositories/CampaignHistoryRepository';
import type { SentCampaign } from '@domain/models/Campaign';

describe('GetCampaignsUseCase', () => {
  let mockHistoryRepo: CampaignHistoryRepository;
  let useCase: GetCampaignsUseCase;

  beforeEach(() => {
    // 1. Mock the repository interface
    mockHistoryRepo = {
      save: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      updateEmailStatus: vi.fn()
    };

    // 2. Inject the mock into the Use Case
    useCase = new GetCampaignsUseCase(mockHistoryRepo);
  });

  afterEach(() => {
    // Restore mocks to prevent cross-test pollution
    vi.restoreAllMocks();
  });

  it('should return a list of campaigns from the repository', async () => {
    // Setup the mock to return an array of dummy campaigns
    const mockCampaigns: SentCampaign[] = [
      {
        id: 'camp_1',
        subject: 'Newsletter May',
        sentDate: '2026-05-10T10:00:00Z',
        totalSent: 100,
        status: 'COMPLETED',
        htmlContent: '<h1>Hello</h1>',
        emails: []
      },
      {
        id: 'camp_2',
        subject: 'Welcome Series',
        sentDate: '2026-05-11T12:00:00Z',
        totalSent: 5,
        status: 'PARTIAL',
        htmlContent: '<p>Welcome!</p>',
        emails: []
      }
    ];
    vi.mocked(mockHistoryRepo.getAll).mockResolvedValue(mockCampaigns);

    const result = await useCase.execute();

    // Verify the repository was called exactly once
    expect(mockHistoryRepo.getAll).toHaveBeenCalledTimes(1);

    // Verify the result matches what the repository returned
    expect(result).toEqual(mockCampaigns);
  });

  it('should return an empty array if there are no historical campaigns', async () => {
    // Setup the mock to simulate an empty database/filesystem
    vi.mocked(mockHistoryRepo.getAll).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(mockHistoryRepo.getAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should bubble up errors thrown by the repository', async () => {
    // Simulate a database/filesystem crash during the read operation
    const fileSystemError = new Error('Permission denied');
    vi.mocked(mockHistoryRepo.getAll).mockRejectedValue(fileSystemError);

    // Ensure the Use Case doesn't swallow the error
    await expect(useCase.execute()).rejects.toThrow('Permission denied');
  });
});
