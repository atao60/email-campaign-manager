import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { JsonFailedEmailRepositoryAdapter } from './JsonFailedEmailRepositoryAdapter';
import { FailedEmail } from '@domain/models/FailedEmail';
import { type ContactId, type FailedEmailId } from '@domain/models/BrandedTypes';

describe('JsonFailedEmailRepositoryAdapter (Integration)', () => {
  let tempFilePath: string;
  let adapter: JsonFailedEmailRepositoryAdapter;

  beforeEach(() => {
    // 1. Generate a unique, isolated file path in the OS temp directory
    const tempDir = os.tmpdir();
    const fileName = `test-failed-emails-${crypto.randomUUID()}.json`;
    tempFilePath = path.join(tempDir, fileName);

    // 2. Inject the temp path into the adapter
    adapter = new JsonFailedEmailRepositoryAdapter(tempFilePath);
  });

  afterEach(async () => {
    // 3. Clean up the physical file after the test finishes
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Safely ignore if the file was never created during the test
    }
  });

  it('should return an empty array when the physical file does not exist yet', async () => {
    const results = await adapter.findAll();
    expect(results).toEqual([]);
  });

  it('should physically write a failed email to the file system and retrieve it', async () => {
    const fixedDate = new Date('2026-04-29T10:00:00.000Z');
    const failure = new FailedEmail(
      'f-123' as FailedEmailId,
      'c-999' as ContactId,
      'integration@example.com',
      'Simulated integration error',
      fixedDate
    );

    // Write to the file system
    await adapter.save(failure);

    // Read back from the file system
    const results = await adapter.findAll();

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('f-123');
    expect(results[0]?.emailAddress).toBe('integration@example.com');

    // Note: Dates get serialized to ISO strings in JSON, so we expect a string back
    expect(results[0]?.failedAt).toBe('2026-04-29T10:00:00.000Z');
  });

  it('should successfully append new records without overwriting existing ones', async () => {
    const failure1 = new FailedEmail('f-1' as FailedEmailId, 'c-1' as ContactId, 'a@test.com', 'Error 1', new Date());
    const failure2 = new FailedEmail('f-2' as FailedEmailId, 'c-2' as ContactId, 'b@test.com', 'Error 2', new Date());

    await adapter.save(failure1);
    await adapter.save(failure2);

    const results = await adapter.findAll();
    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe('f-1');
    expect(results[1]?.id).toBe('f-2');
  });
});
