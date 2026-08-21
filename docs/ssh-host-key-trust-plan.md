# SSH Host Key Trust Flow Plan

## Goal

Keep SSH host key verification secure while making VPS creation usable from the dashboard.

Current behavior:

```text
Create VPS
→ backend creates VPS record
→ backend tries provision-key
→ SSH_HOST_KEY_POLICY=strict rejects unknown host key
→ /api/vps/:id/provision-key returns 502
```

Target behavior:

```text
Create VPS
→ backend creates VPS record
→ backend checks host key
→ if key is untrusted, frontend shows Trust Host Key dialog
→ user confirms fingerprint
→ backend stores trusted pin
→ frontend retries provision-key
```

This avoids manually editing production `.env` for every new VPS while keeping strict SSH host key verification.

---

## Non-goals

- Do not auto-trust unknown host keys silently.
- Do not weaken production default from `strict` to `permissive`.
- Do not store VPS passwords.
- Do not log submitted VPS passwords.
- Do not rely on frontend-provided fingerprint without backend re-validation.
- Do not remove support for existing `SSH_HOST_KEY_PINS` env config.

---

## UX flow

### Create VPS with password

User submits:

```text
host: 103.57.220.134
port: 24700
username: root
password: ********
```

Backend creates the VPS record.

If provisioning requires a host key trust decision, frontend shows:

```text
Trust SSH host key?

Host
103.57.220.134:24700

Fingerprint
SHA256:oeRdxPugMeEzUnKn7I8uARE67iYbjz+T+zJW7pz8PYs

Key type
ED25519

Only trust this fingerprint if it matches your VPS provider console
or your own ssh-keyscan result.

[Cancel] [Trust and continue]
```

If user clicks `Trust and continue`:

```text
POST /api/vps/:id/ssh/host-key/trust
→ backend scans current host key again
→ backend verifies fingerprint matches submitted fingerprint
→ backend stores pin
→ frontend retries provision-key with the one-time password still in memory
```

If user cancels:

```text
VPS remains created
key is not provisioned
UI shows host key trust is required before provisioning
```

---

## Backend plan

### 1. Add DB table for trusted SSH host keys

Add migration:

