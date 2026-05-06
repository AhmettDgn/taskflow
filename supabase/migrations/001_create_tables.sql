-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- teams
-- ============================================================
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references public.profiles(id),
  invite_code text unique default encode(gen_random_bytes(6), 'base64'),
  created_at  timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "teams_select" on public.teams
  for select using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id and user_id = auth.uid()
    )
  );

create policy "teams_insert" on public.teams
  for insert with check (auth.uid() = created_by);

create policy "teams_update" on public.teams
  for update using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- team_members
-- ============================================================
create table public.team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references public.profiles(id),
  role      text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

alter table public.team_members enable row level security;

create policy "team_members_select" on public.team_members
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
    )
  );

create policy "team_members_insert" on public.team_members
  for insert with check (
    exists (
      select 1 from public.team_members
      where team_id = team_members.team_id and user_id = auth.uid() and role = 'admin'
    )
    or auth.uid() = user_id  -- allow self-join via invite code
  );

create policy "team_members_delete" on public.team_members
  for delete using (
    exists (
      select 1 from public.team_members
      where team_id = team_members.team_id and user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- tasks
-- ============================================================
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'done', 'on_hold')),
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high')),
  due_date    timestamptz,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks
  for select using (
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid()
    )
  );

create policy "tasks_insert" on public.tasks
  for insert with check (
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid()
    )
  );

create policy "tasks_update" on public.tasks
  for update using (
    auth.uid() = created_by or
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid() and role = 'admin'
    )
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- task_assignees
-- ============================================================
create table public.task_assignees (
  id      uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  unique (task_id, user_id)
);

alter table public.task_assignees enable row level security;

create policy "task_assignees_select" on public.task_assignees
  for select using (
    exists (
      select 1 from public.tasks t
      join public.team_members tm on tm.team_id = t.team_id
      where t.id = task_assignees.task_id and tm.user_id = auth.uid()
    )
  );

create policy "task_assignees_insert" on public.task_assignees
  for insert with check (
    exists (
      select 1 from public.tasks t
      join public.team_members tm on tm.team_id = t.team_id
      where t.id = task_assignees.task_id and tm.user_id = auth.uid()
    )
  );

create policy "task_assignees_delete" on public.task_assignees
  for delete using (
    exists (
      select 1 from public.tasks t
      join public.team_members tm on tm.team_id = t.team_id
      where t.id = task_assignees.task_id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

-- ============================================================
-- comments
-- ============================================================
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1 from public.tasks t
      join public.team_members tm on tm.team_id = t.team_id
      where t.id = comments.task_id and tm.user_id = auth.uid()
    )
  );

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "comments_update" on public.comments
  for update using (auth.uid() = user_id);

create policy "comments_delete" on public.comments
  for delete using (auth.uid() = user_id);

-- ============================================================
-- notifications
-- ============================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  content    text,
  task_id    uuid references public.tasks(id) on delete cascade,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);
