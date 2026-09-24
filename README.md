# VPS Operations Dashboard

A self-hosted dashboard for monitoring and managing VPS instances. The project includes a NestJS API, a React/Vite web interface, and an optional Go agent for host metrics. Demo mode uses simulated data, so you can explore the dashboard without a VPS or real SSH credentials.

> **License status:** This repository does not currently contain a `LICENSE` file. No license to use, modify, or distribute the source code has been granted. Contact the maintainer before using it beyond the permissions provided by GitHub's terms.

## Features

- Server health overview and CPU, memory, disk, system load, network, and uptime metrics.
- VPS management, SSH key provisioning and verification, command jobs, and audit logs.
- Demo mode with simulated servers, metrics, job progress, and terminal output; no real SSH connections.
- Local mode with dashboard authentication, SSH host restrictions, and an optional web terminal.
- Optional host agent for metrics collection and Docker monitoring. Docker socket access is not granted by default.
- JSON or PostgreSQL storage, with Docker Compose and a Linux amd64 installer available for deployment.

## Requirements

- From source: a Node.js version compatible with the workspaces (Node.js 22 recommended), npm, and Git.
- With Docker Compose: Docker and Docker Compose; Node.js is not required on the host.
- With the installer: Linux amd64, systemd if installing the host agent, and `sudo` access. Review the script before running it with administrator privileges.

## Try it locally (no VPS required)

```bash
git clone https://github.com/sondoan17/vps-manager-nodejs.git
cd vps-manager-nodejs
npm ci
npm run build
npm start
```

The default is `APP_MODE=demo`. Open <http://localhost:3000>; the API health endpoint is <http://localhost:3000/api/health>. Demo mode uses simulated data and does not establish real SSH connections.

For development, run `npm run dev` (API) and `npm run dev:web` (Vite) in separate terminals. Copy `.env.example` to `.env` and adjust settings as needed; never commit secrets. See [.env.example](.env.example) for environment variables and defaults.

## Deploy with Docker Compose

Create a `.env` file in the repository root with a strong PostgreSQL password:

```dotenv
POSTGRES_PASSWORD=replace_with_a_strong_password
```

Then run:

```bash
docker compose up --build -d
```

Open <http://localhost:3000>. Compose starts PostgreSQL, runs migrations before starting the API, and serves the web interface through nginx. The API is bound to `127.0.0.1:3001` on the host. Demo mode remains the default. Data and private keys are stored in Docker volumes: `docker compose down` preserves them, while `docker compose down -v` **deletes the data**. Optional TimescaleDB migrations are described in the [storage guide](docs/postgres-timescale-storage.md).

## Install on a Linux amd64 VPS

Use [scripts/install.sh](scripts/install.sh) to deploy the application and host agent. **Review the script and its options before running it with sudo**:

```bash
sudo ./scripts/install.sh --help
sudo ./scripts/install.sh --dry-run
sudo ./scripts/install.sh
```

The installer creates configuration under `/opt/vps-manager`, starts the containers, sets the dashboard password, and installs a systemd agent to collect host metrics. The dashboard is available at `http://<server-ip>:38280` by default. Use `--skip-agent` to install only the application, or `--install-docker` to let the installer install Docker. Run `--help` for other options.

**Deployment security:** Do not expose the local-mode dashboard to the public Internet over plain HTTP. Use HTTPS and configure the origin and cookies accordingly. Enable `ENABLE_WEB_TERMINAL=true` only in `APP_MODE=local`, with the required settings documented in [.env.example](.env.example). The agent has no Docker access by default; `--enable-docker-metrics-access` grants membership in the `docker` group, which is effectively root-equivalent on the host. Read the [security model](docs/security.md) before enabling SSH, the terminal, or Docker access.

## Configuration and project layout

| Component | Location | Purpose |
| --- | --- | --- |
| API | `packages/api/` | NestJS/Express, authentication, VPS, metrics, jobs, audit |
| Web | `packages/web/` | React/Vite dashboard |
| Agent | `packages/agent/` | Host metrics collection and authorized Docker operations |
| Local data | `data/`, `private/` | JSON data and SSH keys; not served over HTTP |
| Deployment | `docker-compose.yml`, `scripts/` | Compose, migrations, and host agent installation |

`APP_MODE=demo` is for public exploration without real SSH. `APP_MODE=local` is for managing real infrastructure and requires a dashboard administrator password; set it with `npm run set-dashboard-password` (or the corresponding production script). `STORAGE_DRIVER=json` is the default when running directly; Compose uses PostgreSQL and automatically runs migrations. See the [architecture](docs/architecture.md), [security model](docs/security.md), and [demo guide](docs/demo.md) for details.

## Development and checks

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm run build:agent` builds the Go agent; `npm run test:agent` runs its tests (Go required). See [package.json](package.json) for other scripts.

## Contributing and support

Report bugs or suggest features through [GitHub Issues](https://github.com/sondoan17/vps-manager-nodejs/issues). For pull requests, describe the change, how you verified it, and any security implications. Run `npm run typecheck`, `npm test`, and `npm run build` before submitting. Never include SSH keys, passwords, tokens, or `.env` files in issues or commits. Check the license status above before reusing or distributing the source code.
