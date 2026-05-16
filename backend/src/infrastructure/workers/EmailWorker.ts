import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

import type { EmailPort, LoggerPort } from '@domain/ports';
import { type FailedEmailRepository } from '@domain/repositories';
import { Contact } from '@domain/models/Contact';
import { type ContactId, type FailedEmailId } from '@domain/models/BrandedTypes';
import { FailedEmail } from '@domain/models/FailedEmail';

/**
 * The Email Consumer
 */
export class EmailWorker {
  private readonly worker: Worker;

  constructor(
    redisClient: Redis,
    private readonly actualMailer: EmailPort, // Injects NodemailerAdapter
    private readonly failedEmailRepo: FailedEmailRepository,
    private readonly logger: LoggerPort
  ) {
    this.worker = new Worker(
      'email-queue',
      async (job: Job) => {
        this.logger.info(`Processing email job ${job.id} for ${job.data.contact.email}`);

        // 1. Reconstruct the Domain Entity from the parsed JSON payload
        const contactData = job.data.contact;
        const contact = new Contact(
          contactData.id as ContactId,
          contactData.firstName,
          contactData.lastName,
          contactData.email,
          contactData.jobTitle,
          contactData.company
        );

        // 2. Execute the actual sending
        await this.actualMailer.send(contact, job.data.message);
      },
      { connection: redisClient }
    );

    this.worker.on('completed', (job) => {
      this.logger.info(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', async (job, err) => {
      this.logger.error(`Job ${job?.id} failed for ${job?.data.contact.email}`, err);

      if (!job) {
        return;
      }

      const failure = new FailedEmail(
        randomUUID() as FailedEmailId,
        job.data.contact.id as ContactId,
        job.data.contact.email,
        err.message,
        new Date()
      );

      await this.failedEmailRepo.save(failure).catch((repoErr) => {
        this.logger.error('CRITICAL: Failed to save failure record to repository', repoErr);
      });
    });
  }

  public close(): Promise<void> {
    return this.worker.close();
  }
}
