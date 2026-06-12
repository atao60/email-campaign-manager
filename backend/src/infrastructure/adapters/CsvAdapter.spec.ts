import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { CsvAdapter } from './CsvAdapter';
import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactId } from '@domain/models/BrandedTypes';

describe('CsvAdapter', () => {
  let adapter: CsvAdapter;
  let tempDirPath: string;

  beforeEach(async () => {
    adapter = new CsvAdapter();
    // Create a unique temporary directory for each test run to ensure strict isolation
    tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-adapter-test-'));
  });

  afterEach(async () => {
    // Clean up the temporary directory and all its contents after each test
    await fs.rm(tempDirPath, { recursive: true, force: true });
  });

  describe('read()', () => {
    it('should successfully read and parse a valid CSV file into CsvRow objects', async () => {
      const filePath = path.join(tempDirPath, 'import.csv');

      // Create a mock CSV file with headers
      const csvContent = `firstName,lastName,email,jobTitle,company
John,Doe,john.doe@test.com,Developer,ACME Corp
Jane,Smith,jane.smith@test.com,,`; // Missing jobTitle and company

      await fs.writeFile(filePath, csvContent, 'utf-8');

      // Execute the adapter read method
      const results = await adapter.read(filePath);

      expect(results).toHaveLength(2);

      // Verify first row (fully populated)
      expect(results[0]).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        jobTitle: 'Developer',
        company: 'ACME Corp'
      });

      // Verify second row (handles empty fields correctly)
      expect(results[1]).toEqual({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        jobTitle: '',
        company: ''
      });
    });

    it('should reject the promise if the file does not exist', async () => {
      const missingFilePath = path.join(tempDirPath, 'does-not-exist.csv');

      // Assert that reading a non-existent file throws an ENOENT error
      await expect(adapter.read(missingFilePath)).rejects.toThrow(/ENOENT/);
    });

    it('should return an empty array if the CSV file is empty', async () => {
      const filePath = path.join(tempDirPath, 'empty.csv');
      await fs.writeFile(filePath, '', 'utf-8');

      const results = await adapter.read(filePath);

      expect(results).toEqual([]);
    });
  });

  describe('write()', () => {
    it('should map Domain Entities and write them to a CSV file with correct headers', async () => {
      const filePath = path.join(tempDirPath, 'export.csv');

      // Create mocked Domain Entities
      const contacts = [
        new Contact(
          'ctct_1' as ContactId,
          'Alice',
          'Johnson',
          'alice@test.com',
          new Date('2023-01-01T00:00:00.000Z'),
          'Manager',
          'Stark Ind',
          ConsentStatus.SUBSCRIBED
        ),
        new Contact(
          'ctct_2' as ContactId,
          'Bob',
          'Williams',
          'bob@test.com',
          new Date('2023-01-01T00:00:00.000Z'),
          undefined, // Test null/undefined mapping fallback
          undefined, // Test null/undefined mapping fallback
          ConsentStatus.PENDING_RENEWAL
        )
      ];

      // Execute the adapter write method
      await adapter.write(filePath, contacts);

      // Read the file back as a raw string to verify exact formatting
      const writtenContent = await fs.readFile(filePath, 'utf-8');
      const lines = writtenContent.trim().split('\n');

      // Verify the header was injected correctly
      expect(lines[0]).toBe('id,firstName,lastName,email,jobTitle,company');

      // Verify row 1 mapping
      expect(lines[1]).toBe('ctct_1,Alice,Johnson,alice@test.com,Manager,Stark Ind');

      // Verify row 2 mapping (undefined fields mapped to empty strings)
      expect(lines[2]).toBe('ctct_2,Bob,Williams,bob@test.com,,');
    });
  });
});
