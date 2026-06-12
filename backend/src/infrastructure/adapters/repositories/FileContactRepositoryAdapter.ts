import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import AsyncLock from 'async-lock';

import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactId } from '@domain/models/BrandedTypes';
import type { ContactRepository } from '@domain/repositories';

/**
 * ==========================================
 * Infrastructure Adapter: File Contact Repository
 * ==========================================
 *
 * @rule
 * Provides the concrete file-system implementation of the `ContactRepository` port.
 *
 * @why
 * Following Hexagonal Architecture, the core domain must remain completely isolated
 * from data persistence mechanisms. This adapter safely translates domain-level
 * `Contact` entities—along with their critical GDPR consent metadata—into persistent
 * JSON files on disk, ensuring the domain layer remains agnostic to the file system.
 *
 * @how
 * - **Storage Strategy:** Stores each contact as an individual JSON file (`{id}.json`)
 * to prevent the catastrophic data loss or corruption that can occur when modifying
 * a single, monolithic JSON file.
 * - **Performance (O(1) Lookups):** Maintains a lightweight, in-memory `emailIndex`
 * mapping (`{ "email": "id" }`) that is synchronized with an `email-index.json` file.
 * This allows the application to instantly verify if a contact exists without reading
 * thousands of files from the disk during mass CSV ingestion.
 * - **Concurrency & Safety:** Implements `async-lock` and a Lazy Initialization
 * (Double-Checked Locking) pattern. This guarantees thread-safety and completely
 * prevents I/O race conditions and file corruption when Node.js attempts to process
 * and save thousands of contacts concurrently. It also intentionally avoids using
 * synchronous blocking calls in the constructor to keep the Node event loop free.
 */
export class FileContactRepositoryAdapter implements ContactRepository {
  private readonly contactsDir: string;
  private readonly indexPath: string;
  private readonly lock: AsyncLock;

  // In-memory index for O(1) lookups: { "email@example.com": "contact_123" }
  private emailIndex: Record<string, string> = {};
  private isInitialized = false;

  constructor(baseStorageDir: string) {
    this.contactsDir = join(baseStorageDir, 'contacts');
    this.indexPath = join(baseStorageDir, 'email-index.json');
    this.lock = new AsyncLock();
  }

  /**
   * Lazy initialization pattern (Double-Checked Locking).
   * Ensures the directories are created and the index is loaded into memory
   * exactly once, right before the first read/write operation.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    // Use a special lock key to prevent concurrent initializations
    await this.lock.acquire('repo-init', async () => {
      if (this.isInitialized) return; // Double-check inside the lock

      try {
        await mkdir(this.contactsDir, { recursive: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }

      if (existsSync(this.indexPath)) {
        const indexData = await readFile(this.indexPath, 'utf-8');
        if (indexData.trim()) {
          this.emailIndex = JSON.parse(indexData);
        }
      }

      this.isInitialized = true;
    });
  }

  public async save(contact: Contact): Promise<void> {
    await this.ensureInitialized();

    // Lock the individual contact file to prevent concurrent overwrites
    await this.lock.acquire(contact.id, async () => {
      const filePath = join(this.contactsDir, `${contact.id}.json`);
      await writeFile(filePath, JSON.stringify(contact, null, 2), 'utf-8');
    });

    // Lock the shared index file to prevent CSV mass-upload corruption
    await this.lock.acquire('index-update', async () => {
      if (this.emailIndex[contact.email] !== contact.id) {
        this.emailIndex[contact.email] = contact.id;
        await writeFile(this.indexPath, JSON.stringify(this.emailIndex, null, 2), 'utf-8');
      }
    });
  }

  public async getByEmail(email: string): Promise<Contact | null> {
    await this.ensureInitialized();

    const contactId = this.emailIndex[email];
    if (!contactId) return null;

    const filePath = join(this.contactsDir, `${contactId}.json`);

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      if (!fileContent.trim()) return null;

      const data = JSON.parse(fileContent);

      // Rehydrate the Domain Entity
      return new Contact(
        data.id as ContactId,
        data.firstName,
        data.lastName,
        data.email,
        new Date(data.optInDate),
        data.jobTitle,
        data.company,
        data.status as ConsentStatus,
        data.renewalToken
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      console.warn(`[ContactRepo] Skipping unreadable file ${filePath}:`, error);
      return null;
    }
  }

  public async getAll(): Promise<Contact[]> {
    await this.ensureInitialized();

    const contacts: Contact[] = [];

    // Iterate over the fast in-memory index instead of reading the filesystem directory
    for (const email of Object.keys(this.emailIndex)) {
      const contact = await this.getByEmail(email);
      if (contact) contacts.push(contact);
    }

    return contacts;
  }
}
