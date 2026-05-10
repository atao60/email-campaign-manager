import { type QueueMonitorPort } from '@domain/ports/QueueMonitorPort';
import { type FailedEmailRepository } from '@domain/repositories/FailedEmailRepository';
import { type CampaignStatus } from '@domain/models/CampaignStatus';

export class GetCampaignStatusUseCase {
  constructor(
    private readonly queueMonitor: QueueMonitorPort,
    private readonly failedEmailRepo: FailedEmailRepository
  ) {}

  public async execute(): Promise<CampaignStatus> {
    // 1. Get live queue statistics
    const metrics = await this.queueMonitor.getMetrics('email-queue');

    // 2. Get permanently recorded failures
    const failures = await this.failedEmailRepo.findAll();

    return {
      ...metrics,
      hardFailures: failures.length
    };
  }
}
