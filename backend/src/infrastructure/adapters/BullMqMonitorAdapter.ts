import { Queue } from 'bullmq';
import type Redis from 'ioredis';

import { type QueueMonitorPort } from '@domain/ports';
import { type QueueMetrics } from '@domain/models/QueueMetrics';

/**
 * ==========================================
 * BullMQ Telemetry & Metrics Adapter
 * ==========================================
 *
 * @rule
 * Provides the concrete infrastructure implementation of the `QueueMonitorPort`
 * interface to fetch real-time job counts and queue health metrics from BullMQ.
 *
 * @why
 * The core domain (like a Dashboard or Status Use Case) needs to know the progress
 * of background jobs to report on campaign completion. However, following Hexagonal
 * boundaries, the domain cannot know that BullMQ or Redis exists. This adapter acts
 * as a read-only telemetry bridge, translating a domain request into BullMQ-specific
 * queries and returning a standardized `QueueMetrics` object.
 *
 * @warning
 * **Watch for Redis Connection Exhaustion.**
 * Every time `new Queue()` is called, BullMQ creates active connections and subscriptions
 * to Redis. Because this adapter creates a new queue instance on the fly to read metrics
 * (which might be polled hundreds of times a minute by a frontend dashboard), it is
 * absolutely critical that `await queue.close()` is called. Failing to close the queue
 * will result in rapid Redis connection leaks, eventually crashing your Redis server.
 *
 * @how
 * This class takes an existing `ioredis` client and dynamically instantiates a BullMQ
 * `Queue` reference for the requested queue name. It queries the specific job states
 * (waiting, active, completed, failed), safely destroys the queue instance to free
 * memory/connections, and maps the raw data into the domain's `QueueMetrics` model.
 */
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
