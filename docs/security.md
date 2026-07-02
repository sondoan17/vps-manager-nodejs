# Security Model

## Runtime Modes

- `APP_MODE=demo`: public portfolio mode. Seeds simulated servers, metrics, jobs, audit events, and terminal output. Real SSH and real terminal network access are disabled.
- `APP_MODE=local`: self-hosted local mode. Dashboard access requires an HttpOnly session cookie obtained by logging in with the DB-backed admin password (set via `npm run set-dashboard-password`). Real SSH remains behind host policy and explicit configuration.

Invalid modes fail during config parsing. `ENABLE_WEB_TERMINAL=true` is rejected unless `APP_MODE=local`.

## SSH Safety

Demo mode throws before any real SSH provider call. Host policy blocks metadata/link-local targets, localhost, and private-network targets unless local mode explicitly allows private targets.

The demo terminal is read-only canned output. It has no command input, no socket, no transcript persistence, and no path to `ssh2`.

## Secrets

Passwords are accepted only in provision-key request bodies. They are never stored in `localStorage`, `sessionStorage`, IndexedDB, cookies, public assets, backend JSON files, logs, or API responses.

Private keys remain under `private/keys/`. Public/private key material is not displayed by the dashboard and is not returned by API responses.

## HTTP Safety

The backend disables `x-powered-by`, adds request IDs, applies Helmet headers, rate-limits mutations, normalizes errors, and redacts secret-looking metadata before audit persistence.

Static serving is limited to root `public/`; `data/`, `private/`, `packages/api/`, and `packages/web/` are not exposed.
