import fs from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';

import { type FailedEmailRepositoryPort } from '@domain/ports/FailedEmailRepositoryPort';
import { type FailedEmail } from '@domain/models/FailedEmail';

export class JsonFailedEmailRepositoryAdapter implements FailedEmailRepositoryPort {
  private readonly filePath = path.join(cwd(), 'data', 'failed-emails.json');

  public async save(failure: FailedEmail): Promise<void> {
    const allFailures = await this.findAll();
    allFailures.push(failure);

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(allFailures, null, 2), 'utf-8');
  }

  public async findAll(): Promise<FailedEmail[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // If the file does not exist or is empty, return an empty array
      return [];
    }
  }
}
