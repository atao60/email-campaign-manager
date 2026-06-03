export interface CampaignSummary {
  id: string;
  subject: string;
  sentDate: string; // ISO string format
  totalSent: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
}

export interface EmailDeliveryStatus {
  address: string;
  name?: string;
  status: 'OK' | 'FAILED' | 'PENDING';
  errorReason?: string; // Optional, only if failed
}

export interface CampaignDetail extends CampaignSummary {
  htmlContent: string;
  emails: EmailDeliveryStatus[];
}

export interface LaunchCampaignResponse {
  message: string;
  processed?: number;
}
