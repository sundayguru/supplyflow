export class HTTPError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public response: Response,
  ) {
    super(`HTTP Error: ${status} ${statusText}`);
    this.name = 'HTTPError';
  }
}
