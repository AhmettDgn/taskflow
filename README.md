# TaskFlow

TaskFlow is a Notion-like task management app for small teams. The repo now uses a `pnpm` workspace with:

- `frontend`: Next.js 14 app
- `backend`: lightweight Node.js service used for production topology and health checks

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase
- TanStack Query
- Zustand

## Workspace Commands

```bash
pnpm install
pnpm dev --turbo
pnpm --filter frontend build
pnpm --filter backend build
pnpm --filter frontend start
pnpm --filter backend start
```

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure frontend env

```bash
cp frontend.env.example frontend/.env.local
```

Fill `frontend/.env.local` with your values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3021
NEXT_PUBLIC_API_BASE_PATH=/api
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=3021
```

### 3. Start the dev environment

```bash
pnpm dev --turbo
```

This starts:

- frontend at `http://127.0.0.1:3021`
- backend health endpoint at `http://127.0.0.1:5021/health`

You can also run packages separately:

```bash
pnpm --filter frontend dev -- --hostname 127.0.0.1 --port 3021 --turbo
pnpm --filter backend dev
```

## Production Notes

- Public traffic is expected to come through Nginx.
- Frontend should stay behind `127.0.0.1:3021`.
- Backend should stay behind `127.0.0.1:5021`.
- Production process names are `taskflow-frontend` and `taskflow-backend`.

## Project Layout

```text
frontend/   Next.js application
backend/    Node.js backend service
deploy/     PM2 runner scripts
etc/        Nginx config templates
supabase/   SQL migrations
```
