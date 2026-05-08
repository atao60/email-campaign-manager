import type {
  CampaignDetail,
  CampaignSummary,
  LaunchCampaignResponse
} from '../../backend/src/presentation/rest/dto/CampaignDTO';

export interface CampaignStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  hardFailures: number;
}

// FUTURE: to be a config. param.
const DEFAULT_PORT = '3000';

const API_BASE_URL = `http://localhost:${DEFAULT_PORT}`;

export const apiClient = {
  async getStatus(): Promise<CampaignStatus> {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  },

  async getCampaigns(): Promise<CampaignSummary[]> {
    const response = await fetch(`${API_BASE_URL}/campaigns`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }
    return response.json();
  },

  async getCampaignDetails(campaignId: string): Promise<CampaignDetail> {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch details for campaign ${campaignId}`);
    }
    return response.json();
  },

  async launchCampaign(formData: FormData): Promise<LaunchCampaignResponse> {
    const response = await fetch(`${API_BASE_URL}/campaigns/send`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      // Try to parse the backend's error message, fallback to status code
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
    }

    return response.json();
  }
};
