-- ============================================================
-- documents (team file library) + team-documents storage bucket
-- Yol deseni: {team_id}/{uuid}-{sanitized-filename}
-- ============================================================

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  name        text not null,
  file_path   text not null unique,
  mime_type   text,
  size_bytes  bigint not null default 0,
  uploaded_by uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index if not exists documents_team_id_idx on public.documents (team_id);

alter table public.documents enable row level security;

-- ============================================================
-- RLS: documents — members read/upload, uploader-or-admin delete
-- ============================================================
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (public.is_team_member(documents.team_id, auth.uid()));

drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents
  for insert with check (
    public.is_team_member(documents.team_id, auth.uid())
    and uploaded_by = auth.uid()
  );

drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents
  for delete using (
    uploaded_by = auth.uid()
    or public.is_team_admin(documents.team_id, auth.uid())
  );

-- ============================================================
-- Storage: private team-documents bucket (20MB limit)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('team-documents', 'team-documents', false, 20971520)
on conflict (id) do nothing;

-- storage.objects RLS — nesne yolunun ilk klasörü team_id'dir;
-- ekip üyeliği is_team_member ile doğrulanır.
drop policy if exists "team_documents_read" on storage.objects;
create policy "team_documents_read" on storage.objects
  for select using (
    bucket_id = 'team-documents'
    and public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists "team_documents_insert" on storage.objects;
create policy "team_documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'team-documents'
    and public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists "team_documents_delete" on storage.objects;
create policy "team_documents_delete" on storage.objects
  for delete using (
    bucket_id = 'team-documents'
    and (
      owner_id = auth.uid()::text
      or public.is_team_admin(((storage.foldername(name))[1])::uuid, auth.uid())
    )
  );
