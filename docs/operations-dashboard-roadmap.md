# Operations Dashboard Roadmap

## Goal

Evolve this project from a simple VPS management web app into a portfolio-ready self-hosted VPS Operations Dashboard with depth across backend, security, DevOps, and UI.

The final product should be easy for recruiters to review without real VPS credentials, while still supporting real local/self-hosted SSH operations behind explicit safeguards.

## Current Baseline

The project already has a solid foundation:

- npm workspaces monorepo.
- `packages/api`: NestJS + TypeScript backend with controllers, modules, injectable services, and an Express adapter for static serving.
- `packages/web`: React + Vite dashboard with shadcn-style components.
- `ssh2`-based SSH key provisioning.
- Passwords are used only for provisioning and are not persisted.
- Frontend build output is served from root `public/`.
- Existing tests cover API behavior, dashboard flows, and secret leakage checks.

Current gaps:

- No demo mode.
- No auth/security middleware beyond validation and generic errors.
- No audit log.
- No job queue.
- No metrics collection.
- No web SSH terminal.
- No Docker or CI.
- README and demo assets are not yet portfolio-grade.

## Product Positioning

Use this description for README/CV once the roadmap is implemented:

> Self-hosted VPS Operations Dashboard with safe demo mode, SSH key provisioning, realtime metrics, command jobs, web terminal, audit logs, Docker deployment, and CI.

## Phase 0: Scope And Demo Safety

Define a clear runtime mode contract before adding more features.

### Features

- Add `APP_MODE=demo | local`.
- In `demo` mode:
  - Seed sample VPS inventory.
  - Simulate SSH provisioning and verification.
  - Simulate metrics, jobs, audit events, and terminal output.
  - Disable all real SSH/network operations.
  - Show a visible banner: `Demo mode: simulated servers, no real SSH connections.`
- In `local` mode:
  - Allow real SSH operations only after auth and explicit config.
  - Keep web terminal disabled unless `ENABLE_WEB_TERMINAL=true`.

### Tests

- Config parsing accepts only valid app modes.
- Invalid `APP_MODE` fails fast.
- Demo mode cannot call the real SSH provider.
- Demo mode loads sample data without credentials.

### Avoid

- Real SSH in public demo.
- Kubernetes or cloud-provider provisioning.
- Arbitrary command execution.

## Phase 1: Backend Foundation And Security

Create backend primitives for operational depth without overengineering.

### NestJS Module Direction

Build future backend depth as NestJS modules instead of adding more route logic to a single app file:

```txt
ConfigModule
AuthModule
VpsModule
SshModule
KeysModule
JobsModule
MetricsModule
AuditModule
TerminalModule
DemoModule
CommonModule
```

Each feature should expose a controller only when it needs HTTP endpoints, keep business logic in injectable services, and use repositories/providers behind interfaces for testability.

### Domain Models

Add or expand:

- `VpsRecord`
  - Existing: `id`, `name`, `host`, `port`, `username`, `createdAt`, `updatedAt`, `keyProvisionedAt`.
  - Add: `provider`, `region`, `tags`, `status`, `lastSeenAt`, `notes`.
- `MetricSample`
  - `vpsId`, `cpu`, `memory`, `disk`, `loadAverage`, `networkRx`, `networkTx`, `uptime`, `collectedAt`.
- `CommandJob`
  - `id`, `vpsId`, `type`, `status`, `startedAt`, `finishedAt`, `exitCode`, `outputPreview`, `errorMessage`.
- `AuditEvent`
  - `id`, `actor`, `action`, `resourceType`, `resourceId`, `result`, `timestamp`, `metadata`.
- `CredentialState`
  - key provisioned/verified state only, never password material.

### Persistence

Keep JSON for the portfolio MVP, but split by concern:

```txt
data/vps.json
data/jobs.json
data/audit.json
data/metrics.json
```

Introduce repository interfaces so SQLite can replace JSON later:

- `VpsRepository`
- `JobRepository`
- `AuditRepository`
- `MetricRepository`

### Security Baseline

Add:

- Runtime config validation.
- Request ID middleware.
- Auth middleware for local mode.
- Security headers, for example via `helmet`.
- Rate limiting for sensitive endpoints.
- Central redaction utility.
- Normalized error responses.
- SSH host policy.
- Audit context.

Security rules:

