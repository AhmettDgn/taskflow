-- ============================================================
-- updated_at auto-update for tasks
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- ============================================================
-- auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- notification on task assignment
-- ============================================================
create or replace function public.handle_task_assigned()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, type, content, task_id)
  values (
    new.user_id,
    'task_assigned',
    'Bir göreve atandınız',
    new.task_id
  );
  return new;
end;
$$;

drop trigger if exists on_task_assigned on public.task_assignees;
create trigger on_task_assigned
  after insert on public.task_assignees
  for each row execute function public.handle_task_assigned();

-- ============================================================
-- notification on task status change
-- ============================================================
create or replace function public.handle_task_status_changed()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.notifications (user_id, type, content, task_id)
    select
      ta.user_id,
      'status_changed',
      'Görev durumu değişti: ' || new.status,
      new.id
    from public.task_assignees ta
    where ta.task_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_task_status_changed on public.tasks;
create trigger on_task_status_changed
  after update on public.tasks
  for each row execute function public.handle_task_status_changed();

-- ============================================================
-- notification on comment added
-- ============================================================
create or replace function public.handle_comment_added()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, type, content, task_id)
  select
    ta.user_id,
    'comment_added',
    'Görevinize yeni bir yorum eklendi',
    new.task_id
  from public.task_assignees ta
  where ta.task_id = new.task_id
    and ta.user_id != new.user_id;
  return new;
end;
$$;

drop trigger if exists on_comment_added on public.comments;
create trigger on_comment_added
  after insert on public.comments
  for each row execute function public.handle_comment_added();
