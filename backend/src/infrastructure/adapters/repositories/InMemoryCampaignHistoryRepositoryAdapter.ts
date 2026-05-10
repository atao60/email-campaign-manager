import type { SentCampaign } from '@domain/models/Campaign';
import type { CampaignHistoryRepository } from '@domain/repositories/CampaignHistoryRepository';

export class InMemoryCampaignHistoryRepositoryAdapter implements CampaignHistoryRepository {
  private readonly history: Map<string, SentCampaign> = new Map();

  public async save(campaign: SentCampaign): Promise<void> {
    this.history.set(campaign.id, campaign);
    console.log(`[InMemoryRepo] Campaign ${campaign.id} saved.`);
  }

  public async getAll(): Promise<SentCampaign[]> {
    // Return sorted by date descending (newest first)
    return Array.from(this.history.values()).sort(
      (a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime()
    );
  }

  public async getById(id: string): Promise<SentCampaign | null> {
    return this.history.get(id) || null;
  }

  public async updateEmailStatus(
    _campaignId: string,
    _emailAddress: string,
    _status: 'OK' | 'FAILED' | 'PENDING',
    _errorReason?: string
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
