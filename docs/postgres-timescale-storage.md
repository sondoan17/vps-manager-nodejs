# PostgreSQL/TimescaleDB Storage

The production storage target is PostgreSQL-compatible storage with optional TimescaleDB optimization for metrics.

## Modes

```env
STORAGE_DRIVER=json
```

JSON remains the default for local/demo development.

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://vps_manager:change_me@localhost:5432/vps_manager
DB_POOL_MAX=10
DB_SSL=false
```

`DATABASE_URL` is required when `STORAGE_DRIVER=postgres`.

## Docker Compose example

```yaml
services:
  postgres:
    image: timescale/timescaledb:2.17.2-pg16
    environment:
      POSTGRES_DB: vps_manager
      POSTGRES_USER: vps_manager
      POSTGRES_PASSWORD: change_me
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Plain PostgreSQL also works. TimescaleDB is optional.

The root `docker-compose.yml` runs the API in Postgres mode. Set `POSTGRES_PASSWORD` in `.env` or your shell before starting it.

Before the API starts, the Compose stack automatically runs a one-shot `migrate` service that applies core (non-optional) database migrations. The API waits for this service to complete successfully via `depends_on: migrate: service_completed_successfully`. Optional TimescaleDB migration remains manual or handled by production CI/CD.

## Migrations

The migration command loads the project `.env`, the same as the API server. You can also pass env vars inline.

Run core migrations:

```bash
STORAGE_DRIVER=postgres DATABASE_URL=postgres://... npm run migrate:db
```

Run optional Timescale migration only when the DB user has extension privileges:

```bash
STORAGE_DRIVER=postgres DATABASE_URL=postgres://... npm run migrate:db -- --include-optional
```

The optional migration runs:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('metric_samples', 'effective_at', if_not_exists => TRUE);
```

If extension creation is not allowed for the app user, `--include-optional` will fail and the optional migration will not be recorded. Core migrations remain separate and can run without Timescale privileges. Ask a database administrator to run equivalent SQL or continue on plain PostgreSQL.

Production CI/CD runs core migrations before updating the API/web services. It then attempts the optional Timescale migration and continues if that optional step is unavailable, so plain PostgreSQL remains supported.

`metric_samples.id` is intentionally not a standalone primary key so the table can be converted to a Timescale hypertable partitioned by `effective_at`. Metric dedupe uses `(vps_id, collected_at, effective_at)`.

`metric_latest.sample_id` is best-effort metadata, not a foreign key. It may become stale if future retention policies remove old samples; `metric_latest` stores a full copy of the latest values.

## Password and rotation notes

- `POSTGRES_PASSWORD` is used by the Postgres container only during first initialization of the data volume.
- Changing the GitHub secret later does not automatically rotate the existing database user's password.
- To rotate it, run `ALTER USER vps_manager WITH PASSWORD 'new_password';`, update the GitHub secret, then redeploy in a controlled window.
- Production CI/CD writes `POSTGRES_PASSWORD`, `DASHBOARD_SESSION_SECRET`, app config variables, and the resolved `DATABASE_URL` into `/opt/vps-manager-nodejs/.env` with restrictive file permissions. `docker-compose.yml` uses `env_file` instead of inline secrets. Non-secret app config values can be overridden with GitHub Actions repository variables documented in `docs/ci-cd.md`.
- Keep `POSTGRES_PASSWORD` URL-safe while the app uses a single `DATABASE_URL` connection string. The generated password for this environment uses only URL-safe characters.

## Notes

- Raw agent tokens must never be stored in PostgreSQL.
- Audit metadata is redacted by the repository/service path before persistence.
- `metric_samples.effective_at` is `receivedAt ?? collectedAt` and is used for latest freshness.
- Redis is planned later for realtime fanout/cache; it is not part of this storage migration phase.
