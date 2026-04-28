import { type QueueMonitorPort } from '@domain/ports/QueueMonitorPort';
import { type FailedEmailRepositoryPort } from '@domain/ports/FailedEmailRepositoryPort';
import { type QueueMetrics } from '@domain/models/QueueMetrics';

export interface CampaignStatus extends QueueMetrics {
  hardFailures: number;
}

export class GetCampaignStatusUseCase {
  constructor(
    private readonly queueMonitor: QueueMonitorPort,
    private readonly failedEmailRepo: FailedEmailRepositoryPort
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
