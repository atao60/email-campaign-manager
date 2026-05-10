import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MergeMailingListsUseCase } from './MergeMailingListsUseCase';
import type { CsvPort } from '@domain/ports/CsvPort';
import { Contact } from '@domain/models/Contact';
import type { ContactId } from '@domain/models/BrandedTypes';

describe('MergeMailingListsUseCase', () => {
  let mockCsvPort: CsvPort;
  let useCase: MergeMailingListsUseCase;

  beforeEach(() => {
    // 1. Create the mock implementation
    mockCsvPort = {
      read: vi.fn(),
      write: vi.fn()
    };

    // 2. Inject it into the Use Case
    useCase = new MergeMailingListsUseCase(mockCsvPort);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should read all input files and write all contacts if there are no duplicates', async () => {
    // Setup dummy contacts
    const file1Contacts = [new Contact('c-1' as ContactId, 'Alice', 'Smith', 'alice@test.com', 'Dev', 'Acme')];
    const file2Contacts = [new Contact('c-2' as ContactId, 'Bob', 'Jones', 'bob@test.com', 'QA', 'Acme')];

    // Configure the mock to return different data based on the file name
    vi.mocked(mockCsvPort.read).mockImplementation(async (file) => {
      if (file === 'list1.csv') return file1Contacts;
      if (file === 'list2.csv') return file2Contacts;
      return [];
    });

    await useCase.execute(['list1.csv', 'list2.csv'], 'output.csv');

    // Verify it read both files
    expect(mockCsvPort.read).toHaveBeenCalledTimes(2);
    expect(mockCsvPort.read).toHaveBeenCalledWith('list1.csv');
    expect(mockCsvPort.read).toHaveBeenCalledWith('list2.csv');

    // Verify it wrote the combined array to the output file
    expect(mockCsvPort.write).toHaveBeenCalledTimes(1);
    expect(mockCsvPort.write).toHaveBeenCalledWith('output.csv', [...file1Contacts, ...file2Contacts]);
  });

  it('should deduplicate contacts based on email address, keeping the first occurrence', async () => {
    const contact1 = new Contact('c-1' as ContactId, 'Alice', 'Smith', 'alice@test.com', '', '');

    // This contact has the same email as contact1, but different ID and name
    const contact1Duplicate = new Contact('c-2' as ContactId, 'Alice Duplicate', 'Smith', 'alice@test.com', '', '');

    const contact2 = new Contact('c-3' as ContactId, 'Bob', 'Jones', 'bob@test.com', '', '');

    vi.mocked(mockCsvPort.read).mockImplementation(async (file) => {
      if (file === 'list1.csv') return [contact1];
      if (file === 'list2.csv') return [contact1Duplicate, contact2];
      return [];
    });

    await useCase.execute(['list1.csv', 'list2.csv'], 'output.csv');

    // It should keep contact1 and contact2, and completely discard contact1Duplicate
    expect(mockCsvPort.write).toHaveBeenCalledWith('output.csv', [contact1, contact2]);
  });

  it('should handle an empty array of input files by writing an empty array', async () => {
    await useCase.execute([], 'output.csv');

    expect(mockCsvPort.read).not.toHaveBeenCalled();
    expect(mockCsvPort.write).toHaveBeenCalledWith('output.csv', []);
  });

  it('should handle individual files that are empty', async () => {
    const file1Contacts = [new Contact('c-1' as ContactId, 'Alice', 'Smith', 'alice@test.com', '', '')];

    vi.mocked(mockCsvPort.read).mockImplementation(async (file) => {
      if (file === 'list1.csv') return file1Contacts;
      if (file === 'empty.csv') return []; // Empty file
      return [];
    });

    await useCase.execute(['list1.csv', 'empty.csv'], 'output.csv');

    expect(mockCsvPort.write).toHaveBeenCalledWith('output.csv', file1Contacts);
  });

  it('should bubble up errors from the CSV reader and abort writing', async () => {
    const readError = new Error('File not found');
    vi.mocked(mockCsvPort.read).mockRejectedValue(readError);

    await expect(useCase.execute(['bad.csv'], 'output.csv')).rejects.toThrow('File not found');

    // Ensure write is never called if reading fails
    expect(mockCsvPort.write).not.toHaveBeenCalled();
  });
});
