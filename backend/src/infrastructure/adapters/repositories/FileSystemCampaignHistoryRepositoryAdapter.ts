import { join } from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import AsyncLock from 'async-lock';

import type { CampaignHistoryRepository } from '@domain/repositories';
import type { SentCampaign } from '@domain/models/Campaign';

export class FileSystemCampaignHistoryRepositoryAdapter implements CampaignHistoryRepository {
  private readonly storageDir: string;
  private readonly lock: AsyncLock;

  constructor(storageDir: string) {
    // Default to a 'history' folder in the backend root
    this.storageDir = storageDir;
    // Initialize the lock mechanism
    this.lock = new AsyncLock();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }

  public async save(campaign: SentCampaign): Promise<void> {
    // Lock on the campaign ID to prevent race conditions during initial save
    await this.lock.acquire(campaign.id, async () => {
      await this.ensureDirectoryExists();
      const filePath = join(this.storageDir, `${campaign.id}.json`);

      await writeFile(filePath, JSON.stringify(campaign, null, 2), 'utf-8');
      console.log(`[FileRepo] Campaign ${campaign.id} saved to disk.`);
    });
  }

  public async getAll(): Promise<SentCampaign[]> {
    await this.ensureDirectoryExists();
    const files = await readdir(this.storageDir);

    const campaigns: SentCampaign[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(this.storageDir, file);
        try {
          const fileContent = await readFile(filePath, 'utf-8');
          // Skip empty files caused by concurrent partial writes
          if (fileContent.trim()) {
            campaigns.push(JSON.parse(fileContent));
          }
        } catch (error) {
          console.warn(`[FileRepo] Skipping unreadable file ${file}:`, error);
        }
      }
    }

    return campaigns.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());
  }

  public async getById(id: string): Promise<SentCampaign | null> {
    try {
      const filePath = join(this.storageDir, `${id}.json`);
      const fileContent = await readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  /**
   * Updates a single email's status safely using file locking.
   * If all emails are processed, it flips the campaign status to COMPLETED.
   */
  public async updateEmailStatus(
    campaignId: string,
    emailAddress: string,
    status: 'OK' | 'FAILED' | 'PENDING',
    errorReason?: string
  ): Promise<void> {
    // Acquire a lock specifically for this campaign ID
    await this.lock.acquire(campaignId, async () => {
      const campaign = await this.getById(campaignId);

      if (!campaign) {
        console.warn(`[FileRepo] Webhook received for unknown campaign: ${campaignId}`);
        return;
      }

      // Find and update the specific email
      const emailRecord = campaign.emails.find((e) => e.address === emailAddress);
      if (emailRecord) {
        emailRecord.status = status;
        if (errorReason) {
          emailRecord.errorReason = errorReason;
        }
      }

      // Check if the overall campaign is now fully COMPLETED or FAILED
      const stillPending = campaign.emails.some((e) => e.status === 'PENDING');
      const anyFailed = campaign.emails.some((e) => e.status === 'FAILED');

      if (!stillPending) {
        campaign.status = anyFailed ? 'FAILED' : 'COMPLETED';
      }

      // Save the changes safely inside the lock
      const filePath = join(this.storageDir, `${campaignId}.json`);
      await writeFile(filePath, JSON.stringify(campaign, null, 2), 'utf-8');
    });
  }
}
