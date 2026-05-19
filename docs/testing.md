# Testing

## Commands

Run from the repository root:

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:smoke
pnpm test:functional
pnpm test:regression
pnpm test:predeploy
```

`pnpm test:predeploy` is the release gate for the LCP update.

## Required environment

The Playwright global setup reads frontend env values from `frontend/.env.local` when present.

Required for authenticated E2E seeding:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional overrides for the seeded E2E account:

```bash
E2E_TEST_EMAIL=taskflow.e2e@example.com
E2E_TEST_PASSWORD=TaskflowE2E123!
E2E_TEST_FULL_NAME=TaskFlow E2E
E2E_BASE_URL=http://127.0.0.1:3021
```

## What the suite covers

- Unit tests:
  - auth redirect helpers
  - dashboard data helpers
  - notification lazy-loading helper
  - UI store behavior
  - login validation
- Integration tests:
  - login submit flow with mocked Supabase
  - lazy command palette keyboard activation
  - notification bell query enablement
  - dashboard server-first data loading
  - team header data loading
- Browser tests:
  - smoke coverage for `/login`, `/dashboard`, `/teams/[teamId]/board`, `/health`
  - functional coverage for login, root redirects, command palette, notifications, logout
  - dashboard shell route sweep for `/teams`, `/teams/create`, `/teams/join`, `/tasks`, `/notifications`, `/profile` and key team sub-pages

## Current release status

- `pnpm test:predeploy` currently passes.
- The suite validates the LCP-related changes before release by combining:
  - 28 unit/integration assertions
  - 11 Playwright smoke/functional checks
- Residual note:
  - During Playwright production runs, Next.js still emits repeated `Element type is invalid ... digest: 3571718725` logs.
  - The covered routes still render successfully and the release gate remains green, but the log source should be investigated in a follow-up.
