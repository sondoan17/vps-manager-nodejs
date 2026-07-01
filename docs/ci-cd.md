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
6. Docker image build check

### Pushes to `main`

Pushes to `main` run the same verification steps, then publish Docker images to GHCR:

- `ghcr.io/sondoan17/vps-manager-nodejs:<commit-sha>`
- `ghcr.io/sondoan17/vps-manager-nodejs:latest`

After publishing, the workflow can deploy over SSH if deployment secrets are configured.

## Required secrets for deployment

Set these in GitHub repository settings:

`Settings` → `Secrets and variables` → `Actions` → `Repository secrets`

| Secret | Required | Description |
| --- | --- | --- |
| `VPS_HOST` | Yes | Server IP or hostname. |
| `VPS_USER` | Yes | SSH user, for example `root`. |
| `VPS_SSH_KEY` | Yes | Private SSH key with access to the server. |
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
docker compose up -d --remove-orphans
docker compose ps
```

## Manual run

The workflow supports `workflow_dispatch`, so it can be run manually from the GitHub Actions tab.
