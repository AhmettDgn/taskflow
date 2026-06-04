# TaskFlow

TaskFlow is a small-team task management app organized as a `pnpm` monorepo.

## Workspace Layout

- `frontend`: Next.js 14 application
- `backend`: Node.js health and production proxy service
- `deploy`: PM2 runner scripts
- `etc`: Nginx config templates
- `scripts`: root workspace orchestration
- `supabase`: SQL migrations and Supabase artifacts

## Workspace Commands

```bash
pnpm install
pnpm dev --turbo
pnpm dev:localhost --turbo
pnpm build
pnpm build:frontend
pnpm build:backend
pnpm start:frontend
pnpm start:backend
pnpm --filter frontend build
pnpm --filter backend build
pnpm --filter frontend start -- --hostname 127.0.0.1 --port 3021
pnpm --filter backend start
pnpm test:unit
pnpm test:integration
pnpm test:smoke
pnpm test:functional
pnpm test:predeploy
```

Detailed test notes live in [docs/testing.md](docs/testing.md).

## Environment Files

Local frontend development uses `frontend/.env.local`.

```bash
cp frontend.env.example frontend/.env.local
```

Fill `frontend/.env.local` with your local values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3021
NEXT_PUBLIC_API_BASE_PATH=/api
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=3021
```

For OAuth flows, `NEXT_PUBLIC_APP_URL` is treated as the canonical callback origin when it is set. If you point it at `https://taskflow.arslanyusuf.com`, Google sign-in and password reset flows will return to that public domain even when you trigger them from `localhost`.

Production runners load root-level env files:

- `frontend.env`
- `backend.env`

Use the provided `frontend.env.example` and `backend.env.example` as templates.

## Development Flow

```bash
pnpm dev --turbo
```

This starts:

- frontend at `http://127.0.0.1:3021`
- backend health endpoint at `http://127.0.0.1:5021/health`

If those ports are already occupied on your machine, use the localhost fallback:

```bash
pnpm dev:localhost --turbo
```

This starts:

- frontend at `http://localhost:3121`
- backend health endpoint at `http://localhost:5121/health`

You can also run packages separately:

```bash
pnpm --filter frontend dev -- --hostname 127.0.0.1 --port 3021 --turbo
pnpm --filter backend dev
```

If `3021` or `5021` are already occupied on your machine, you can override the dev ports for the current shell:

```powershell
$env:FRONTEND_PORT=3121
$env:BACKEND_PORT=5121
pnpm dev --turbo
```

## Production Topology

- Public traffic comes through Nginx at `https://taskflow.arslanyusuf.com`.
- Frontend stays bound to `127.0.0.1:3021`.
- Backend stays bound to `127.0.0.1:5021`.
- Frontend talks to the API through relative `/api` paths.
- PM2 process names stay fixed as `taskflow-frontend` and `taskflow-backend`.
- Public `3006` can stay enabled temporarily as a transition route, but the primary production URL is the subdomain.

## Automated Deploy

Pushes to `main` can deploy automatically through GitHub Actions once the repository secrets are configured.

Required GitHub repository secrets:

- `REMOTE_HOST` — deploy target host
- `REMOTE_USER` — SSH user (e.g. `yusuf`)
- `SSH_PRIVATE_KEY` — private key used for the SSH deploy
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — used by the CI build and the end-to-end tests (e2e global setup seeds data via the service role key)

`DEPLOY_PORT` (`22`) and `DEPLOY_PATH` (`/home/yusuf/projects/taskflow`) are set as plain env values in the workflow, not secrets.

Workflow behavior (`.github/workflows/ci.yml`):

- `validate` runs on pull requests and pushes to `main`: `pnpm install --frozen-lockfile`, `pnpm --filter frontend lint`, `pnpm --filter frontend test:vitest` (unit + integration), `pnpm build`, then Playwright e2e (`@smoke|@functional`). It caches the pnpm store, Playwright browsers, and Next's `.next/cache`.
- `deploy` runs only on push to `main` and only after `validate` passes; it connects over SSH and runs `deploy/scripts/deploy-on-server.sh`.
- The server no longer runs lint/tests/e2e or installs Playwright. It only runs `pnpm install --frozen-lockfile`, a single `pnpm build`, and `pm2 startOrReload` — the full quality gate already ran in CI before `deploy` was triggered.
- If PM2 reload succeeds but the post-deploy health checks fail, the script rolls back to the previous Git commit automatically.
- Server scripts prefer `corepack pnpm`, but fall back to plain `pnpm` automatically when `corepack` is unavailable.
- The nginx template is intentionally HTTP-first for the subdomain bootstrap; Certbot injects the final `443 ssl` block after the first certificate issuance.

Server prerequisites for automated deploy:

- `git`
- `bash`
- `nvm`
- Node `24`
- `npm`
- `corepack` or `pnpm`
- `pm2` is auto-installed by the deploy scripts when missing
- `curl`
- root-level `frontend.env` and `backend.env`

The quality gate (lint, unit/integration, build, e2e) now runs in GitHub Actions (`validate`) before `deploy` is allowed to run; the server no longer enforces it. `pnpm test:predeploy` is still available for running the full gate locally.
