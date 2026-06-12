import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { FileContactRepositoryAdapter } from './FileContactRepositoryAdapter';
import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactId } from '@domain/models/BrandedTypes';

// --- Mocks ---
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn()
}));

describe('FileContactRepositoryAdapter', () => {
  let adapter: FileContactRepositoryAdapter;
  const BASE_DIR = '/mock/storage';
  const INDEX_PATH = join(BASE_DIR, 'email-index.json');
  const CONTACTS_DIR = join(BASE_DIR, 'contacts');

  // Helper to generate a valid domain entity for testing
  const createDummyContact = (id = 'ctct_123', email = 'test@example.com') => {
    return new Contact(
      id as ContactId,
      'John',
      'Doe',
      email,
      new Date('2024-01-01T10:00:00.000Z'),
      'Developer',
      'ACME Corp',
      ConsentStatus.SUBSCRIBED
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FileContactRepositoryAdapter(BASE_DIR);

    // Default mock implementations: No index exists, directory creates successfully
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization (Lazy Loading)', () => {
    it('should create the contacts directory and not read the index if it does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      // Trigger initialization implicitly via save
      await adapter.save(createDummyContact());

      expect(mkdir).toHaveBeenCalledTimes(1);
      expect(mkdir).toHaveBeenCalledWith(CONTACTS_DIR, { recursive: true });
      expect(readFile).not.toHaveBeenCalledWith(INDEX_PATH, 'utf-8');
    });

    it('should safely ignore EEXIST errors if the directory is created concurrently', async () => {
      const eexistError = new Error('Directory exists') as NodeJS.ErrnoException;
      eexistError.code = 'EEXIST';
      vi.mocked(mkdir).mockRejectedValueOnce(eexistError);

      // Should not throw
      await expect(adapter.save(createDummyContact())).resolves.not.toThrow();
    });

    it('should load the existing email index into memory if it exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockImplementation(async (path) => {
        if (path === INDEX_PATH) return JSON.stringify({ 'alice@test.com': 'ctct_999' });
        return '';
      });

      // Trigger initialization
      const result = await adapter.getByEmail('alice@test.com');

      expect(readFile).toHaveBeenCalledWith(INDEX_PATH, 'utf-8');
      // Even though we couldn't read the actual contact file (mock returns ''),
      // the fact that it tried to read ctct_999.json proves the index was loaded
      expect(readFile).toHaveBeenCalledWith(join(CONTACTS_DIR, 'ctct_999.json'), 'utf-8');
      expect(result).toBeNull(); // Because contact file read returned empty
    });

    it('should guarantee ensureInitialized is only executed once across multiple calls', async () => {
      // Call save 3 times simultaneously
      await Promise.all([
        adapter.save(createDummyContact('1', 'a@a.com')),
        adapter.save(createDummyContact('2', 'b@b.com')),
        adapter.save(createDummyContact('3', 'c@c.com'))
      ]);

      // mkdir should only be called exactly 1 time thanks to the AsyncLock
      expect(mkdir).toHaveBeenCalledTimes(1);
    });
  });

  describe('save()', () => {
    it('should write the individual contact file and update the index', async () => {
      const contact = createDummyContact('ctct_777', 'save@test.com');

      await adapter.save(contact);

      // 1. Verify individual contact JSON file write
      const expectedFilePath = join(CONTACTS_DIR, 'ctct_777.json');
      expect(writeFile).toHaveBeenCalledWith(expectedFilePath, JSON.stringify(contact, null, 2), 'utf-8');

      // 2. Verify shared index JSON file write
      expect(writeFile).toHaveBeenCalledWith(
        INDEX_PATH,
        JSON.stringify({ 'save@test.com': 'ctct_777' }, null, 2),
        'utf-8'
      );
    });

    it('should not rewrite the index file if the email-to-id mapping is already up to date', async () => {
      const contact = createDummyContact('ctct_888', 'cache@test.com');

      // First save triggers an index update
      await adapter.save(contact);
      expect(writeFile).toHaveBeenCalledTimes(2); // 1 contact + 1 index

      // Second save of the exact same contact
      await adapter.save(contact);

      // Should write the contact file again, but SKIP the index file write
      expect(writeFile).toHaveBeenCalledTimes(3);
      expect(writeFile).toHaveBeenLastCalledWith(join(CONTACTS_DIR, 'ctct_888.json'), expect.any(String), 'utf-8');
    });
  });

  describe('getByEmail()', () => {
    it('should return null immediately if the email is not in the index', async () => {
      const result = await adapter.getByEmail('unknown@test.com');

      expect(result).toBeNull();
      expect(readFile).not.toHaveBeenCalled(); // Fast O(1) rejection
    });

    it('should return null if the contact file is physically missing (ENOENT)', async () => {
      // Pre-populate index by saving a contact, but mock the subsequent read to fail
      await adapter.save(createDummyContact('ctct_111', 'missing@test.com'));

      const enoentError = new Error('File not found') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      vi.mocked(readFile).mockRejectedValueOnce(enoentError);

      const result = await adapter.getByEmail('missing@test.com');

      expect(result).toBeNull();
    });

    it('should warn and return null if the file contains invalid JSON', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {}); // Suppress terminal clutter

      await adapter.save(createDummyContact('ctct_222', 'corrupt@test.com'));
      vi.mocked(readFile).mockResolvedValueOnce('{ invalid_json: true, }');

      const result = await adapter.getByEmail('corrupt@test.com');

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[ContactRepo] Skipping unreadable file'),
        expect.any(SyntaxError)
      );
    });

    it('should successfully read, parse, and rehydrate a Contact domain entity', async () => {
      const originalContact = createDummyContact('ctct_333', 'found@test.com');

      // Populate memory index
      await adapter.save(originalContact);

      // Mock the filesystem returning the raw JSON string
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(originalContact));

      const hydratedContact = await adapter.getByEmail('found@test.com');

      expect(hydratedContact).not.toBeNull();
      // Ensure it's a real class instance, not just a plain Object
      expect(hydratedContact).toBeInstanceOf(Contact);
      expect(hydratedContact?.id).toBe('ctct_333');
      expect(hydratedContact?.email).toBe('found@test.com');
      expect(hydratedContact?.optInDate.toISOString()).toBe('2024-01-01T10:00:00.000Z');
    });
  });

  describe('getAll()', () => {
    it('should return an empty array if the index is empty', async () => {
      const results = await adapter.getAll();
      expect(results).toEqual([]);
    });

    it('should return an array of fully hydrated Contact entities based on the index', async () => {
      const contact1 = createDummyContact('ctct_A', 'a@test.com');
      const contact2 = createDummyContact('ctct_B', 'b@test.com');

      // Populate the index
      await adapter.save(contact1);
      await adapter.save(contact2);

      // Mock the sequential reads for getAll -> getByEmail
      vi.mocked(readFile).mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('ctct_A.json')) return JSON.stringify(contact1);
        if (pathStr.includes('ctct_B.json')) return JSON.stringify(contact2);
        throw new Error('Not found');
      });

      const results = await adapter.getAll();

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Contact);
      expect(results[0]!.id).toBe('ctct_A');
      expect(results[1]).toBeInstanceOf(Contact);
      expect(results[1]!.id).toBe('ctct_B');
    });

    it('should gracefully skip missing files during mass retrieval', async () => {
      const contact1 = createDummyContact('ctct_A', 'a@test.com');
      const contact2 = createDummyContact('ctct_B', 'b@test.com'); // This one will "go missing"

      await adapter.save(contact1);
      await adapter.save(contact2);

      vi.mocked(readFile).mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('ctct_A.json')) return JSON.stringify(contact1);

        // Simulate file deletion for contact2 despite being in the index
        const enoentError = new Error('File not found') as NodeJS.ErrnoException;
        enoentError.code = 'ENOENT';
        throw enoentError;
      });

      const results = await adapter.getAll();

      // Should only return the 1 successful read
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('ctct_A');
    });
  });
});
