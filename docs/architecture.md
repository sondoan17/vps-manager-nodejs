# Architecture

This repository is an npm workspaces monorepo with a NestJS API and Vite React dashboard.

## Runtime Shape

The backend starts from `packages/api/src/server.ts`, creates an Express server, mounts request ID middleware, Helmet, mutation rate limiting, static serving from root `public/`, and then attaches NestJS through an Express adapter.

`packages/api/src/app.module.ts` wires controllers and services with dependency injection. The current portfolio MVP keeps JSON persistence behind repository interfaces so SQLite can replace it later without changing controllers.

## Backend Modules

- Config: parses `APP_MODE`, `LOCAL_AUTH_TOKEN`, terminal flags, private-network flags, and storage directories.
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
