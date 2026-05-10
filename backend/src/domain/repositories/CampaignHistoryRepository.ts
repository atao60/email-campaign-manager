import type { SentCampaign, SentCampaignSummary } from '@domain/models/Campaign';

export interface CampaignHistoryRepository {
  save(campaign: SentCampaign): Promise<void>;
  getAll(): Promise<SentCampaignSummary[]>;
  getById(id: string): Promise<SentCampaign | null>;
  updateEmailStatus(
    campaignId: string,
    emailAddress: string,
    status: 'OK' | 'FAILED' | 'PENDING',
    errorReason?: string
  ): Promise<void>;
}
