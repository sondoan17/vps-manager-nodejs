# Architecture

This repository is an npm workspaces monorepo with a NestJS API and Vite React dashboard.

## Runtime Shape

The backend starts from `packages/api/src/server.ts`, creates an Express server, mounts request ID middleware, Helmet, mutation rate limiting, static serving from root `public/`, and then attaches NestJS through an Express adapter.

`packages/api/src/app.module.ts` wires controllers and services with dependency injection. The current portfolio MVP keeps JSON persistence behind repository interfaces so SQLite can replace it later without changing controllers.

## Backend Modules

- Config: parses `APP_MODE`, `DASHBOARD_SESSION_SECRET`, terminal flags, private-network flags, and storage directories.
- VPS: stores local VPS metadata in `data/vps.json` and preserves the existing CRUD/provision/verify API.
- SSH: wraps real `ssh2` helpers with demo-mode and host-policy gates.
- Dashboard: exposes `GET /api/dashboard` with demo overview data, jobs, metrics, audit, terminal, and settings.
- Audit, Jobs, Metrics: JSON-backed primitives for portfolio MVP operational depth.

## Frontend

`packages/web` is a Vite React app using local shadcn-style primitives and Tailwind tokens. The dashboard renders a single page with section anchors for Overview, Servers, Jobs, Metrics, Terminal, Audit Log, and Settings.

## Persistence

The MVP uses JSON files under `data/` and key material under `private/`. JSON writes use atomic temp-file replacement and private file modes. `data/` and `private/` are not statically served.

## Deployment

`Dockerfile` builds web assets into `public/`, compiles the API into `dist/`, runs as a non-root user, exposes port 3000, and checks `/api/health`. `docker-compose.yml` starts demo mode with writable volumes for `/app/data` and `/app/private`.

## Docker Management

Docker monitoring remains read-only and can be enabled independently from `dockerManagementEnabled`, which defaults to `false`. Dashboard mutations are limited to confirmed `start`, `stop`, and `restart` actions scoped to a VPS, agent instance, and opaque container key. The API stores bounded operation state in the configured JSON or PostgreSQL repository and never opens the Docker socket.

The agent owns Docker socket access. Its independent command worker claims authenticated operations, records bounded receipts, enforces deadlines and target identity, and reports uncertain outcomes without replaying a mutation. Container logs are manually requested, bounded, text-only, and held only in memory; they are not written to jobs, audit, SSE, or persistent storage.

Deploy an agent containing the command worker before enabling Docker management for a VPS. Management capability and target discovery remain available when Docker monitoring is disabled; monitoring data itself is still controlled by `dockerMetricsEnabled`.

Legacy Docker monitoring snapshots receive a durable per-VPS source sequence inside the repository transaction, after duplicate snapshot detection. JSON serializes the same allocation through its store writer; PostgreSQL uses the VPS advisory transaction lock. A legacy snapshot cannot replace an active v2 identity. Repeated `23505` errors on `docker_snapshot_ledger_vps_id_agent_instance_id_source_sequ_key` with `(legacy, 1)` indicate an API predating this allocation fix: deploy the corrected API without deleting agent state or ledger rows. Validate recovery using advancing `docker_ingest_latest.source_sequence` and fresh `docker_metric_samples.received_at`, not just `agent_states.last_seen_at` or the API health endpoint.
