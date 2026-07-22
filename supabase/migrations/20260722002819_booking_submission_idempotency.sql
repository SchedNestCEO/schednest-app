begin;

alter table public.bookings
  add column if not exists submission_key uuid,
  add column if not exists submission_fingerprint text;

create unique index if not exists bookings_business_submission_key_unique
  on public.bookings(business_id, submission_key)
  where submission_key is not null;

create or replace function public.create_manual_booking_local_idempotent(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_local_date date,
  p_local_time time without time zone,
  p_submission_key uuid,
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
  v_fingerprint text;
  v_existing public.bookings%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Not authenticated.';
  end if;

  if p_submission_key is null then
    raise exception using errcode = '22023', message = 'Submission key is required.';
  end if;

  v_fingerprint := md5(concat_ws(
    '|',
    p_business_id::text,
    p_customer_id::text,
    p_service_id::text,
    p_local_date::text,
    p_local_time::text,
    coalesce(p_status, ''),
    coalesce(p_source, ''),
    trim(coalesce(p_notes, ''))
  ));

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text || ':' || p_submission_key::text, 0)
  );

  select *
  into v_existing
  from public.bookings
  where business_id = p_business_id
    and submission_key = p_submission_key
  limit 1;

  if v_existing.id is not null then
    if v_existing.submission_fingerprint is distinct from v_fingerprint then
      raise exception using errcode = '22023', message = 'Submission key was already used with different booking details.';
    end if;

    return jsonb_build_object(
      'id', v_existing.id,
      'start_time', v_existing.start_time,
      'end_time', v_existing.end_time,
      'status', v_existing.status,
      'idempotent_replay', true
    );
  end if;

  v_result := public.create_manual_booking_local(
    p_business_id,
    p_customer_id,
    p_service_id,
    p_local_date,
    p_local_time,
    p_status,
    p_source,
    p_notes
  );

  update public.bookings
  set submission_key = p_submission_key,
      submission_fingerprint = v_fingerprint
  where id = (v_result ->> 'id')::uuid;

  return v_result || jsonb_build_object('idempotent_replay', false);
end;
$function$;

revoke all on function public.create_manual_booking_local_idempotent(
  uuid, uuid, uuid, date, time without time zone, uuid, text, text, text
) from public;

grant execute on function public.create_manual_booking_local_idempotent(
  uuid, uuid, uuid, date, time without time zone, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.create_public_booking_with_intake_local_idempotent(
  p_business_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_local_date date,
  p_local_time time without time zone,
  p_submission_key uuid,
  p_notes text,
  p_intake_answers jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_fingerprint text;
  v_existing public.bookings%rowtype;
  v_result jsonb;
begin
  if p_submission_key is null then
    raise exception using errcode = '22023', message = 'Submission key is required.';
  end if;

  v_fingerprint := md5(concat_ws(
    '|',
    p_business_id::text,
    p_service_id::text,
    lower(trim(coalesce(p_customer_name, ''))),
    trim(coalesce(p_customer_phone, '')),
    lower(trim(coalesce(p_customer_email, ''))),
    p_local_date::text,
    p_local_time::text,
    trim(coalesce(p_notes, '')),
    coalesce(p_intake_answers, '{}'::jsonb)::text
  ));

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text || ':' || p_submission_key::text, 0)
  );

  select *
  into v_existing
  from public.bookings
  where business_id = p_business_id
    and submission_key = p_submission_key
  limit 1;

  if v_existing.id is not null then
    if v_existing.submission_fingerprint is distinct from v_fingerprint then
      raise exception using errcode = '22023', message = 'Submission key was already used with different booking details.';
    end if;

    return jsonb_build_object(
      'id', v_existing.id,
      'start_time', v_existing.start_time,
      'end_time', v_existing.end_time,
      'status', v_existing.status,
      'idempotent_replay', true
    );
  end if;

  v_result := public.create_public_booking_with_intake_local(
    p_business_id,
    p_service_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_local_date,
    p_local_time,
    p_notes,
    p_intake_answers
  );

  update public.bookings
  set submission_key = p_submission_key,
      submission_fingerprint = v_fingerprint
  where id = (v_result ->> 'id')::uuid;

  return v_result || jsonb_build_object('idempotent_replay', false);
end;
$function$;

revoke all on function public.create_public_booking_with_intake_local_idempotent(
  uuid, uuid, text, text, text, date, time without time zone, uuid, text, jsonb
) from public;

grant execute on function public.create_public_booking_with_intake_local_idempotent(
  uuid, uuid, text, text, text, date, time without time zone, uuid, text, jsonb
) to anon, authenticated, service_role;

commit;
