import type { QueueMetrics } from './QueueMetrics';

export interface CampaignStatus extends QueueMetrics {
  hardFailures: number;
}
