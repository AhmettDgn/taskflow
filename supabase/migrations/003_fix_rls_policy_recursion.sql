-- ============================================================
-- fix recursive RLS policies on team_members and dependent tables
-- ============================================================

create or replace function public.is_team_member(
  p_team_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$;

create or replace function public.is_team_admin(
  p_team_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = p_user_id and role = 'admin'
  );
$$;

drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members
  for select using (public.is_team_member(team_members.team_id, auth.uid()));

drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members
  for insert with check (
    public.is_team_admin(team_members.team_id, auth.uid())
    or auth.uid() = user_id
  );

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members
  for delete using (public.is_team_admin(team_members.team_id, auth.uid()));

drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams
  for select using (public.is_team_member(teams.id, auth.uid()));

drop policy if exists "teams_update" on public.teams;
create policy "teams_update" on public.teams
  for update using (public.is_team_admin(teams.id, auth.uid()));

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (public.is_team_member(tasks.team_id, auth.uid()));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (public.is_team_member(tasks.team_id, auth.uid()));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    auth.uid() = created_by or
    public.is_team_admin(tasks.team_id, auth.uid())
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    auth.uid() = created_by or
    public.is_team_admin(tasks.team_id, auth.uid())
  );

drop policy if exists "task_assignees_select" on public.task_assignees;
create policy "task_assignees_select" on public.task_assignees
  for select using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );

drop policy if exists "task_assignees_insert" on public.task_assignees;
create policy "task_assignees_insert" on public.task_assignees
  for insert with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );

drop policy if exists "task_assignees_delete" on public.task_assignees;
create policy "task_assignees_delete" on public.task_assignees
  for delete using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_team_admin(t.team_id, auth.uid())
    )
  );

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (
    exists (
      select 1
      from public.tasks t
      where t.id = comments.task_id
        and public.is_team_member(t.team_id, auth.uid())
    )
  );
