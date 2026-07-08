# CI/CD

This repository uses GitHub Actions for verification, Docker image publishing, and optional SSH deployment.

## Workflow

Workflow file: `.github/workflows/ci.yml`

### Pull requests

Every pull request runs:

1. `npm ci`
2. `npm test`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:agent`
6. Docker build checks for both runtime targets:
   - API image target: `api-runtime`
   - Web image target: `web-runtime`

### Pushes to `main`

Pushes to `main` run the same verification steps, then publish two Docker images to GHCR:

- API:
  - `ghcr.io/sondoan17/vps-manager-nodejs-api:<commit-sha>`
  - `ghcr.io/sondoan17/vps-manager-nodejs-api:latest`
- Web:
  - `ghcr.io/sondoan17/vps-manager-nodejs-web:<commit-sha>`
  - `ghcr.io/sondoan17/vps-manager-nodejs-web:latest`

After publishing, the workflow can deploy over SSH if deployment secrets are configured.

## Runtime topology

The production deployment runs three containers:

- `postgres`: TimescaleDB/PostgreSQL database on the internal Docker network; stores data in a Docker volume.
- `api`: NestJS API on internal port `3000`; stores data in Docker volumes.
- `web`: Nginx static web server on host port `3000`; proxies `/api/*` to `api:3000` and serves the SPA fallback.

The production docker-compose binds the web container to `127.0.0.1:3000` so it listens only on the loopback interface. An external HTTPS reverse proxy (nginx, Caddy, Cloudflare Tunnel) must terminate TLS and forward to `http://127.0.0.1:3000`. The API health endpoint is reachable through the web proxy at `/api/health`.

## Required secrets for deployment

Set these in GitHub repository settings:

`Settings` → `Secrets and variables` → `Actions` → `Repository secrets`

| Secret                     | Required | Description                                                                                                                                                                                       |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VPS_HOST`                 | Yes      | Server IP or hostname.                                                                                                                                                                            |
| `VPS_USER`                 | Yes      | SSH user, for example `root`.                                                                                                                                                                     |
| `VPS_SSH_KEY`              | Yes      | Private SSH key with access to the server.                                                                                                                                                        |
| `DASHBOARD_SESSION_SECRET` | Yes      | Secret for dashboard session token hashing. Required when `APP_MODE=local`.                                                                                                                       |
| `POSTGRES_PASSWORD`        | Yes      | Password for the `vps_manager` PostgreSQL user. Used on first DB volume initialization and by the API `DATABASE_URL`.                                                                             |
| `DASHBOARD_ADMIN_PASSWORD` | No       | Plaintext dashboard admin password. If set, the deploy step pipes it to `set-dashboard-password.js --stdin --skip-if-same` after migrations. If unset, the password must be set manually via SSH. |
| `VPS_KNOWN_HOSTS`          | No       | Pinned SSH known_hosts entry. If set, written directly to `known_hosts` instead of `ssh-keyscan` (TOFU). Recommended for production.                                                              |
| `VPS_PORT`                 | No       | SSH port. Defaults to `22`.                                                                                                                                                                       |
| `DEPLOY_PATH`              | No       | Remote app directory. Defaults to `/opt/vps-manager-nodejs`.                                                                                                                                      |

If the required SSH secrets are missing, the deploy job exits successfully and prints a skip message.

Optional repository variables can override generated server `.env` values:

| Variable                        | Default   | Description                                                                                 |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `PORT`                          | `3000`    | API listen port inside the container.                                                       |
| `APP_MODE`                      | `local`   | Runtime mode for production deployment.                                                     |
| `ENABLE_WEB_TERMINAL`           | `false`   | Enables web terminal only when explicitly allowed.                                          |
| `ALLOW_PRIVATE_NETWORK_TARGETS` | `false`   | Allows private-network SSH targets from the server.                                         |
| `DATA_DIR`                      | `data`    | API data directory inside `/app`; resolves to `/app/data`.                                  |
| `PRIVATE_DIR`                   | `private` | API private directory inside `/app`; resolves to `/app/private`.                            |
| `RATE_LIMIT_WINDOW_MS`          | `60000`   | Rate limit window.                                                                          |
| `RATE_LIMIT_MAX`                | `120`     | Rate limit max requests per window.                                                         |
| `AGENT_PUBLIC_BASE_URL`         | empty     | Public callback URL for installed agents.                                                   |
| `ALLOW_INSECURE_AGENT_HTTP`     | `false`   | Allows HTTP agent callback URLs when explicitly accepted.                                   |
| `DASHBOARD_SESSION_TTL_SECONDS` | `28800`   | Dashboard session TTL in seconds.                                                           |
| `DASHBOARD_PUBLIC_ORIGIN`       | empty     | Expected Origin header for CSRF protection.                                                 |
| `DASHBOARD_COOKIE_SECURE`       | `true`    | Set HttpOnly cookie Secure flag.                                                            |
| `DASHBOARD_COOKIE_SAME_SITE`    | `lax`     | SameSite cookie attribute.                                                                  |
| `TRUST_PROXY_HOPS`              | `0`       | Number of reverse proxy hops to trust for client IP. Set to `1` when behind an HTTPS proxy. |

## Server requirements

The target server needs:

- Docker
- Docker Compose v2 (`docker compose`)
- SSH access using the configured key
- Access to pull from `ghcr.io` during the deployment workflow

The workflow writes a production `.env` and `docker-compose.yml` into `DEPLOY_PATH`. Secrets from GitHub Actions are written to the server-side `.env` file with `chmod 600`; compose services load it with `env_file`.

Then the workflow runs:

```bash
docker compose pull
docker compose up -d postgres
docker compose run --rm api node dist/db/migrate.js
# Optional and non-fatal:
docker compose run --rm api node dist/db/migrate.js --include-optional || true
docker compose up -d --remove-orphans
docker compose ps
```

After the first deploy (if `DASHBOARD_ADMIN_PASSWORD` was not set), set the dashboard admin password via SSH:

```bash
# Safer: read password from stdin without showing in process list
# (paste or pipe the password when prompted)
printf 'Dashboard password: ' > /dev/tty && read -rs password && printf '%s\n' "$password" | docker compose -f /opt/vps-manager-nodejs/docker-compose.yml run --rm api node dist/scripts/set-dashboard-password.js --stdin && unset password
```

Alternatively, set the `DASHBOARD_ADMIN_PASSWORD` GitHub Secret and redeploy — the CI workflow will bootstrap it automatically.

To rotate the password without downtime, pipe the new password with `--skip-if-same`:

```bash
printf 'New password: ' > /dev/tty && read -rs password && printf '%s\n' "$password" | docker compose -f /opt/vps-manager-nodejs/docker-compose.yml run --rm api node dist/scripts/set-dashboard-password.js --stdin --skip-if-same && unset password
```

The `--skip-if-same` flag avoids unnecessary session revocations when the password hasn't changed (e.g., re-running the deploy CI without changing the secret).

The database password is stored in the server-side `.env` file for this single-host deployment. To rotate it after the `vps-manager-postgres` volume exists, update the DB user password with `ALTER USER`, update the GitHub secret, then redeploy.

## Manual run

The workflow supports `workflow_dispatch`, so it can be run manually from the GitHub Actions tab.
