-- Dynamic task status columns per team.

create table if not exists public.task_statuses (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  value      text not null,
  label      text not null,
  color      text not null default 'slate',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, value)
);

create index if not exists task_statuses_team_id_position_idx
  on public.task_statuses (team_id, position);

alter table public.task_statuses enable row level security;

drop policy if exists "task_statuses_select" on public.task_statuses;
create policy "task_statuses_select" on public.task_statuses
  for select using (public.is_team_member(task_statuses.team_id, auth.uid()));

drop policy if exists "task_statuses_insert" on public.task_statuses;
create policy "task_statuses_insert" on public.task_statuses
  for insert with check (public.is_team_member(task_statuses.team_id, auth.uid()));

drop policy if exists "task_statuses_update" on public.task_statuses;
create policy "task_statuses_update" on public.task_statuses
  for update using (public.is_team_member(task_statuses.team_id, auth.uid()));

drop policy if exists "task_statuses_delete" on public.task_statuses;
create policy "task_statuses_delete" on public.task_statuses
  for delete using (public.is_team_member(task_statuses.team_id, auth.uid()));

alter table public.tasks drop constraint if exists tasks_status_check;

insert into public.task_statuses (team_id, value, label, color, position)
select teams.id, defaults.value, defaults.label, defaults.color, defaults.position
from public.teams
cross join (
  values
    ('todo', 'To Do', 'slate', 0),
    ('in_progress', 'In Progress', 'blue', 1),
    ('done', 'Done', 'emerald', 2),
    ('on_hold', 'On Hold', 'amber', 3)
) as defaults(value, label, color, position)
on conflict (team_id, value) do nothing;

create or replace function public.create_default_task_statuses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_statuses (team_id, value, label, color, position)
  values
    (new.id, 'todo', 'To Do', 'slate', 0),
    (new.id, 'in_progress', 'In Progress', 'blue', 1),
    (new.id, 'done', 'Done', 'emerald', 2),
    (new.id, 'on_hold', 'On Hold', 'amber', 3)
  on conflict (team_id, value) do nothing;

  return new;
end;
$$;

drop trigger if exists on_team_create_default_task_statuses on public.teams;
create trigger on_team_create_default_task_statuses
  after insert on public.teams
  for each row execute function public.create_default_task_statuses();
