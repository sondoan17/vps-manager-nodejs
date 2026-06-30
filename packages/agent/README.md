# VPS Manager Agent

A lightweight Go agent for collecting and pushing system metrics to VPS Manager backend.

## Requirements

- Go 1.21+
- Linux (for full metrics collection; other platforms return `ErrUnsupported`)

## Building

The build produces a Linux amd64 binary regardless of the host OS:

```bash
npm run build:agent
```

Or from the agent directory with explicit env:

```bash
cd packages/agent
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o dist/vps-agent-linux-amd64 ./cmd/vps-agent
```

The output is `packages/agent/dist/vps-agent-linux-amd64`.

## Usage

### Create a manual agent token

Create/register a VPS record first, then generate a one-time-display agent token for that VPS:

```bash
npm run create-agent-token -- -- --vps-id vps_123
```

The command prints a ready-to-copy config example. The raw token is printed once; only its hash is stored in backend data.

For local manual testing, use a reachable backend URL in the config, for example:

```json
"backendUrl": "http://localhost:3000"
```

### Configuration

Create a JSON config file:

```json
{
  "backendUrl": "https://your-backend.example.com",
  "vpsId": "vps_123",
  "token": "vma_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "intervalSeconds": 15,
  "requestTimeoutSeconds": 10
}
```

**Config fields:**

| Field               | Description                            | Constraints        |
|---------------------|----------------------------------------|--------------------|
| `backendUrl`        | Backend API base URL                   | Absolute URL, required |
| `vpsId`             | VPS identifier                         | Non-empty, required |
| `token`             | Agent authentication token (`vma_...`) | Non-empty, required |
| `intervalSeconds`   | Collection interval in seconds         | >= 1              |
| `requestTimeoutSeconds` | HTTP request timeout               | > 0               |

### Run once (test/debug)

```bash
vps-agent -config /path/to/config.json -once
```

### Run continuously

```bash
vps-agent -config /path/to/config.json
```

The agent will collect metrics every `intervalSeconds` and push them to the backend. On push failures, it retries with exponential backoff and jitter.

### Manual end-to-end check

1. Start the backend/frontend app.
2. Create a VPS record and note its `id`.
3. Generate a token:
   ```bash
   npm run create-agent-token -- -- --vps-id <vps_id>
   ```
4. Save the printed `configExample` to a JSON file on a Linux VPS/VM.
5. Run one push:
   ```bash
   ./vps-agent -config ./config.json -once
   ```
6. Confirm the backend has a sample:
   ```bash
   curl http://localhost:3000/api/metrics
   ```
7. Open the dashboard Metrics page; the SSE stream should update from backend-ingested agent metrics.

## Signals

- `SIGINT` / `SIGTERM` — graceful shutdown

## Metrics Collected

| Metric       | Source              | Description                      |
|-------------|---------------------|----------------------------------|
| CPU         | `/proc/stat`        | Usage % (delta over interval)    |
| Memory      | `/proc/meminfo`     | Used %                           |
| Disk        | `statfs("/")`       | Used % for root filesystem       |
| Load        | `/proc/loadavg`     | 1-minute load average            |
| Network Rx  | `/proc/net/dev`     | Bytes/sec (non-loopback, rate over interval) |
| Network Tx  | `/proc/net/dev`     | Bytes/sec (non-loopback, rate over interval) |
| Uptime      | `/proc/uptime`      | System uptime in seconds         |

## Architecture

```
cmd/vps-agent/main.go          — Entry point, CLI flags, signal handling
internal/config/config.go      — JSON config loading and validation
internal/metrics/collector.go  — Procfs metric parsers + Collector
internal/metrics/disk_linux.go — Disk usage via statfs (Linux only)
internal/metrics/disk_other.go — Unsupported stub (non-Linux)
internal/push/client.go        — HTTP push client with retry/backoff
internal/run/run.go            — Once/loop runner
```

## Security

- The agent **never logs the token**.
- Config `String()` method redacts the token.
- Token-like strings (`vma_...`) are redacted from backend error response bodies.
- Auth errors (401/403) and bad request errors (400/404) are fatal and not retried.
- TLS certificate verification is **not** skipped (no `insecureSkipVerify`).
- The `vpsId` is **not** sent in the push payload; the backend derives it from the token.
