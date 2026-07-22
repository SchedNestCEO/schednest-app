begin;

create or replace function public.create_manual_booking_local(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_local_date date,
  p_local_time time without time zone,
  p_status text default 'confirmed',
  p_source text default 'manual',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_timezone text;
  v_start_time timestamptz;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Not authenticated.';
  end if;

  if p_local_date is null or p_local_time is null then
    raise exception using errcode = '22023', message = 'Booking date and time are required.';
  end if;

  select coalesce(timezone, 'America/Los_Angeles')
  into v_timezone
  from public.business_profiles
  where id = p_business_id
    and owner_id = auth.uid()
  limit 1;

  if not found then
    raise exception using errcode = '42501', message = 'Business not found or access denied.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = v_timezone
  ) then
    raise exception using errcode = '22023', message = 'The business timezone is invalid.';
  end if;

  v_start_time := (p_local_date + p_local_time) at time zone v_timezone;

  return public.create_manual_booking(
    p_business_id,
    p_customer_id,
    p_service_id,
    v_start_time,
    p_status,
    p_source,
    p_notes
  );
end;
$function$;

revoke all on function public.create_manual_booking_local(
  uuid, uuid, uuid, date, time without time zone, text, text, text
) from public;

grant execute on function public.create_manual_booking_local(
  uuid, uuid, uuid, date, time without time zone, text, text, text
) to authenticated, service_role;

create or replace function public.create_public_booking_with_intake_local(
  p_business_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_local_date date,
  p_local_time time without time zone,
  p_notes text,
  p_intake_answers jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_timezone text;
  v_start_time timestamptz;
begin
  if p_local_date is null or p_local_time is null then
    raise exception using errcode = '22023', message = 'Booking date and time are required.';
  end if;

  select coalesce(timezone, 'America/Los_Angeles')
  into v_timezone
  from public.business_profiles
  where id = p_business_id
  limit 1;

  if not found then
    raise exception using errcode = '22023', message = 'Business was not found.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = v_timezone
  ) then
    raise exception using errcode = '22023', message = 'The business timezone is invalid.';
  end if;

  v_start_time := (p_local_date + p_local_time) at time zone v_timezone;

  return public.create_public_booking_with_intake(
    p_business_id,
    p_service_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    v_start_time,
    p_notes,
    p_intake_answers
  );
end;
$function$;

revoke all on function public.create_public_booking_with_intake_local(
  uuid, uuid, text, text, text, date, time without time zone, text, jsonb
) from public;

grant execute on function public.create_public_booking_with_intake_local(
  uuid, uuid, text, text, text, date, time without time zone, text, jsonb
) to anon, authenticated, service_role;

commit;
