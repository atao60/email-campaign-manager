import { Queue } from 'bullmq';
import Redis from 'ioredis';

import { type EmailPort, type EmailMessageDto } from '@domain/ports/EmailPort';
import { type Contact } from '@domain/models/Contact';

/**
 * The Email Producer
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
