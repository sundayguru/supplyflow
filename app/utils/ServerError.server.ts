export class ServerError extends Error {
  constructor(
    public status: number,
    public statusText: string,
  ) {
    super(`Server Error: ${status} ${statusText}`);
    this.name = 'ServerError';
  }
}
