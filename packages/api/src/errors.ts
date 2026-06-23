export class VpsNotFoundError extends Error {
  constructor() {
    super("VPS not found");
  }
}
