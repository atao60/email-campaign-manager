import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';

import { type EmailPort } from '@domain/ports/EmailPort';
import { type LoggerPort } from '@domain/ports/LoggerPort';
import { Contact } from '@domain/models/Contact';
import { type ContactId } from '@domain/models/BrandedTypes';

/**
 * The Email Consumer
 */
export class EmailWorker {
  private readonly worker: Worker;

  constructor(
    redisClient: Redis,
    private readonly actualMailer: EmailPort, // Injects NodemailerAdapter
    private readonly logger: LoggerPort
  ) {
    this.worker = new Worker(
      'email-queue',
      async (job: Job) => {
        this.logger.info(`Processing email job ${job.id} for ${job.data.contact.email}`);

        // 1. Reconstruct the Domain Entity from the parsed JSON payload
        const contact = new Contact(
          job.data.contact.id as ContactId,
          job.data.contact.firstName,
          job.data.contact.lastName,
          job.data.contact.email,
          job.data.contact.jobTitle,
          job.data.contact.company
        );

        // 2. Execute the actual sending
        await this.actualMailer.send(contact, job.data.message);
      },
      { connection: redisClient }
    );

    this.worker.on('completed', (job) => {
      this.logger.info(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed`, err);
      // Here you would tie into your FailedEmailRepositoryPort for tracking
    });
  }

  public close(): Promise<void> {
    return this.worker.close();
  }
}
