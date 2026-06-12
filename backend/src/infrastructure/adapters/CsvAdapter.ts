import fs from 'node:fs';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

import { type CsvPort, type CsvRow } from '@domain/ports';
import { Contact } from '@domain/models/Contact';

export class CsvAdapter implements CsvPort {
  public async read(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      const results: CsvRow[] = [];

      const readStream = fs.createReadStream(filePath);

      // Catch file system errors (like ENOENT) immediately on the source stream
      readStream.on('error', (error) => {
        reject(error);
      });

      readStream
        .pipe(csvParser())
        .on('data', (data) => {
          const row: CsvRow = {
            // data.id as ContactId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            jobTitle: data.jobTitle,
            company: data.company
          };
          results.push(row);
        })
        .on('end', () => resolve(results))
        // Catch parsing errors from the CSV parser itself
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
