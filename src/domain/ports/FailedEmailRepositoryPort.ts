import { type FailedEmail } from '@domain/models/FailedEmail';

export interface FailedEmailRepositoryPort {
  save(failure: FailedEmail): Promise<void>;
  findAll(): Promise<FailedEmail[]>;
}
