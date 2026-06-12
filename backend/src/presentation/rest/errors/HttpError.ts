export class HttpError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;

    // Set the prototype explicitly (required for extending built-in Error in TS)
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
