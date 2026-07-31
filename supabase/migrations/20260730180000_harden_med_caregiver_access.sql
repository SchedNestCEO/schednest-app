alter table public.med_caregiver_access
  drop constraint if exists med_caregiver_access_status_check;

alter table public.med_caregiver_access
  add constraint med_caregiver_access_status_check
  check (
    status in (
      'pending',
      'accepted',
      'declined',
      'revoked'
    )
  );
