import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GetCampaignDetailsUseCase } from './GetCampaignDetailsUseCase';
import type { CampaignHistoryRepository } from '@domain/repositories/CampaignHistoryRepository';
import type { SentCampaign } from '@domain/models/Campaign';

describe('GetCampaignDetailsUseCase', () => {
  let mockHistoryRepo: CampaignHistoryRepository;
  let useCase: GetCampaignDetailsUseCase;

  const mockCampaign: SentCampaign = {
    id: 'camp_123',
    subject: 'Monthly Newsletter',
    sentDate: '2026-05-10T10:00:00Z',
    totalSent: 1,
    status: 'COMPLETED',
    htmlContent: '<h1>Hello</h1>',
    emails: [{ address: 'test@example.com', status: 'OK' }]
  };

  beforeEach(() => {
    // 1. Mock the repository interface
    mockHistoryRepo = {
      save: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      updateEmailStatus: vi.fn()
    };

    // 2. Inject the mock into the Use Case
    useCase = new GetCampaignDetailsUseCase(mockHistoryRepo);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the campaign details if the campaign exists', async () => {
    // Setup the mock to return our dummy campaign
    vi.mocked(mockHistoryRepo.getById).mockResolvedValue(mockCampaign);

    const result = await useCase.execute('camp_123');

    // Verify the repository was called with the correct ID
    expect(mockHistoryRepo.getById).toHaveBeenCalledTimes(1);
    expect(mockHistoryRepo.getById).toHaveBeenCalledWith('camp_123');

    // Verify the result matches what the repository returned
    expect(result).toEqual(mockCampaign);
  });

  it('should return null if the campaign does not exist', async () => {
    // Setup the mock to simulate a missing file/record
    vi.mocked(mockHistoryRepo.getById).mockResolvedValue(null);

    const result = await useCase.execute('missing_camp');

    expect(mockHistoryRepo.getById).toHaveBeenCalledWith('missing_camp');
    expect(result).toBeNull();
  });

  it('should bubble up errors thrown by the repository', async () => {
    // Simulate a database/filesystem crash
    const dbError = new Error('Database connection failed');
    vi.mocked(mockHistoryRepo.getById).mockRejectedValue(dbError);

    // Ensure the Use Case doesn't swallow the error
    await expect(useCase.execute('camp_123')).rejects.toThrow('Database connection failed');
  });
});
