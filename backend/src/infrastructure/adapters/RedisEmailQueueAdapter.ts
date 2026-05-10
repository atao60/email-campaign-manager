import { Queue } from 'bullmq';
import Redis from 'ioredis';

import { type EmailPort, type EmailMessageDto } from '@domain/ports/EmailPort';
import { type Contact } from '@domain/models/Contact';

/**
 * ==========================================
 * Asynchronous Email Queue Producer Adapter
 * ==========================================
 *
 * @rule
 * Provides the concrete infrastructure implementation of the `EmailPort` interface
 * by offloading email dispatch to a Redis-backed background queue using BullMQ.
 *
 * @why
 * Sending emails synchronously over SMTP during an HTTP request is slow and blocks the Node.js event loop.
 * For bulk campaigns, attempting to send hundreds of emails synchronously would cause the API to time out.
 * By treating the `EmailPort` as a queue publisher, the core domain can instantly "send" thousands of emails
 * in memory, deferring the actual network execution to scalable background workers. This natively adds
 * fault tolerance (e.g., automatic retries if the SMTP provider drops the connection) without polluting the core domain logic.
 *
 * @warning
 * **This adapter is only a Producer, not a Consumer.**
 * It does not actually deliver emails to the outside world. It merely drops payload instructions
 * into a Redis bucket. A completely separate background worker process MUST be running in your
 * infrastructure to listen to the `'email-queue'`, pick up these jobs, and execute the actual
 * sending logic (typically using the `NodemailerAdapter` inside the worker loop).
 *
 * @how
 * This class wraps a BullMQ `Queue` instance connected to an injected `ioredis` client.
 * When the domain invokes `send()`, the adapter serializes the `Contact` and `EmailMessageDto`
 * into a job payload and pushes it to the Redis list for immediate processing. The `scheduleSend()`
 * method securely utilizes BullMQ's native `delay` configuration to hold the job in Redis
 * until the exact requested timestamp.
 */
export class RedisEmailQueueAdapter implements EmailPort {
  private readonly queue: Queue;

  constructor(redisClient: Redis) {
    this.queue = new Queue('email-queue', { connection: redisClient });
  }

  public async send(contact: Contact, message: EmailMessageDto): Promise<void> {
    // A standard send is just a queue job with zero delay
    await this.queue.add('send-email', { contact, message });
  }

  public async scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void> {
    // Delayed job natively handled by BullMQ
    await this.queue.add('send-email', { contact, message }, { delay: delayMs });
  }
}
