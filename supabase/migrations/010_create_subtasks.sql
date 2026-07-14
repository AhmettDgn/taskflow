-- ============================================================
-- subtasks: görev içi küçük alt görevler (checklist)
-- Tüm alt görevler tamamlanınca üst görev client tarafından
-- otomatik 'done' durumuna taşınır.
-- ============================================================

create table if not exists public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  title      text not null,
  is_done    boolean not null default false,
  position   integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists subtasks_task_id_position_idx
  on public.subtasks (task_id, position);

alter table public.subtasks enable row level security;

-- Görevin ekibine üye olan herkes okuyup yönetebilir (görevlerle aynı erişim modeli).
drop policy if exists "subtasks_select" on public.subtasks;
create policy "subtasks_select" on public.subtasks
  for select using (
    exists (
      select 1
      from public.tasks t
      where t.id = subtasks.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );

drop policy if exists "subtasks_insert" on public.subtasks;
create policy "subtasks_insert" on public.subtasks
  for insert with check (
    exists (
      select 1
      from public.tasks t
      where t.id = subtasks.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );

drop policy if exists "subtasks_update" on public.subtasks;
create policy "subtasks_update" on public.subtasks
  for update using (
    exists (
      select 1
      from public.tasks t
      where t.id = subtasks.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );

drop policy if exists "subtasks_delete" on public.subtasks;
create policy "subtasks_delete" on public.subtasks
  for delete using (
    exists (
      select 1
      from public.tasks t
      where t.id = subtasks.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );
