import type { CampaignHistoryRepository } from '@domain/repositories';
import type { CampaignSummary } from '@presentation/rest/dto';

export class GetCampaignsUseCase {
  constructor(private readonly campaignHistoryRepo: CampaignHistoryRepository) {}

  /**
   * Retrieves all historical campaigns and transforms them into
   * summaries DTO for the presentation layer.
   */
  public async execute(): Promise<CampaignSummary[]> {
    const campaigns = await this.campaignHistoryRepo.getAll();

    return campaigns;
  }
}
