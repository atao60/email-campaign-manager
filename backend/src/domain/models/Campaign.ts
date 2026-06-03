export interface SentCampaignSummary {
  id: string;
  subject: string;
  sentDate: string; // ISO string
  totalSent: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
}

export interface SentCampaign extends SentCampaignSummary {
  htmlContent: string;
  emails: Array<{
    address: string;
    name: string;
    status: 'OK' | 'FAILED' | 'PENDING';
    errorReason?: string;
  }>;
}
