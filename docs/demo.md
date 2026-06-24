# Demo Guide

## Start Demo Mode

```bash
npm ci
npm run build
APP_MODE=demo npm start
```

Open `http://localhost:3000`.

## What Recruiters Can Review

- Demo banner proving no real SSH connections are used.
- Overview health cards for total, healthy, warning, and running jobs.
- Seeded servers: `edge-sgp-01`, `api-fra-02`, and `worker-sfo-01`.
- Job lifecycle cards showing queued, running, and succeeded command jobs.
- Metrics cards with fresh and stale telemetry states.
- Audit timeline with dashboard, job, terminal, and blocked-host events.
- Demo terminal with canned command output only.
- Settings panel showing `APP_MODE=demo`, disabled real SSH, and local auth posture.

## Docker Demo

```bash
docker compose up --build
```

Compose starts with safe demo defaults and writable volumes for JSON data and private key material.

## Scope Boundaries

The portfolio MVP intentionally does not include cloud-provider provisioning, Kubernetes, Redis, Postgres, Prometheus, arbitrary shell commands, or a real WebSocket terminal. Those are post-MVP roadmap items.