```text
db/migrations/006_ssh_host_key_pins.sql
```

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS ssh_host_key_pins (
  id TEXT PRIMARY KEY,
  vps_id TEXT,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  key_type TEXT,
  source TEXT NOT NULL DEFAULT 'user_trusted',
  trusted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ssh_host_key_pins_vps_id
ON ssh_host_key_pins(vps_id)
WHERE vps_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ssh_host_key_pins_host_port
ON ssh_host_key_pins(host, port);
```

Notes:

- `vps_id` allows a VPS-specific pin.
- `(host, port)` allows reuse for recreated records pointing to the same server.
- `source` can distinguish `user_trusted`, `env`, `imported`, or future sources.

### 2. Add repository

Add a persistence repository, for example:

```text
packages/api/src/persistence/repositories/ssh-host-key-pin.repository.ts
```

Methods:

```ts
type SshHostKeyPin = {
  id: string;
  vpsId?: string;
  host: string;
  port: number;
  fingerprint: string;
  keyType?: string;
  source: 'user_trusted' | 'env' | 'imported';
  trustedAt: string;
  createdAt: string;
  updatedAt: string;
};

interface SshHostKeyPinRepository {
  getByVpsId(vpsId: string): Promise<SshHostKeyPin | undefined>;
  getByHostPort(host: string, port: number): Promise<SshHostKeyPin | undefined>;
  upsert(pin: Omit<SshHostKeyPin, 'id' | 'createdAt' | 'updatedAt'>): Promise<SshHostKeyPin>;
  deleteByVpsId(vpsId: string): Promise<boolean>;
}
```

Implement for both storage modes if the app still supports non-Postgres/local JSON storage.

### 3. Add service

Add:

```text
packages/api/src/ssh/ssh-host-key-pin.service.ts
```

Methods:

```ts
getPinsForVps(vps: VpsRecord): Promise<Record<string, string | string[]>>;
scanHostKey(vps: VpsRecord): Promise<SshHostKeyScanResult>;
trustHostKey(vps: VpsRecord, input: TrustHostKeyInput): Promise<SshHostKeyPin>;
deletePinForVps(vpsId: string): Promise<boolean>;
```

Resolution order for pins:

```text
1. DB pin by vps_id
2. DB pin by host:port
3. env SSH_HOST_KEY_PINS[vpsId]
4. env SSH_HOST_KEY_PINS[host:port]
```

Keep env pins as backward-compatible advanced config.

### 4. Scan host key safely

Endpoint needs to obtain the remote SSH host key fingerprint.

Recommended implementation options:

1. Prefer Node/ssh2-based scan if available.
2. If using `ssh-keyscan`, call it via `spawn` with an args array, never shell interpolation.

Example shape:

```ts
spawn('ssh-keyscan', ['-p', String(port), '-T', '10', host]);
```

Then parse and fingerprint using existing host-key fingerprint helpers if possible.

Timeout requirement:

```text
10 seconds max per scan
```

### 5. Add API endpoints

Add under existing VPS controller:

```http
POST /api/vps/:id/ssh/host-key/scan
POST /api/vps/:id/ssh/host-key/trust
DELETE /api/vps/:id/ssh/host-key/trust
```

#### Scan response

```json
{
  "data": {
    "host": "103.57.220.134",
    "port": 24700,
    "fingerprint": "SHA256:oeRdxPugMeEzUnKn7I8uARE67iYbjz+T+zJW7pz8PYs",
    "keyType": "ED25519",
    "alreadyTrusted": false
  }
}
```

#### Trust request

```json
{
  "fingerprint": "SHA256:oeRdxPugMeEzUnKn7I8uARE67iYbjz+T+zJW7pz8PYs",
  "keyType": "ED25519"
}
```

Backend must:

```text
1. validate VPS exists
2. scan current host key again
3. compare scanned fingerprint with request fingerprint
4. reject if mismatch
5. store pin if match
6. record audit event
```

### 6. Add structured host-key error

Current strict rejection becomes a generic 502 at the web layer.

Add a typed application error, for example:

```ts
class SshHostKeyTrustRequiredError extends Error {
  code = 'SSH_HOST_KEY_TRUST_REQUIRED';
  status = 409;
  details: {
    vpsId: string;
    host: string;
    port: number;
    fingerprint: string;
    keyType?: string;
  };
}
```

Expected response:

```http
409 Conflict
```

```json
{
  "error": {
    "code": "SSH_HOST_KEY_TRUST_REQUIRED",
    "message": "SSH host key must be trusted before provisioning.",
    "details": {
      "vpsId": "vps_xxx",
      "host": "103.57.220.134",
      "port": 24700,
      "fingerprint": "SHA256:...",
      "keyType": "ED25519"
    }
  }
}
```

### 7. Wire host verifier to DB pins

Current verifier uses env pins from config.

Change provisioning/install agent path so it can provide DB pins too.

Options:

- Pass merged pins into SSH service per request.
- Or make SSH service depend on `SshHostKeyPinService`.

Avoid loading DB pins only at app boot; pins should be effective immediately after user trusts without container restart.

### 8. Audit events

Add audit actions:

```text
ssh.host_key.scan
ssh.host_key.trust
ssh.host_key.mismatch
ssh.host_key.reject
ssh.host_key.delete
```

Include metadata:

```json
{
  "host": "103.57.220.134",
  "port": 24700,
  "fingerprint": "SHA256:...",
  "keyType": "ED25519"
}
```

---

## Frontend plan

### 1. API client methods

Add to:

```text
packages/web/src/lib/api.ts
```

Types:

```ts
export type SshHostKeyScanResult = {
  host: string;
  port: number;
  fingerprint: string;
  keyType?: string;
  alreadyTrusted: boolean;
};

export type SshHostKeyTrustRequiredDetails = {
  vpsId: string;
  host: string;
  port: number;
  fingerprint: string;
  keyType?: string;
};
```

Methods:

```ts
export function scanVpsHostKey(vpsId: string) {}
export function trustVpsHostKey(vpsId: string, payload: { fingerprint: string; keyType?: string }) {}
export function deleteVpsHostKeyTrust(vpsId: string) {}
```

Also improve API error handling so frontend can read:

```ts
error.code
error.details
```

### 2. Add trust dialog component

Add:

```text
packages/web/src/components/vps/SshHostKeyTrustDialog.tsx
```

Props:

```ts
type Props = {
  open: boolean;
  details: SshHostKeyTrustRequiredDetails | null;
  busy: boolean;
  onCancel: () => void;
  onTrust: () => void;
};
```

Dialog content:

```text
Trust SSH host key?
Host: host:port
Fingerprint: SHA256:...
Key type: ED25519

Only trust this fingerprint if it matches your provider console or your own ssh-keyscan result.

[Cancel] [Trust and continue]
```

### 3. Add state in dashboard provider

In:

```text
packages/web/src/context/DashboardContext.tsx
```

Add state:

```ts
type PendingHostKeyTrust = {
  vps: VpsRecord;
  details: SshHostKeyTrustRequiredDetails;
  pendingAction: 'provision' | 'install-agent';
  password?: string;
};
```

State:

```ts
const [pendingHostKeyTrust, setPendingHostKeyTrust] = useState<PendingHostKeyTrust | null>(null);
```

When `provisionKey` or `installAgent` throws `SSH_HOST_KEY_TRUST_REQUIRED`:

```text
do not show generic failure
show trust dialog
keep one-time password only in memory
```

### 4. Trust and retry action

Add action:

```ts
async function handleTrustHostKeyAndContinue() {
  await trustVpsHostKey(vps.id, {
    fingerprint: details.fingerprint,
    keyType: details.keyType,
  });

  if (pendingAction === 'provision') {
    await provisionKey(vps.id, password);
  }

  if (pendingAction === 'install-agent') {
    await installAgent(vps.id, password || undefined);
  }
}
```

After success:

```text
clear pending trust state
clear password from provider state
refresh VPS list/workspace state
```

### 5. Mount dialog once near app shell

Mount in `DashboardLayout` or provider-owned UI layer:

```tsx
<SshHostKeyTrustDialog
  open={!!pendingHostKeyTrust}
  details={pendingHostKeyTrust?.details ?? null}
  busy={busy}
  onCancel={...}
  onTrust={handleTrustHostKeyAndContinue}
/>
```

### 6. UI status

Optional but recommended:

- Show a badge on VPS card/detail:

```text
Host key trusted
Host key trust required
```

- Add action:

```text
Scan / trust host key
```

This can be Phase 2 UI polish after core flow works.

---

## Error handling rules

### Frontend behavior by API error code

```text
SSH_HOST_KEY_TRUST_REQUIRED
→ open trust dialog

SSH_HOST_KEY_MISMATCH
→ show destructive alert, do not retry

SSH_CONNECT_TIMEOUT / SSH_AUTH_FAILED
→ show normal action error

unknown / 500
→ show normal action error
```

### Backend HTTP codes

```text
409 SSH_HOST_KEY_TRUST_REQUIRED
409 SSH_HOST_KEY_MISMATCH
502 SSH_CONNECT_FAILED
401/403 auth/session errors
400 validation errors
```

---

## Security checklist

- Backend must re-scan host key before trusting.
- Backend must compare scanned fingerprint to submitted fingerprint.
- Password must stay memory-only.
- Password must not be logged.
- Fingerprint mismatch must not overwrite existing trust.
- Trust action must be audited.
- Existing env pins still work.
- `SSH_HOST_KEY_POLICY=strict` remains production default.

---

## Test plan

### Backend tests

- Scan endpoint returns fingerprint for reachable SSH host.
- Trust endpoint stores pin when scanned fingerprint matches request fingerprint.
- Trust endpoint rejects mismatch.
- Provision without pin returns `409 SSH_HOST_KEY_TRUST_REQUIRED`.
- Provision with DB pin proceeds to SSH auth step.
- Env pins still work.
- DB pin takes effect without API restart.
- Audit event is recorded on trust.

### Frontend tests

- Provision host-key-required error opens trust dialog.
- Dialog displays host, port, fingerprint, key type.
- Cancel leaves VPS created and does not retry.
- Trust calls trust endpoint then retries provision.
- Password is cleared after success/cancel.
- Mismatch error shows destructive alert.

### Manual QA

1. Add a new VPS without existing pin.
2. Confirm trust dialog appears.
3. Verify fingerprint against provider or manual `ssh-keyscan`.
4. Click Trust and continue.
5. Confirm SSH key provisioning succeeds.
6. Refresh page and verify trusted state persists.
7. Rebuild VPS or change SSH host key and confirm mismatch warning.

---

## Implementation phases

### Phase 1: Backend foundation

- Add migration/table.
- Add repository/service.
- Add scan/trust endpoints.
- Add structured host-key errors.
- Wire SSH verifier to DB + env pins.
- Add backend tests where practical.

### Phase 2: Frontend trust flow

- Add API client methods and typed API errors.
- Add trust dialog.
- Catch host-key-required errors in provision/install actions.
- Trust + retry pending action.
- Add frontend tests.

### Phase 3: UI polish

- Show trusted/untrusted host-key state.
- Add manual scan/trust action in VPS settings/card.
- Add re-trust/rotate flow for rebuilt VPS.

### Phase 4: Cleanup/docs

- Document production strict policy.
- Document env pins as advanced/manual override.
- Remove manual `.env` pinning from normal operational docs.

---

## Open questions

1. Should host key pins be scoped only by `vps_id`, or also reusable by `host:port`?
   - Recommended: support both, prefer `vps_id` first.
2. Should the app show `ssh-keyscan` command to user for independent verification?
   - Recommended: yes.
3. Should `serverLabel`/host changes invalidate existing pins?
   - Recommended: if host or port changes, require re-scan/re-trust.
4. Should trust action require re-entering dashboard password?
   - Optional. Current session auth may be enough.
