begin;

create extension if not exists btree_gist;

alter table public.bookings
  drop constraint if exists bookings_time_order_check;

alter table public.bookings
  add constraint bookings_time_order_check
  check (end_time > start_time)
  not valid;

alter table public.bookings
  validate constraint bookings_time_order_check;

create index if not exists bookings_business_time_idx
  on public.bookings (business_id, start_time, end_time);

create or replace function public.booking_status_blocks_time(
  target_status text
)
returns boolean
language sql
immutable
as $$
  select coalesce(target_status, 'pending')
    not in ('cancelled', 'completed', 'no_show');
$$;

revoke all on function public.booking_status_blocks_time(text) from public;
grant execute on function public.booking_status_blocks_time(text)
  to authenticated, service_role;

create or replace function public.assert_booking_slot_available(
  p_business_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_booking_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $$
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

  if p_end_time <= p_start_time then
    raise exception using
      errcode = '22023',
      message = 'Booking end time must be after the start time.';
  end if;

  if exists (
    select 1
    from public.bookings existing_booking
    where existing_booking.business_id = p_business_id
      and public.booking_status_blocks_time(existing_booking.status)
      and (
        p_exclude_booking_id is null
        or existing_booking.id <> p_exclude_booking_id
      )
      and existing_booking.start_time < p_end_time
      and p_start_time < existing_booking.end_time
  ) then
    raise exception using
      errcode = '23P01',
      message = 'This time is no longer available.';
  end if;
end;
$$;

revoke all on function public.assert_booking_slot_available(
  uuid,
  timestamptz,
  timestamptz,
  uuid
) from public;

grant execute on function public.assert_booking_slot_available(
  uuid,
  timestamptz,
  timestamptz,
  uuid
) to authenticated, service_role;

alter table public.bookings
  drop constraint if exists bookings_no_active_overlap;

alter table public.bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    business_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (
    business_id is not null
    and public.booking_status_blocks_time(status)
  );

commit;
