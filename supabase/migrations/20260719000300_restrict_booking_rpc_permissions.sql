begin;

revoke execute on function public.approve_booking_request(
  uuid,
  text
) from anon;

revoke execute on function public.create_manual_booking(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text
) from anon;

grant execute on function public.approve_booking_request(
  uuid,
  text
) to authenticated, service_role;

grant execute on function public.create_manual_booking(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text
) to authenticated, service_role;

commit;
