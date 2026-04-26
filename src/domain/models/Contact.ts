import { type ContactId } from '@domain/models/BrandedTypes';

export class Contact {
  public readonly id: ContactId;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly email: string;
  public readonly jobTitle?: string;
  public readonly company?: string;

  constructor(
    id: ContactId,
    firstName: string,
    lastName: string,
    email: string,
    jobTitle?: string,
    company?: string
  ) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.jobTitle = jobTitle;
    this.company = company;
  }
}
