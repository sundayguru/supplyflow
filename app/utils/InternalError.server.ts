export class InternalError extends Error {
  constructor(public details: string) {
    super(`Internal Error: ${details}`);
    this.name = 'InternalError';
  }
}