- Never persist passwords.
- Never return private keys.
- Do not display SSH key material in API/UI unless deliberately designed.
- Demo mode cannot call real `ssh2`.
- Terminal is disabled by default.
- Real SSH operations require local mode and auth.
- Block metadata hosts such as `169.254.169.254`.
- Private-network targets require explicit local config.

### Tests

- Local mode requires auth for mutations.
- Demo mode blocks real SSH.
- Error responses do not leak passwords, private keys, raw SSH errors, or secret command output.
- Static serving still does not expose `data`, `private`, `packages/api`, or `packages/web`.

## Phase 2: Demo Backend And Dashboard MVP

Make the project reviewable without real credentials.

### Provider Abstractions

Add abstractions with real and demo implementations:

```txt
SshProvider
  RealSshProvider
  DemoSshProvider

MetricsProvider
  RealMetricsProvider
  DemoMetricsProvider

JobExecutor
  RealJobExecutor
  DemoJobExecutor

TerminalProvider
  RealTerminalProvider
  DemoTerminalProvider
```

### Demo Data

Seed sample servers:

- `edge-sgp-01`
- `api-fra-02`
- `worker-sfo-01`

Demo states:

- healthy
- warning
- unreachable

Demo behavior:

- Fake metrics.
- Fake command job progress.
- Fake SSH verification/provisioning result.
- Fake audit events.
- Fake terminal prompt and canned command output.

### Dashboard UI

Evolve from a single CRUD page into a dashboard shell:

```txt
Overview
Servers
Jobs
Metrics
Terminal
Audit Log
Settings
```

Recruiter-visible components:

- Demo mode banner.
- Total servers card.
- Healthy/warning/down cards.
- Running jobs card.
- Latest audit event card.
- Server table or card grid.
- Server detail panel.
- Job timeline.
- Metric cards/charts.
- Audit timeline.

Suggested frontend layout:

```txt
packages/web/src/
  components/
    dashboard/
    servers/
    jobs/
    metrics/
    audit/
    terminal/
    demo/
    ui/
  lib/
    api.ts
    formatting.ts
```

### Tests

- Demo banner renders.
- Dashboard renders seeded servers.
- Filters/search work.
- Metrics cards render fresh/stale states.
- Password fields still do not use `localStorage` or `sessionStorage`.

## Phase 3: Jobs, Metrics, And Audit Logs

Make the dashboard feel operational instead of CRUD-only.

### Command Jobs

Move long SSH operations off the request path.

Job statuses:

```txt
queued
running
succeeded
failed
cancelled
```

Initial job types:

- verify key
- provision key
- collect metrics
- collect system info
- check disk usage

Rules:

- One active job per VPS by default.
- Use predefined command catalog.
- Do not support arbitrary shell commands in the MVP.
- Store bounded output previews only.
- Redact secrets.
- Audit every state transition.

### Metrics

Start with high-signal metrics:

- CPU/load.
- Memory.
- Disk.
- Uptime.
- Network RX/TX, optional.
- Last updated and stale status.

Real collection should be read-only and low privilege:

```bash
uptime
df -P
free -m
cat /proc/loadavg
cat /proc/uptime
```

Polling is acceptable for the first version. Server-Sent Events can be added later for job/metric updates. Keep WebSocket for terminal.

### Audit Logs

Audit these actions:

- server created/updated/deleted
- key provision started/succeeded/failed
- verify started/succeeded/failed
- job queued/running/succeeded/failed
- terminal opened/closed
- auth failure

UI filters:

- server
- action
- result
- time range

### Tests

- Job lifecycle transitions.
- Per-VPS concurrency rules.
- Output truncation.
- Redaction.
- Metrics parsers with sample command outputs.
- Audit events for sensitive actions.
- Audit metadata never contains passwords or private keys.

## Phase 4: Guarded Web SSH Terminal

Add the standout portfolio feature safely.

### Demo Terminal

Public demo behavior:

- Fake prompt.
- Canned command outputs.
- No real network calls.
- Visible `Demo terminal` label.

Suggested demo commands:

```bash
uptime
df -h
free -m
systemctl status nginx
journalctl -n 20
```

### Real Terminal

Real terminal rules:

- Disabled unless `ENABLE_WEB_TERMINAL=true`.
- Requires local mode.
- Requires auth.
- Requires key already provisioned.
- Session timeout.
- Idle timeout.
- Max concurrent sessions.
- Audit open/close/failure.
- Do not persist full transcripts by default.
- Never expose real SSH in public demo.

