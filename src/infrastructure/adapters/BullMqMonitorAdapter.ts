import { Queue } from 'bullmq';
import type Redis from 'ioredis';

import { type QueueMonitorPort } from '@domain/ports/QueueMonitorPort';
import { type QueueMetrics } from '@domain/models/QueueMetrics';

export class BullMqMonitorAdapter implements QueueMonitorPort {
  constructor(private readonly redisClient: Redis) {}

  public async getMetrics(queueName: string): Promise<QueueMetrics> {
    const queue = new Queue(queueName, { connection: this.redisClient });

    // Fetch exact counts from BullMQ
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');

    // Crucial: Close the queue instance to prevent Redis connection leaks in the CLI
    await queue.close();

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0
    };
  }
}
