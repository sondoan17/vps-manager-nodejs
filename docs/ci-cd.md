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

The public entrypoint is the web container at `http://<server>:3000`. API health is still available through the web proxy at `/api/health`.

## Required secrets for deployment

Set these in GitHub repository settings:

`Settings` → `Secrets and variables` → `Actions` → `Repository secrets`

| Secret | Required | Description |
| --- | --- | --- |
| `VPS_HOST` | Yes | Server IP or hostname. |
| `VPS_USER` | Yes | SSH user, for example `root`. |
| `VPS_SSH_KEY` | Yes | Private SSH key with access to the server. |
| `LOCAL_AUTH_TOKEN` | Yes | Token required when `APP_MODE=local`. |
| `POSTGRES_PASSWORD` | Yes | Password for the `vps_manager` PostgreSQL user. Used on first DB volume initialization and by the API `DATABASE_URL`. |
| `VPS_PORT` | No | SSH port. Defaults to `22`. |
| `DEPLOY_PATH` | No | Remote app directory. Defaults to `/opt/vps-manager-nodejs`. |

If the required SSH secrets are missing, the deploy job exits successfully and prints a skip message.

## Server requirements

The target server needs:

- Docker
- Docker Compose v2 (`docker compose`)
- SSH access using the configured key
- Access to pull from `ghcr.io` during the deployment workflow

The workflow writes a production `docker-compose.yml` into `DEPLOY_PATH` and runs:

```bash
docker compose pull
docker compose up -d postgres
docker compose run --rm api node dist/db/migrate.js
# Optional and non-fatal:
docker compose run --rm api node dist/db/migrate.js --include-optional || true
docker compose up -d --remove-orphans
docker compose ps
```

The database password is written into the server-side compose environment for this single-host deployment. To rotate it after the `vps-manager-postgres` volume exists, update the DB user password with `ALTER USER`, update the GitHub secret, then redeploy.

## Manual run

The workflow supports `workflow_dispatch`, so it can be run manually from the GitHub Actions tab.
