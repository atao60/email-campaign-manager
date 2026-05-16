import fs from 'node:fs';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

import { type CsvPort } from '@domain/ports';
import { Contact } from '@domain/models/Contact';
import { type ContactId } from '@domain/models/BrandedTypes';

export class CsvAdapter implements CsvPort {
  public async read(filePath: string): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      const results: Contact[] = [];

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
          // Map the raw CSV row string data to our strongly-typed Domain Entity
          const contact = new Contact(
            data.id as ContactId,
            data.firstName,
            data.lastName,
            data.email,
            data.jobTitle,
            data.company
          );
          results.push(contact);
        })
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  public async write(filePath: string, contacts: Contact[]): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'id' },
        { id: 'firstName', title: 'firstName' },
        { id: 'lastName', title: 'lastName' },
        { id: 'email', title: 'email' },
        { id: 'jobTitle', title: 'jobTitle' },
        { id: 'company', title: 'company' }
      ]
    });

    // Map Domain Entities back to flat objects for the CSV writer
    const records = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      jobTitle: c.jobTitle || '',
      company: c.company || ''
    }));

    await csvWriter.writeRecords(records);
  }
}
