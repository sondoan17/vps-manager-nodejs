# VPS Operations Dashboard

Self-hosted VPS Operations Dashboard with safe demo mode, SSH key provisioning, simulated realtime metrics, command jobs, demo terminal output, audit logs, Docker deployment, and CI.

The project is portfolio-ready without real VPS credentials: `APP_MODE=demo` seeds sample servers, fake metrics, job progress, audit events, and canned terminal output while disabling real SSH/network operations.

## Screenshots

Screenshots are captured under `docs/screenshots/` after running the production dashboard locally:

- `docs/screenshots/overview.png` - dashboard overview, server health, jobs, metrics, audit, and demo terminal
- `docs/screenshots/mobile.png` - mobile responsive layout

## Demo Quickstart

```bash
npm ci
npm run build
APP_MODE=demo npm start
```

Open `http://localhost:3000`. Demo mode needs no credentials and shows the banner `Demo mode: simulated servers, no real SSH connections.`

## Docker Quickstart

```bash
# Set the Postgres password first
export POSTGRES_PASSWORD=your_secure_password_here
docker compose up --build
```

The Compose service defaults to `APP_MODE=demo`, exposes `http://localhost:3000`, and mounts writable volumes for `/app/data` and `/app/private`.

`POSTGRES_PASSWORD` is **required** — it is used by the Postgres container on first start and by the API to construct `DATABASE_URL`. Set it via environment variable or `.env` file.

Before the API starts, the Compose stack automatically runs a one-shot `migrate` service that applies core database migrations (non-optional). The API waits for migrations to complete successfully. Optional TimescaleDB migrations remain manual (see `docs/postgres-timescale-storage.md`).

## Features

- Safe demo dashboard with seeded servers: `edge-sgp-01`, `api-fra-02`, and `worker-sfo-01`.
- Health cards for total, healthy, warning, unreachable, and running jobs.
- Simulated command jobs with queued/running/succeeded progress states and bounded output previews.
- Fresh/stale metric cards for CPU, memory, disk, load, network, and uptime samples.
- Audit timeline for dashboard views, job state transitions, terminal opens, and blocked SSH host attempts.
- Read-only demo terminal with canned commands and no real network access.
- Local VPS CRUD and SSH key provisioning flow with one-time passwords only.
- Runtime safety config, local-mode bearer auth, request IDs, rate limiting, Helmet headers, redaction, and SSH host policy.
- Production web build served from root `public/` with static path protection.

## Architecture

- `packages/api/` - NestJS on an Express adapter, controllers, services, repositories, config, security middleware, and tests.
- `packages/web/` - Vite React dashboard with shadcn-style local primitives and Tailwind design tokens.
- `data/` - JSON persistence for portfolio MVP data files.
- `private/` - local SSH key material, gitignored and never returned by the API.
- `public/` - built frontend assets served by the backend.
- `dist/` - compiled backend; `npm start` runs `node dist/server.js`.

See `docs/architecture.md` for module details.

## Security Model

Demo mode cannot call real SSH. Local mode requires a DB-backed admin password for dashboard access (set via `npm run set-dashboard-password`). Real SSH operations remain guarded by host policy and explicit config. Passwords are accepted only for provisioning requests and are never stored in browser storage, JSON files, logs, public assets, or API responses.

See `docs/security.md` for the full model.

## Scripts

- `npm run dev` - run the API workspace with `tsx watch`
- `npm run dev:web` - run the Vite dashboard with `/api` proxy
- `npm run build:web` - build React dashboard into root `public/`
- `npm run build:api` - compile TypeScript API to root `dist/`
- `npm run build` - build web, then API
- `npm start` - run compiled server
- `npm test` - run backend and frontend Vitest tests
- `npm run typecheck` - typecheck API and web workspaces

## API Surface

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/vps`
- `POST /api/vps`
- `GET /api/vps/:id`
- `PATCH /api/vps/:id`
- `DELETE /api/vps/:id`
- `POST /api/vps/:id/provision-key` with `{ "password": "..." }`
- `POST /api/vps/:id/verify-key`

List endpoints (`/api/jobs`, `/api/audit`, `/api/metrics`) support pagination via `?limit=N&offset=N`. Default limit is 100, max is 500 for each. Responses include a `page` object with `{ limit, offset, nextOffset? }`. Audit filters use AND semantics: `?resourceId=x&result=y` returns only events matching all criteria. Metrics `?vpsId=x` returns 0 or 1 latest sample (no pagination).

Rate limiting is per-process in demo/JSON mode and shared through Postgres-backed buckets when `STORAGE_DRIVER=postgres`. Set `TRUST_PROXY_HOPS` when running behind a trusted reverse proxy so limits apply to the real client IP.

## Testing Strategy

CI runs `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and a Docker image build. Backend tests cover config safety, auth, redaction, SSH host policy, static path protection, secret non-leakage, and demo dashboard data. Frontend tests cover dashboard rendering and password storage invariants.

## Roadmap Scope

Implemented portfolio MVP: demo mode, seeded servers, health cards, simulated jobs, metrics, audit timeline, demo terminal, Docker Compose, GitHub Actions, and portfolio docs. Post-MVP items remain intentionally deferred: full WebSocket SSH terminal, SQLite persistence, server-sent realtime updates, and cloud-provider provisioning.
