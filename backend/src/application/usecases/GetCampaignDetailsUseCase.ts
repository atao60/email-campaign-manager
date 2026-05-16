import type { SentCampaign } from '@domain/models/Campaign';
import type { CampaignHistoryRepository } from '@domain/repositories';

export class GetCampaignDetailsUseCase {
  constructor(private readonly campaignHistoryRepo: CampaignHistoryRepository) {}

  public async execute(campaignId: string): Promise<SentCampaign | null> {
    const campaign = await this.campaignHistoryRepo.getById(campaignId);

    return campaign ?? null;
  }
}
