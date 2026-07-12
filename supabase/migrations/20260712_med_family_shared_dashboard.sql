-- Expand caregiver read access for shared Med dashboards.

drop policy if exists "med_profiles_caregiver_select" on public.med_profiles;
create policy "med_profiles_caregiver_select"
on public.med_profiles
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.med_caregiver_access access
    where access.owner_id = med_profiles.owner_id
      and access.status = 'accepted'
      and (
        access.caregiver_user_id = auth.uid()
        or lower(access.caregiver_email) =
          lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
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
