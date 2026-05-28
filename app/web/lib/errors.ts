export class AskPDFError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AskPDFError';
  }
}
