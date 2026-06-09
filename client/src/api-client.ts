import type { CampaignDetail, CampaignSummary, LaunchCampaignResponse } from '@campaign-manager/backend';

// FUTURE to be shared with backend/src/domain/models/CampaignStatus.ts?
export interface CampaignStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  hardFailures: number;
}

export interface LaunchCampaignRequest {
  csvFile: File;
  subject: string;
  label?: string;
  html?: string;
  url?: string;
  attachments?: File[];
  exclusions?: File[];
}

// FUTURE: to be a config. param.
const API_DEFAULT_PORT = '3000';

const API_BASE_URL = `http://localhost:${API_DEFAULT_PORT}`;

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

  // Now accepts the strict interface instead of raw FormData
  async launchCampaign(payload: LaunchCampaignRequest): Promise<LaunchCampaignResponse> {
    const formData = new FormData();

    // Append standard fields
    formData.append('csvFile', payload.csvFile);
    formData.append('subject', payload.subject);

    // Add the optional label field
    if (payload.label) {
      formData.append('label', payload.label);
    }

    // Conditionally append the templates so we don't send "undefined" as a string
    if (payload.html) {
      formData.append('html', payload.html);
    }
    if (payload.url) {
      formData.append('url', payload.url);
    }

    // Append attachments if they exist
    if (payload.attachments && payload.attachments.length > 0) {
      payload.attachments.forEach((file) => {
        // Appending multiple files to the exact same field name ('attachments')
        // creates an array of files on the backend
        formData.append('attachments', file);
      });
    }

    // Append exclusions if they exist
    if (payload.exclusions && payload.exclusions.length > 0) {
      payload.exclusions.forEach((file) => {
        // Appending multiple files to the exact same field name ('exclusions')
        // creates an array of files on the backend
        formData.append('exclusions', file);
      });
    }

    const response = await fetch(`${API_BASE_URL}/campaigns/send`, {
      method: 'POST',
      // Notice: No 'Content-Type' header! The browser sets the multipart boundary automatically.
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
