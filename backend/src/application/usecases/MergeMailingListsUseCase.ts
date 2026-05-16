import { type Contact } from '@domain/models/Contact';
import { type CsvPort } from '@domain/ports';

export class MergeMailingListsUseCase {
  constructor(private readonly csvAdapter: CsvPort) {}

  public async execute(inputFiles: string[], outputFile: string): Promise<void> {
    const uniqueContacts = new Map<string, Contact>();

    for (const file of inputFiles) {
      const contacts = await this.csvAdapter.read(file);
      for (const contact of contacts) {
        // Deduplicate by email
        if (!uniqueContacts.has(contact.email)) {
          uniqueContacts.set(contact.email, contact);
        }
      }
    }

    await this.csvAdapter.write(outputFile, Array.from(uniqueContacts.values()));
  }
}
