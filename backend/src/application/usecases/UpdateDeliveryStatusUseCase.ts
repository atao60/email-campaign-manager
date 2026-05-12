import type { CampaignHistoryRepository } from '../../domain/repositories/CampaignHistoryRepository';

export class UpdateDeliveryStatusUseCase {
  constructor(private readonly historyRepo: CampaignHistoryRepository) {}

  public async execute(
    campaignId: string,
    emailAddress: string,
    newStatus: 'OK' | 'FAILED',
    reason?: string
  ): Promise<void> {
    // We delegate directly to the repository method we just built.
    // The FileSystem adapter uses `async-lock` inside this method to safely
    // handle the Read-Modify-Write process without race conditions.
    await this.historyRepo.updateEmailStatus(campaignId, emailAddress, newStatus, reason);
  }
}
