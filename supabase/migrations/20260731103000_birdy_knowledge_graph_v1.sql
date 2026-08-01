-- SchedNest Sprint 8: Birdy Knowledge Graph v1
-- Owner-scoped entities, relationships, evidence, and confidence history.
-- This migration creates intelligence storage only. It does not authorize
-- autonomous execution.

create table if not exists public.birdy_graph_entities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  product text not null
    check (
      product in (
        'platform',
        'student',
        'teams',
        'med',
        'business',
        'life'
      )
    ),

  entity_type text not null
    check (
      entity_type in (
        'memory',
        'person',
        'customer',
        'booking',
        'service',
        'goal',
        'project',
        'task',
        'schedule',
        'activity',
        'knowledge',
        'decision',
        'suggestion',
        'recommendation',
        'student_record',
        'team_record',
        'med_record',
        'business_record',
        'life_record'
      )
    ),

  resource_type text,
  resource_id text,

  canonical_key text not null,
  title text not null,
  summary text,

  sensitivity text not null default 'standard'
    check (
      sensitivity in (
        'standard',
        'personal',
        'sensitive',
        'restricted'
      )
    ),

  confidence numeric(5,4) not null default 0.5000
    check (
      confidence >= 0
      and confidence <= 1
    ),

  source_type text not null
    check (
      source_type in (
        'user',
        'system',
        'birdy',
        'integration'
      )
    ),

  source_reference jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  lifecycle_status text not null default 'active'
    check (
      lifecycle_status in (
        'active',
        'archived',
        'invalidated',
        'superseded',
        'deleted'
      )
    ),

  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  observed_at timestamptz,
  last_verified_at timestamptz,

  superseded_by_entity_id uuid
    references public.birdy_graph_entities(id)
    on delete set null,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(owner_id, canonical_key),

  check (
    valid_until is null
    or valid_until >= valid_from
  )
);

create index if not exists birdy_graph_entities_owner_type_idx
  on public.birdy_graph_entities(
    owner_id,
    entity_type,
    lifecycle_status
  );

create index if not exists birdy_graph_entities_owner_product_idx
  on public.birdy_graph_entities(
    owner_id,
    product,
    updated_at desc
  );

create index if not exists birdy_graph_entities_resource_idx
  on public.birdy_graph_entities(
    owner_id,
    resource_type,
    resource_id
  );

create table if not exists public.birdy_graph_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  source_entity_id uuid not null
    references public.birdy_graph_entities(id)
    on delete cascade,

  target_entity_id uuid not null
    references public.birdy_graph_entities(id)
    on delete cascade,

  relationship_type text not null
    check (
      relationship_type in (
        'belongs_to',
        'depends_on',
        'supports',
        'conflicts_with',
        'derived_from',
        'related_to',
        'assigned_to',
        'scheduled_for',
        'influences',
        'supersedes',
        'invalidates',
        'evidences',
        'recommended_for'
      )
    ),

  strength numeric(5,4) not null default 0.5000
    check (
      strength >= 0
      and strength <= 1
    ),

  confidence numeric(5,4) not null default 0.5000
    check (
      confidence >= 0
      and confidence <= 1
    ),

  explanation text,
  source_type text not null
    check (
      source_type in (
        'user',
        'system',
        'birdy',
        'integration'
      )
    ),

  source_reference jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  lifecycle_status text not null default 'active'
    check (
      lifecycle_status in (
        'active',
        'archived',
        'invalidated',
        'superseded',
        'deleted'
      )
    ),

  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  observed_at timestamptz,
  last_verified_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(
    owner_id,
    source_entity_id,
    target_entity_id,
    relationship_type
  ),

  check (
    source_entity_id <> target_entity_id
  ),

  check (
    valid_until is null
    or valid_until >= valid_from
  )
);

create index if not exists birdy_graph_relationships_owner_idx
  on public.birdy_graph_relationships(
    owner_id,
    relationship_type,
    lifecycle_status
  );

create index if not exists birdy_graph_relationships_source_idx
  on public.birdy_graph_relationships(
    owner_id,
    source_entity_id
  );

