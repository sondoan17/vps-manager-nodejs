# vps-manager-nodejs

TypeScript Express backend and Vite React frontend for a local VPS manager, organized as an npm workspaces monorepo.

## Monorepo layout

- `packages/api/` - Express API source and backend tests.
- `packages/web/` - Vite React dashboard source, Tailwind config, and frontend tests.
- `public/` - production web build output served by Express from `process.cwd()/public`.
- `dist/` - compiled API output. `npm start` runs `node dist/server.js`.
- `data/` - local VPS metadata storage.
- `private/` - local SSH key material, gitignored when created.

## Web UI

The dashboard is a Vite React TypeScript app in `packages/web/`, styled with local shadcn/ui-style primitives and Tailwind tokens. `npm run build:web` writes the compiled app to root `public/`, and Express serves only that built output.

Development workflow:

1. Run `npm run dev` for the Express API on `http://localhost:3000`.
2. In another terminal, run `npm run dev:web` for Vite. Vite proxies `/api` to the API server.
3. Run `npm run build` before production; this builds the React dashboard to `public/` and then compiles the API to `dist/`.

The UI lets you:

- add a VPS with name, host, port, username, and an optional one-time password
- automatically provision the SSH public key immediately when a password is supplied during creation
- provision a key later from the VPS list by entering the password again
- verify SSH key access without showing key material
- delete VPS entries

The frontend is served only from `public/`. Express does not serve `packages/web/`, `packages/api/`, `private/`, or `data/`. Passwords are only sent to `POST /api/vps/:id/provision-key` and are never stored in localStorage, sessionStorage, IndexedDB, cookies, public assets, or backend data files. Public/private key contents are not displayed by the dashboard.

## Scripts

- `npm run dev` - run API workspace with `tsx watch`
- `npm run dev:web` - run web workspace Vite dashboard with `/api` proxy
- `npm run build:web` - build React dashboard into `public/`
- `npm run build:api` - compile TypeScript API to `dist/`
- `npm run build` - build web, then API
- `npm start` - run compiled server
- `npm test` - run backend and frontend Vitest tests from the root config
- `npm run typecheck` - TypeScript type check API and web workspaces

## API

- `GET /api/health`
- `GET /api/vps`
- `POST /api/vps`
- `GET /api/vps/:id`
- `PATCH /api/vps/:id`
- `DELETE /api/vps/:id`
- `POST /api/vps/:id/provision-key` with `{ "password": "..." }`
- `POST /api/vps/:id/verify-key`

VPS metadata is stored in `data/vps.json`. Passwords are accepted only for provisioning and are never persisted or returned. SSH key material is stored under `private/keys/`, which is gitignored, and is not returned by the API.
