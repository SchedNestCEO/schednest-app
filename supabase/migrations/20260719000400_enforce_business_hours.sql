begin;

create or replace function public.assert_booking_within_business_hours(
  p_business_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_timezone text;
  v_booking_time_mode text;
  v_business_hours_enabled boolean;
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_local_day_of_week integer;
  v_hours public.business_hours%rowtype;
begin
  if p_business_id is null then
    raise exception using
      errcode = '22023',
      message = 'Business is required.';
  end if;

  if p_start_time is null or p_end_time is null then
    raise exception using
      errcode = '22023',
      message = 'Booking start and end time are required.';
  end if;

  select
    coalesce(timezone, 'America/Los_Angeles'),
    coalesce(booking_time_mode, 'fixed_hours'),
    coalesce(business_hours_enabled, true)
  into
    v_timezone,
    v_booking_time_mode,
    v_business_hours_enabled
  from public.business_profiles
  where id = p_business_id;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Business was not found.';
  end if;

  -- Flexible requests and businesses operating by appointment
  -- may accept preferred times outside configured hours.
  if v_booking_time_mode = 'flexible_requests'
     or v_business_hours_enabled = false then
    return;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = v_timezone
  ) then
    raise exception using
      errcode = '22023',
      message = 'The business timezone is invalid.';
  end if;

  v_local_start := p_start_time at time zone v_timezone;
  v_local_end := p_end_time at time zone v_timezone;

  if v_local_start::date <> v_local_end::date then
    raise exception using
      errcode = '22023',
      message = 'The appointment must start and end on the same business day.';
  end if;

  v_local_day_of_week := extract(dow from v_local_start)::integer;

  select *
  into v_hours
  from public.business_hours
  where business_id = p_business_id
    and day_of_week = v_local_day_of_week
  limit 1;

  if not found
     or coalesce(v_hours.is_open, false) = false
     or v_hours.open_time is null
     or v_hours.close_time is null then
    raise exception using
      errcode = '22023',
      message = 'The business is closed at the requested time.';
  end if;

  if v_local_start::time < v_hours.open_time
     or v_local_end::time > v_hours.close_time then
    raise exception using
      errcode = '22023',
      message = 'The requested time is outside the business hours.';
  end if;
end;
$function$;

revoke all on function public.assert_booking_within_business_hours(
  uuid,
  timestamptz,
  timestamptz
) from public, anon;

grant execute on function public.assert_booking_within_business_hours(
  uuid,
  timestamptz,
  timestamptz
) to authenticated, service_role;


create or replace function public.enforce_booking_business_hours()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  if public.booking_status_blocks_time(new.status) then
    perform public.assert_booking_within_business_hours(
      new.business_id,
      new.start_time,
      new.end_time
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_booking_business_hours()
  from public, anon, authenticated;

grant execute on function public.enforce_booking_business_hours()
  to service_role;


drop trigger if exists enforce_booking_business_hours_trigger
  on public.bookings;

create trigger enforce_booking_business_hours_trigger
before insert or update of
  business_id,
  start_time,
  end_time,
  status
on public.bookings
for each row
when (
  new.business_id is not null
  and public.booking_status_blocks_time(new.status)
)
execute function public.enforce_booking_business_hours();

commit;
