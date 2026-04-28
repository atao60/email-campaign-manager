import { type QueueMetrics } from '@domain/models/QueueMetrics';

export interface QueueMonitorPort {
  getMetrics(queueName: string): Promise<QueueMetrics>;
}
