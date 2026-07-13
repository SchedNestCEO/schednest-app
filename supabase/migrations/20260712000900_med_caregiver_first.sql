-- SchedNest Med caregiver-first access model

alter table public.med_caregiver_access
  add column if not exists caregiver_user_id uuid references auth.users(id) on delete set null,
  add column if not exists permissions jsonb not null default '{
    "view_schedule": true,
    "manage_appointments": false,
    "view_medications": true,
    "manage_medications": false,
    "manage_tasks": false,
    "view_documents": false,
    "upload_documents": false,
    "manage_questions": false,
    "receive_reminders": true,
    "manage_caregivers": false
  }'::jsonb,
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

create index if not exists med_caregiver_access_caregiver_user_idx
  on public.med_caregiver_access(caregiver_user_id);

create index if not exists med_caregiver_access_email_idx
  on public.med_caregiver_access(lower(caregiver_email));

create or replace function public.med_has_permission(
  target_owner_id uuid,
  permission_key text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.med_caregiver_access access
    where access.owner_id = target_owner_id
      and access.status = 'accepted'
      and (
        access.caregiver_user_id = auth.uid()
        or lower(access.caregiver_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      and coalesce((access.permissions ->> permission_key)::boolean, false)
  );
$$;

revoke all on function public.med_has_permission(uuid, text) from public;
grant execute on function public.med_has_permission(uuid, text) to authenticated;

drop policy if exists "med_caregiver_access_owner_select" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_owner_insert" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_owner_update" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_owner_delete" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_participant_select" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_owner_insert_v2" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_owner_update_v2" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_owner_delete_v2" on public.med_caregiver_access;
drop policy if exists "med_caregiver_access_accept_invite" on public.med_caregiver_access;

create policy "med_caregiver_access_participant_select"
on public.med_caregiver_access
for select
to authenticated
using (
  owner_id = auth.uid()
  or caregiver_user_id = auth.uid()
  or lower(caregiver_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "med_caregiver_access_owner_insert_v2"
on public.med_caregiver_access
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and invited_by = auth.uid()
);

create policy "med_caregiver_access_owner_update_v2"
on public.med_caregiver_access
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "med_caregiver_access_owner_delete_v2"
on public.med_caregiver_access
for delete
to authenticated
using (owner_id = auth.uid());

create policy "med_caregiver_access_accept_invite"
on public.med_caregiver_access
for update
to authenticated
using (
  status = 'pending'
  and lower(caregiver_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  caregiver_user_id = auth.uid()
  and status in ('accepted', 'declined')
);

-- Caregiver read access
drop policy if exists "med_appointments_caregiver_select" on public.med_appointments;
create policy "med_appointments_caregiver_select"
on public.med_appointments
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'view_schedule')
);

drop policy if exists "med_medications_caregiver_select" on public.med_medications;
create policy "med_medications_caregiver_select"
on public.med_medications
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'view_medications')
);

drop policy if exists "med_tasks_caregiver_select" on public.med_tasks;
create policy "med_tasks_caregiver_select"
on public.med_tasks
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_tasks')
);

drop policy if exists "med_documents_caregiver_select" on public.med_documents;
create policy "med_documents_caregiver_select"
on public.med_documents
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'view_documents')
);

drop policy if exists "med_questions_caregiver_select" on public.med_provider_questions;
create policy "med_questions_caregiver_select"
on public.med_provider_questions
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_questions')
);

-- Caregiver manage access
drop policy if exists "med_appointments_caregiver_update" on public.med_appointments;
create policy "med_appointments_caregiver_update"
on public.med_appointments
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_appointments')
)
with check (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_appointments')
);

drop policy if exists "med_medications_caregiver_update" on public.med_medications;
create policy "med_medications_caregiver_update"
on public.med_medications
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_medications')
)
with check (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_medications')
);

drop policy if exists "med_tasks_caregiver_update" on public.med_tasks;
create policy "med_tasks_caregiver_update"
on public.med_tasks
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_tasks')
)
with check (
  owner_id = auth.uid()
  or public.med_has_permission(owner_id, 'manage_tasks')
);
