export interface CampaignStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  hardFailures: number;
}

// FUTURE: to be a config. param.
const DEFAULT_PORT = '3000';

const API_BASE_URL = `http://localhost:${DEFAULT_PORT}/api`;

export const apiClient = {
  async getStatus(): Promise<CampaignStatus> {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }
};