Implementation path:

1. Start with command-console style.
2. Add full WebSocket terminal after policies and audit are stable.

### Tests

- Demo mode blocks real terminal SSH.
- Unauthenticated terminal requests are rejected.
- Disabled terminal returns safe errors.
- Session timeout cleanup works.
- Audit events are written for terminal open/close/failure.

## Phase 5: DevOps And Self-Hosting

Make the repo easy to run and credible as a self-hosted app.

### Docker

Add:

```txt
Dockerfile
docker-compose.yml
.dockerignore
```

Requirements:

- Multi-stage build.
- Non-root runtime user.
- Healthcheck.
- Volumes for `/app/data` and `/app/private`.
- `public/` included as built frontend output.
- Runtime starts `dist/server.js`.
- `data` and `private` are writable.

Environment variables:

```env
PORT=3000
APP_MODE=demo
ADMIN_TOKEN=
ENABLE_WEB_TERMINAL=false
ALLOW_PRIVATE_NETWORK_TARGETS=false
```

### CI/CD

Add GitHub Actions workflow:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Add a README badge after CI is green.

## Phase 6: Docs, Demo Assets, And CV Readiness

Make the project easy to evaluate quickly.

### Documentation

Add:

```txt
docs/architecture.md
docs/security.md
docs/demo.md
docs/screenshots/
```

README should include:

- Strong product headline.
- Screenshot/GIF.
- Live demo link if available.
- Demo mode quickstart.
- Docker quickstart.
- Feature list.
- Architecture diagram.
- Security model.
- Testing strategy.
- Roadmap.

### Screenshots

Capture:

- Overview.
- Server detail.
- Jobs.
- Metrics.
- Audit log.
- Demo terminal.

### CV Bullets

Example bullets:

- Built a self-hosted VPS Operations Dashboard with NestJS, TypeScript, React, shadcn/ui, and Docker.
- Implemented secure SSH key provisioning with no password persistence and no key material exposure.
- Designed safe demo mode with simulated servers, metrics, jobs, terminal output, and audit events for public portfolio review.
- Added job-based command execution, audit logging, realtime metrics, and guarded web terminal workflows.
- Added CI verification for tests, typecheck, production build, and Docker image build.

## Recommended Implementation Order

1. Add `APP_MODE=demo | local`.
2. Add config validation.
3. Add demo providers.
4. Add dashboard overview.
5. Add audit logs.
6. Add job runner.
7. Add metrics.
8. Add local-mode auth.
9. Add Docker Compose.
10. Add GitHub Actions.
11. Improve README and screenshots.
12. Add guarded web terminal.

## Shortest Portfolio MVP

If time is limited, build these first:

1. Demo mode without real VPS credentials.
2. Seeded servers and fake metrics.
3. Dashboard overview with health cards.
4. Simulated jobs with progress.
5. Audit timeline.
6. Docker Compose.
7. GitHub Actions and README screenshots.

Then add the guarded web terminal as milestone two.

## Final Verification Checklist

Before calling the project portfolio-ready:

- `npm test` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Docker image builds.
- Docker Compose starts successfully.
- `/api/health` returns OK.
- Demo mode starts without credentials.
- Demo banner is visible.
- Metrics look fresh or intentionally stale.
- Demo jobs progress and finish.
- Audit log records actions.
- Demo terminal cannot reach real SSH.
- Local real SSH requires explicit config and auth.
- Passwords are never stored in browser storage.
- Passwords and private keys do not appear in API responses, JSON files, logs, screenshots, or docs.
- Static serving does not expose `data`, `private`, `packages/api`, or `packages/web`.

## What To Avoid

- Do not add Kubernetes in the first portfolio version.
- Do not add cloud-provider provisioning before core VPS operations are strong.
- Do not expose real SSH operations in a public demo.
- Do not add arbitrary command execution as the MVP.
- Do not store passwords or terminal transcripts.
- Do not add Redis/Postgres/Prometheus too early.
- Do not over-refactor the monorepo before visible product value exists.
- Do not claim realtime behavior if data is static and has no freshness indicator.
- Do not include real hostnames, IPs, secrets, or private keys in demo screenshots.
- Do not build UI polish without tested backend behavior.
