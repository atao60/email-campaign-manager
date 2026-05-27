import { type Contact } from '@domain/models/Contact';
import { type CsvPort } from '@domain/ports';

/**
 * ==========================================
 * Application Use Case: Merge Mailing Lists
 * ==========================================
 *
 * @description
 * Aggregates multiple contact lists into a single master file, automatically
 * deduplicating entries based on their email address, while strictly enforcing
 * exclusion lists (e.g., opt-outs, blacklists, or previous hard bounces).
 *
 * @rule
 * 1. Exclusions: Any email found within the provided `excludeFiles` is globally
 * banned from the final output, regardless of how many input files contain it.
 * 2. Deduplication: For the remaining allowed emails, deduplication is on a
 * first-come, first-served basis. The first occurrence is kept in memory
 * and subsequent duplicates are silently ignored.
 *
 * @why
 * Following Clean Architecture, this Application Use Case coordinates the workflow
 * without knowing how the data is physically read or written. It relies entirely on
 * the abstracted `CsvPort`, keeping the core deduplication and filtering logic
 * completely isolated from third-party file system or parsing libraries.
 *
 * @example
 * const mergeUseCase = new MergeMailingListsUseCase(csvAdapter);
 * await mergeUseCase.execute(
 * ['data/list-a.csv', 'data/list-b.csv'], // Files to merge
 * ['data/opt-outs.csv', 'data/bounces.csv'], // Files to exclude
 * 'data/final-campaign.csv' // Destination
 * );
 */
export class MergeMailingListsUseCase {
  constructor(private readonly csvAdapter: CsvPort) {}

  public async execute(inputFiles: string[], excludeFiles: string[], outputFile: string): Promise<void> {
    // Build the global exclusion set for lightning-fast O(1) lookups
    const excludedEmails = new Set<string>();

    for (const file of excludeFiles) {
      const contactsToExclude = await this.csvAdapter.read(file);
      for (const contact of contactsToExclude) {
        // Normalizing to lowercase ensures case-insensitive matching
        excludedEmails.add(contact.email.toLowerCase());
      }
    }

    // Process the input files and build the merged list
    const uniqueContacts = new Map<string, Contact>();

    for (const file of inputFiles) {
      const contacts = await this.csvAdapter.read(file);
      for (const contact of contacts) {
        const normalizedEmail = contact.email.toLowerCase();

        // Rule 1: Skip if the email is in the exclusion list
        if (excludedEmails.has(normalizedEmail)) {
          continue;
        }

        // Rule 2: Deduplicate by email
        if (!uniqueContacts.has(contact.email)) {
          uniqueContacts.set(contact.email, contact);
        }
      }
    }

    // Write the sanitized and deduplicated contacts to the output file
    await this.csvAdapter.write(outputFile, Array.from(uniqueContacts.values()));
  }
}
