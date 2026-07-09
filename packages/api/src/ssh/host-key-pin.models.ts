/** A persisted SSH host key pin for a single VPS. */
export type HostKeyPin = {
  /** Unique identifier (auto-generated). */
  id: string;
  /** VPS record id that this pin belongs to. */
  vpsId: string;
  /** OpenSSH-style fingerprint (`SHA256:...`). */
  fingerprint: string;
  /** Key type (e.g. `ssh-ed25519`, `ssh-rsa`, `ecdsa-sha2-nistp256`). */
  keyType?: string;
  /** The VPS hostname or IP at time of trust. */
  host: string;
  /** SSH port. */
  port: number;
  /** When the pin was created. */
  trustedAt: string;
};

/** Result from an ssh-keyscan operation. */
export type KeyScanResult = {
  /** VPS id (echoed back). */
  vpsId: string;
  /** The host that was scanned. */
  host: string;
  /** SSH port. */
  port: number;
  /** Discovered keys, one entry per key type. */
  keys: Array<{
    /** Key type (e.g. `ssh-ed25519`, `ssh-rsa`). */
    type: string;
    /** Raw key as base64 string. */
    key: string;
    /** Computed fingerprint (`SHA256:...`). */
    fingerprint: string;
  }>;
};

/**
 * Structured error payload returned when host key trust is required
 * during a provisioning flow.
 */
export type SshHostKeyTrustRequiredInfo = {
  error: "SSH_HOST_KEY_TRUST_REQUIRED";
  vpsId: string;
  host: string;
  port: number;
  /** First observed key's fingerprint, if available. */
  fingerprint?: string;
  /** First observed key's type, if available. */
  keyType?: string;
};
