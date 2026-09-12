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

export class SshOperationError extends Error {
  constructor(message = "SSH operation failed") {
    super(message);
  }
}

export class AgentAuthError extends Error {
  constructor(message = "Agent authentication failed") {
    super(message);
  }
}

export class AgentTokenRevokedError extends AgentAuthError {
  constructor() {
    super("Agent token has been revoked");
  }
}

export class DuplicateAgentInstallError extends Error {
  constructor() {
    super("Agent install is already in progress for this VPS");
  }
}

export class AgentInstallError extends Error {
  constructor(message = "Agent installation failed") {
    super(message);
  }
}

export class AgentConfigError extends Error {
  constructor(message = "Agent configuration error") {
    super(message);
  }
}

export class DemoMutationBlockedError extends Error {
  constructor() {
    super("Mutations are disabled in demo mode");
  }
}

/**
 * Raised when an SSH host key scan (ssh-keyscan) fails in strict mode and no
 * trusted pin exists for the target. This is a distinct, safe error: it never
 * leaks raw scan output and never falls through to a generic SSH connection
 * attempt.
 */
export class SshHostKeyScanFailedError extends Error {
  constructor() {
    super(
      "SSH host key scan failed. Check the VPS host, SSH port, and network reachability, then retry trust setup.",
    );
    this.name = "SshHostKeyScanFailedError";
  }
}

export class SshHostKeyTrustRequiredError extends Error {
  /** Structured payload returned to the caller. */
  public readonly info: {
    error: "SSH_HOST_KEY_TRUST_REQUIRED";
    vpsId: string;
    host: string;
    port: number;
    fingerprint?: string;
    keyType?: string;
  };

  constructor(info: {
    vpsId: string;
    host: string;
    port: number;
    fingerprint?: string;
    keyType?: string;
  }) {
    super("SSH host key trust is required before provisioning");
    this.name = "SshHostKeyTrustRequiredError";
    this.info = { error: "SSH_HOST_KEY_TRUST_REQUIRED", ...info };
  }
}