create index if not exists birdy_graph_relationships_target_idx
  on public.birdy_graph_relationships(
    owner_id,
    target_entity_id
  );

create table if not exists public.birdy_graph_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  entity_id uuid
    references public.birdy_graph_entities(id)
    on delete cascade,

  relationship_id uuid
    references public.birdy_graph_relationships(id)
    on delete cascade,

  evidence_type text not null
    check (
      evidence_type in (
        'record',
        'observation',
        'memory',
        'event',
        'user_confirmation',
        'system_calculation',
        'integration'
      )
    ),

  resource_type text,
  resource_id text,
  claim text not null,

  reliability numeric(5,4) not null default 0.5000
    check (
      reliability >= 0
      and reliability <= 1
    ),

  freshness numeric(5,4) not null default 1.0000
    check (
      freshness >= 0
      and freshness <= 1
    ),

  supports_claim boolean not null default true,
  sensitive_data_used boolean not null default false,

  source_reference jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  invalidated_at timestamptz,
  invalidation_reason text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  check (
    entity_id is not null
    or relationship_id is not null
  ),

  check (
    expires_at is null
    or expires_at >= observed_at
  )
);

create index if not exists birdy_graph_evidence_entity_idx
  on public.birdy_graph_evidence(
    owner_id,
    entity_id,
    created_at desc
  );

create index if not exists birdy_graph_evidence_relationship_idx
  on public.birdy_graph_evidence(
    owner_id,
    relationship_id,
    created_at desc
  );

create table if not exists public.birdy_confidence_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  entity_id uuid
    references public.birdy_graph_entities(id)
    on delete cascade,

  relationship_id uuid
    references public.birdy_graph_relationships(id)
    on delete cascade,

  decision_id uuid
    references public.birdy_action_decisions(id)
    on delete cascade,

  overall_confidence numeric(5,4) not null
    check (
      overall_confidence >= 0
      and overall_confidence <= 1
    ),

  uncertainty numeric(5,4) not null
    check (
      uncertainty >= 0
      and uncertainty <= 1
    ),

  factors jsonb not null default '[]'::jsonb,
  explanation text,
  evidence_count integer not null default 0
    check (evidence_count >= 0),

  calibration_version text not null default 'birdy-confidence-v1',
  metadata jsonb not null default '{}'::jsonb,

  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  check (
    entity_id is not null
    or relationship_id is not null
    or decision_id is not null
  )
);

create index if not exists birdy_confidence_owner_assessed_idx
  on public.birdy_confidence_assessments(
    owner_id,
    assessed_at desc
  );

alter table public.birdy_graph_entities enable row level security;
alter table public.birdy_graph_relationships enable row level security;
alter table public.birdy_graph_evidence enable row level security;
alter table public.birdy_confidence_assessments enable row level security;

drop policy if exists "birdy_graph_entities_owner_all"
on public.birdy_graph_entities;

create policy "birdy_graph_entities_owner_all"
on public.birdy_graph_entities
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "birdy_graph_relationships_owner_all"
on public.birdy_graph_relationships;

create policy "birdy_graph_relationships_owner_all"
on public.birdy_graph_relationships
for all
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.birdy_graph_entities source_entity
    where source_entity.id = source_entity_id
      and source_entity.owner_id = auth.uid()
  )
  and exists (
    select 1
    from public.birdy_graph_entities target_entity
    where target_entity.id = target_entity_id
      and target_entity.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.birdy_graph_entities source_entity
    where source_entity.id = source_entity_id
      and source_entity.owner_id = auth.uid()
  )
  and exists (
    select 1
    from public.birdy_graph_entities target_entity
    where target_entity.id = target_entity_id
      and target_entity.owner_id = auth.uid()
  )
);

drop policy if exists "birdy_graph_evidence_owner_all"
on public.birdy_graph_evidence;

create policy "birdy_graph_evidence_owner_all"
on public.birdy_graph_evidence
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "birdy_confidence_assessments_owner_all"
on public.birdy_confidence_assessments;

create policy "birdy_confidence_assessments_owner_all"
on public.birdy_confidence_assessments
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
