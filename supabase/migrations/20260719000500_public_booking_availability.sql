begin;

create or replace function public.get_public_booking_occupied_ranges(
  p_business_id uuid,
  p_local_date date
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_timezone text;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_ranges jsonb;
begin
  if p_business_id is null or p_local_date is null then
    raise exception using
      errcode = '22023',
      message = 'Business and date are required.';
  end if;

  select coalesce(timezone, 'America/Los_Angeles')
  into v_timezone
  from public.business_profiles
  where id = p_business_id
  limit 1;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Business was not found.';
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

  v_day_start :=
    p_local_date::timestamp without time zone at time zone v_timezone;

  v_day_end :=
    (p_local_date + 1)::timestamp without time zone at time zone v_timezone;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'start_time', booking.start_time,
        'end_time', booking.end_time
      )
      order by booking.start_time
    ),
    '[]'::jsonb
  )
  into v_ranges
  from public.bookings booking
  where booking.business_id = p_business_id
    and public.booking_status_blocks_time(booking.status)
    and booking.start_time < v_day_end
    and v_day_start < booking.end_time;

  return v_ranges;
end;
$function$;

revoke all on function public.get_public_booking_occupied_ranges(
  uuid,
  date
) from public;

grant execute on function public.get_public_booking_occupied_ranges(
  uuid,
  date
) to anon, authenticated, service_role;

commit;
