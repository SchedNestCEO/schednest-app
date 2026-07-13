-- SchedNest Student import foundation
-- Stores uploaded syllabi and future LMS/portal import jobs.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('student-imports', 'student-imports', false)
on conflict (id) do nothing;

create table if not exists public.student_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'syllabus'
    check (source_type in ('syllabus', 'calendar', 'canvas', 'blackboard', 'moodle', 'brightspace', 'google_classroom', 'other')),
  source_name text,
  file_name text,
  file_path text,
  mime_type text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'queued', 'processing', 'needs_review', 'completed', 'failed')),
  raw_text text,
  error_message text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.student_imports(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null
    check (item_type in ('course', 'assignment', 'exam', 'class_session', 'study_session', 'announcement', 'other')),
  title text not null,
  description text,
  starts_at timestamptz,
  due_at timestamptz,
  confidence numeric(5,4),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'ignored', 'imported')),
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_imports_owner_created_idx
  on public.student_imports(owner_id, created_at desc);

create index if not exists student_import_items_import_idx
  on public.student_import_items(import_id);

alter table public.student_imports enable row level security;
alter table public.student_import_items enable row level security;

drop policy if exists "student_imports_owner_all" on public.student_imports;
create policy "student_imports_owner_all"
on public.student_imports
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_import_items_owner_all" on public.student_import_items;
create policy "student_import_items_owner_all"
on public.student_import_items
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "student_import_files_owner_insert" on storage.objects;
create policy "student_import_files_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-imports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "student_import_files_owner_select" on storage.objects;
create policy "student_import_files_owner_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-imports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "student_import_files_owner_delete" on storage.objects;
create policy "student_import_files_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-imports'
  and (storage.foldername(name))[1] = auth.uid()::text
);
