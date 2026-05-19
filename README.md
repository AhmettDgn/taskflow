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

- Public traffic comes through Nginx on port `3006`.
- Frontend stays bound to `127.0.0.1:3021`.
- Backend stays bound to `127.0.0.1:5021`.
- Frontend talks to the API through relative `/api` paths.
- PM2 process names stay fixed as `taskflow-frontend` and `taskflow-backend`.

## Automated Deploy

Pushes to `main` can deploy automatically through GitHub Actions once the repository secrets are configured.

Required GitHub repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PORT`
- `DEPLOY_PATH`
- `DEPLOY_SSH_PRIVATE_KEY`

Recommended defaults for this project:

- `DEPLOY_USER=yusuf`
- `DEPLOY_PORT=22`
- `DEPLOY_PATH=~/projects/taskflow`

Workflow behavior:

- `verify` runs on GitHub Actions with `pnpm install --frozen-lockfile`, `pnpm test:unit`, `pnpm test:integration`, and `pnpm build`.
- `deploy` connects over SSH and runs `deploy/scripts/deploy-on-server.sh` on the server.
- The server only reloads PM2 after `pnpm test:predeploy` and `pnpm build` succeed.
- The server-side release gate runs on isolated ports `3121` and `5121`, so it validates the freshly pulled code without disturbing the live PM2 processes on `3021` and `5021`.
- If PM2 reload succeeds but the post-deploy health checks fail, the script rolls back to the previous Git commit automatically.
- Server scripts prefer `corepack pnpm`, but fall back to plain `pnpm` automatically when `corepack` is unavailable.

Server prerequisites for automated deploy:

- `git`
- `bash`
- `nvm`
- Node `24`
- `corepack` / `pnpm`
- `pm2`
- `curl`
- root-level `frontend.env` and `backend.env`

The production release gate remains `pnpm test:predeploy`, and it is intentionally enforced on the server before PM2 reload.
