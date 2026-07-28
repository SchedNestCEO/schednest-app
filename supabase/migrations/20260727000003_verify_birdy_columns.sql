alter table public.birdy_suggestions
  add column if not exists description text,
  add column if not exists action_label text,
  add column if not exists action_href text,
  add column if not exists priority text default 'normal',
  add column if not exists source text default 'rule_based',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists dismissed_at timestamptz;

notify pgrst, 'reload schema';
