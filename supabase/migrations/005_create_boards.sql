-- ============================================================
-- boards (shared resource panels within a team) + board_items
-- ============================================================

create table if not exists public.boards (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  name       text not null,
  position   integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_team_id_idx on public.boards (team_id);

alter table public.boards enable row level security;

create table if not exists public.board_items (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  type       text not null check (type in ('link', 'password', 'note')),
  label      text,
  value      text not null,
  position   integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_items_board_id_idx on public.board_items (board_id);

alter table public.board_items enable row level security;

-- ============================================================
-- RLS: boards — members read, admins manage
-- ============================================================
drop policy if exists "boards_select" on public.boards;
create policy "boards_select" on public.boards
  for select using (public.is_team_member(boards.team_id, auth.uid()));

drop policy if exists "boards_insert" on public.boards;
create policy "boards_insert" on public.boards
  for insert with check (public.is_team_admin(boards.team_id, auth.uid()));

drop policy if exists "boards_update" on public.boards;
create policy "boards_update" on public.boards
  for update using (public.is_team_admin(boards.team_id, auth.uid()));

drop policy if exists "boards_delete" on public.boards;
create policy "boards_delete" on public.boards
  for delete using (public.is_team_admin(boards.team_id, auth.uid()));

-- ============================================================
-- RLS: board_items — any team member can read and manage content
-- ============================================================
drop policy if exists "board_items_select" on public.board_items;
create policy "board_items_select" on public.board_items
  for select using (
    exists (
      select 1
      from public.boards b
      where b.id = board_items.board_id
        and public.is_team_member(b.team_id, auth.uid())
    )
  );

drop policy if exists "board_items_insert" on public.board_items;
create policy "board_items_insert" on public.board_items
  for insert with check (
    exists (
      select 1
      from public.boards b
      where b.id = board_items.board_id
        and public.is_team_member(b.team_id, auth.uid())
    )
  );

drop policy if exists "board_items_update" on public.board_items;
create policy "board_items_update" on public.board_items
  for update using (
    exists (
      select 1
      from public.boards b
      where b.id = board_items.board_id
        and public.is_team_member(b.team_id, auth.uid())
    )
  );

drop policy if exists "board_items_delete" on public.board_items;
create policy "board_items_delete" on public.board_items
  for delete using (
    exists (
      select 1
      from public.boards b
      where b.id = board_items.board_id
        and public.is_team_member(b.team_id, auth.uid())
    )
  );

-- ============================================================
-- updated_at triggers (reuse public.handle_updated_at)
-- ============================================================
drop trigger if exists boards_updated_at on public.boards;
create trigger boards_updated_at
  before update on public.boards
  for each row execute function public.handle_updated_at();

drop trigger if exists board_items_updated_at on public.board_items;
create trigger board_items_updated_at
  before update on public.board_items
  for each row execute function public.handle_updated_at();
