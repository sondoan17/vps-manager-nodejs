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

## One-Command Install (Linux amd64)

```bash
curl -fsSL https://raw.githubusercontent.com/sondoan17/vps-manager-nodejs/main/scripts/install.sh | sudo bash
```

This installs:
- **Docker app**: Web UI + API server in containers (`/opt/vps-manager`)
- **Host agent**: systemd unit that collects system metrics and pushes to the local API
- **Dashboard**: accessible at `http://<your-ip>:38280`

The installer:
1. Detects Linux amd64 and Docker (auto-installs with `--install-docker`)
2. Generates secure config in `/opt/vps-manager/.env` (mode 0600)
3. Creates a `docker-compose.yml` with API (loopback `127.0.0.1:38281`) and Web (`:38280`)
4. Pulls images and starts containers
5. Sets the dashboard password
6. Extracts the agent binary from the API container
7. Bootstraps an agent credential and config
8. Installs the systemd agent via `install-local-agent.sh`

Options: `--help`, `--dry-run`, `--app-dir`, `--app-port`, `--api-port`, `--api-image`, `--web-image`, `--backend-url`, `--allow-insecure-backend-url`, `--dashboard-password-file`, `--install-docker`, `--skip-pull`, `--skip-agent`, `--rotate-agent`, `--enable-docker-metrics-access`.

Docker metrics are off by default and can be toggled per server from the dashboard. To let the host systemd agent read Docker metrics, install it with `--enable-docker-metrics-access`; this adds `SupplementaryGroups=docker` to the service unit. The Docker group is root-equivalent, so only enable this on hosts where you accept that permission. The Docker collector reports bounded container names, image names, status, and resource usage only; it does not collect env vars, labels, mounts, logs, or commands.

### Docker App Only (without host agent)

```bash
sudo ./scripts/install.sh --skip-agent
```

### Host Agent Only (if app is already running)

```bash
# Extract binary and bootstrap credential
umask 077
AGENT_CONFIG="$(mktemp)"
docker compose -f /opt/vps-manager/docker-compose.yml exec -T api node dist/scripts/bootstrap-local-agent.js \
  --backend-url http://127.0.0.1:38280 \
  --config-only \
  --rotate > "$AGENT_CONFIG"

docker cp $(docker compose -f /opt/vps-manager/docker-compose.yml ps -q api):/app/agent/vps-agent-linux-amd64 /tmp/vps-agent

sudo ./scripts/install-local-agent.sh --binary /tmp/vps-agent --config "$AGENT_CONFIG"
# Optional Docker metrics access:
# sudo ./scripts/install-local-agent.sh --binary /tmp/vps-agent --config "$AGENT_CONFIG" --enable-docker-metrics-access
KEEP_CREDENTIAL_ID="$(sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"vma_\([^"]*\)_.*/\1/p' "$AGENT_CONFIG" | head -1)"
docker compose -f /opt/vps-manager/docker-compose.yml exec -T api node dist/scripts/revoke-agent-credentials.js \
  --vps-id vps_local_host \
  --keep-credential-id "$KEEP_CREDENTIAL_ID"
rm -f "$AGENT_CONFIG" /tmp/vps-agent
```

### Uninstall

```bash
sudo ./scripts/install-local-agent.sh --uninstall             # removes host agent
docker compose -f /opt/vps-manager/docker-compose.yml down    # stops containers, preserves data

# Optional destructive purge:
docker compose -f /opt/vps-manager/docker-compose.yml down -v
sudo rm -rf /opt/vps-manager
```

## Architecture

The architecture uses two agent modes:

1. **In-process local agent** (`LocalAgentSupervisorService`): When `APP_MODE=local` and `LOCAL_AGENT_ENABLED=true`, the API process itself collects system metrics every N seconds and pushes them to the `MetricRepository`. The machine is registered as a local `VpsRecord` with `kind=local`, `managedBy=system`. Requires no separate binary.

2. **Host systemd agent**: A standalone Go binary (`vps-agent`) deployed as a systemd service. Configured via `bootstrap-local-agent` script which creates a credential/token and outputs agent config. Used in production deployments when the API runs in Docker and the host needs separate metric collection.

## Scripts

- `npm run dev` - run the API workspace with `tsx watch`
- `npm run dev:web` - run the Vite dashboard with `/api` proxy
- `npm run build:web` - build React dashboard into root `public/`
- `npm run build:api` - compile TypeScript API to root `dist/`
- `npm run build` - build web, then API
- `npm start` - run compiled server
- `npm test` - run backend and frontend Vitest tests
- `npm run typecheck` - typecheck API and web workspaces
- `npm run bootstrap-local-agent` - bootstrap agent credential and config (`--backend-url <url>` required)
- `npm run set-dashboard-password` - set dashboard admin password

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
