-- ============================================================
-- Telegram setup: single shared bot config + deep-link account linking
-- ============================================================

-- App-wide Telegram bot configuration (single row).
-- Holds the secrets needed to talk to the shared bot. RLS is enabled with NO
-- public policies, so only the service-role (admin client) can read/write it.
create table if not exists public.app_telegram_settings (
  id                    text primary key default 'default' check (id = 'default'),
  bot_token             text,
  bot_username          text,
  webhook_secret        text,
  webhook_registered_at timestamptz,
  updated_at            timestamptz not null default now()
);

alter table public.app_telegram_settings enable row level security;
-- Intentionally no policies: secrets are only accessible via the service-role key.

-- ============================================================
-- profiles: short-lived deep-link tokens for auto account linking
-- ============================================================
alter table public.profiles
  add column if not exists telegram_link_token text,
  add column if not exists telegram_link_token_expires_at timestamptz;

create index if not exists profiles_telegram_link_token_idx
  on public.profiles (telegram_link_token);
