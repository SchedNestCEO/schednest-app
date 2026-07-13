-- SchedNest Platform v1: Universal Files

insert into storage.buckets (id, name, public)
values ('platform-files', 'platform-files', false)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.platform_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product text not null
    check (product in ('platform', 'student', 'teams', 'med', 'business', 'life')),
  folder text not null default '/',
  storage_bucket text not null default 'platform-files',
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  sensitivity text not null default 'standard'
    check (sensitivity in ('standard', 'personal', 'sensitive', 'restricted')),
  sharing_scope text not null default 'private'
    check (sharing_scope in ('private', 'approved_people', 'workspace')),
  status text not null default 'active'
    check (status in ('active', 'archived', 'deleted')),
  version integer not null default 1,
  parent_file_id uuid references public.platform_files(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, storage_path)
);

create table if not exists public.platform_file_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.platform_files(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  shared_with_email text,
  permission text not null default 'view'
    check (permission in ('view', 'comment', 'edit')),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_files_owner_product_idx
  on public.platform_files(owner_id, product, status, created_at desc);

create index if not exists platform_files_parent_idx
  on public.platform_files(parent_file_id);

create index if not exists platform_file_shares_file_idx
  on public.platform_file_shares(file_id, status);

alter table public.platform_files enable row level security;
alter table public.platform_file_shares enable row level security;

drop policy if exists "platform_files_owner_all" on public.platform_files;
create policy "platform_files_owner_all"
on public.platform_files
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_file_shares_owner_all"
on public.platform_file_shares;
create policy "platform_file_shares_owner_all"
on public.platform_file_shares
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "platform_files_storage_select" on storage.objects;
create policy "platform_files_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'platform-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "platform_files_storage_insert" on storage.objects;
create policy "platform_files_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'platform-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "platform_files_storage_update" on storage.objects;
create policy "platform_files_storage_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'platform-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'platform-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "platform_files_storage_delete" on storage.objects;
create policy "platform_files_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'platform-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
