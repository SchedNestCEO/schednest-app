begin;

create or replace function public.create_manual_booking(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
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
  v_owner_id uuid;
  v_customer public.customers%rowtype;
  v_service public.services%rowtype;
  v_booking public.bookings%rowtype;
  v_end_time timestamptz;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Not authenticated.';
  end if;

  if p_status not in (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid booking status.';
  end if;

  if p_source not in (
    'manual',
    'text',
    'dm',
    'whatsapp',
    'booking_page',
    'phone'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid booking source.';
  end if;

  select owner_id
  into v_owner_id
  from public.business_profiles
  where id = p_business_id
    and owner_id = auth.uid()
  limit 1;

  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'Business not found or access denied.';
  end if;

  select *
  into v_customer
  from public.customers
  where id = p_customer_id
    and business_id = p_business_id
    and owner_id = auth.uid()
  limit 1;

  if v_customer.id is null then
    raise exception using
      errcode = '22023',
      message = 'Customer was not found.';
  end if;

  select *
  into v_service
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and owner_id = auth.uid()
    and deleted_at is null
  limit 1;

  if v_service.id is null then
    raise exception using
      errcode = '22023',
      message = 'Service was not found.';
  end if;

  if p_start_time is null then
    raise exception using
      errcode = '22023',
      message = 'Booking start time is required.';
  end if;

  v_end_time :=
    p_start_time
    + make_interval(mins => coalesce(v_service.duration_minutes, 60));

  if public.booking_status_blocks_time(p_status) then
    perform public.assert_booking_slot_available(
      p_business_id,
      p_start_time,
      v_end_time,
      null
    );
  end if;

  insert into public.bookings (
    business_id,
    owner_id,
    customer_id,
    service_id,
    start_time,
    end_time,
    status,
    source,
    customer_name,
    customer_phone,
    customer_email,
    notes
  )
  values (
    p_business_id,
    v_owner_id,
    v_customer.id,
    v_service.id,
    p_start_time,
    v_end_time,
    p_status,
    p_source,
    coalesce(v_customer.full_name, v_customer.name, 'Customer'),
    v_customer.phone,
    v_customer.email,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id,
    'start_time', v_booking.start_time,
    'end_time', v_booking.end_time,
    'status', v_booking.status
  );
end;
$function$;

revoke all on function public.create_manual_booking(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text
) from public;

grant execute on function public.create_manual_booking(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text
) to authenticated, service_role;


create or replace function public.create_public_booking_with_intake(
  p_business_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_start_time timestamptz,
  p_notes text,
  p_intake_answers jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_business_owner uuid;
  v_service public.services%rowtype;
  v_existing_customer public.customers%rowtype;
  v_customer_id uuid;
  v_booking public.bookings%rowtype;
  v_end_time timestamptz;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
begin
  select owner_id
  into v_business_owner
  from public.business_profiles
  where id = p_business_id
  limit 1;

  if v_business_owner is null then
    raise exception using
      errcode = '22023',
      message = 'Business not found.';
  end if;

  select *
  into v_service
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and deleted_at is null
    and coalesce(is_active, true) = true
    and (publish_at is null or publish_at <= now())
    and (unpublish_at is null or unpublish_at > now())
  limit 1;

  if v_service.id is null then
    raise exception using
      errcode = '22023',
      message = 'Service is not available.';
  end if;

  if p_start_time is null then
    raise exception using
      errcode = '22023',
      message = 'Booking start time is required.';
  end if;

  v_customer_name := nullif(trim(coalesce(p_customer_name, '')), '');
  v_customer_phone := nullif(trim(coalesce(p_customer_phone, '')), '');
  v_customer_email :=
    nullif(lower(trim(coalesce(p_customer_email, ''))), '');

  if v_customer_name is null then
    raise exception using
      errcode = '22023',
      message = 'Customer name is required.';
  end if;

  if v_customer_phone is null and v_customer_email is null then
    raise exception using
      errcode = '22023',
      message = 'Phone or email is required.';
  end if;

  v_end_time :=
    p_start_time
    + make_interval(mins => coalesce(v_service.duration_minutes, 60));

  perform public.assert_booking_slot_available(
    p_business_id,
    p_start_time,
    v_end_time,
    null
  );

  select *
  into v_existing_customer
  from public.customers
  where business_id = p_business_id
    and (
      (
        v_customer_email is not null
        and lower(coalesce(email, '')) = v_customer_email
      )
      or
      (
        v_customer_phone is not null
        and coalesce(phone, '') = v_customer_phone
      )
    )
  limit 1;

  if v_existing_customer.id is not null then
    v_customer_id := v_existing_customer.id;
  else
    insert into public.customers (
      business_id,
      owner_id,
      full_name,
      name,
      phone,
      email
    )
    values (
      p_business_id,
      v_business_owner,
      v_customer_name,
      v_customer_name,
      v_customer_phone,
      v_customer_email
    )
    returning id into v_customer_id;
  end if;

  insert into public.bookings (
    business_id,
    owner_id,
    customer_id,
    service_id,
    start_time,
    end_time,
    status,
    source,
    customer_name,
    customer_phone,
    customer_email,
    notes,
    intake_answers
  )
  values (
    p_business_id,
    v_business_owner,
    v_customer_id,
    p_service_id,
    p_start_time,
    v_end_time,
    'pending',
    'booking_page',
    v_customer_name,
    v_customer_phone,
    v_customer_email,
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_intake_answers, '{}'::jsonb)
  )
  returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id,
    'start_time', v_booking.start_time,
    'end_time', v_booking.end_time,
    'status', v_booking.status
  );
end;
$function$;

revoke all on function public.create_public_booking_with_intake(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  jsonb
) from public;

grant execute on function public.create_public_booking_with_intake(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  jsonb
) to anon, authenticated, service_role;


create or replace function public.approve_booking_request(
  p_booking_id uuid,
  p_new_status text
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_booking public.bookings%rowtype;
  v_customer_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Not authenticated.';
  end if;

  if p_new_status not in ('confirmed', 'cancelled') then
    raise exception using
      errcode = '22023',
      message = 'Invalid approval status.';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
    and owner_id = auth.uid()
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Booking request not found.';
  end if;

  if p_new_status = 'confirmed' then
    perform public.assert_booking_slot_available(
      v_booking.business_id,
      v_booking.start_time,
      v_booking.end_time,
      v_booking.id
    );

    if v_booking.customer_id is null then
      insert into public.customers (
        business_id,
        owner_id,
        name,
        full_name,
        phone,
        email,
        preferred_language,
        source,
        notes
      )
      values (
        v_booking.business_id,
        v_booking.owner_id,
        coalesce(v_booking.customer_name, 'Customer'),
        coalesce(v_booking.customer_name, 'Customer'),
        v_booking.customer_phone,
        v_booking.customer_email,
        'en',
        'booking_page',
        'Created automatically when booking request was approved.'
      )
      returning id into v_customer_id;
    else
      v_customer_id := v_booking.customer_id;
    end if;
  else
    v_customer_id := v_booking.customer_id;
  end if;

  update public.bookings
  set
    customer_id = v_customer_id,
    status = p_new_status,
    updated_at = now(),
    cancelled_at = case
      when p_new_status = 'cancelled' then now()
      else cancelled_at
    end
  where id = p_booking_id
    and owner_id = auth.uid();

  return jsonb_build_object(
    'id', p_booking_id,
    'customer_id', v_customer_id,
    'status', p_new_status
  );
end;
$function$;

revoke all on function public.approve_booking_request(uuid, text)
  from public;

grant execute on function public.approve_booking_request(uuid, text)
  to authenticated, service_role;

commit;
