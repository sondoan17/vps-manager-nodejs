export class VpsNotFoundError extends Error {
  constructor() {
    super("VPS not found");
  }
}

export class DemoSshDisabledError extends Error {
  constructor() {
    super("Real SSH is disabled in demo mode");
  }
}

export class SshHostBlockedError extends Error {
  constructor(message = "SSH host is blocked by policy") {
    super(message);
  }
}
