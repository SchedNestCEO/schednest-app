-- Restrict founder contribution records to active platform administrators.
-- Records remain private to the individual administrator who created them.

drop policy if exists "Users can read their own founder time"
on public.founder_time_entries;

drop policy if exists "Users can insert their own founder time"
on public.founder_time_entries;

drop policy if exists "Users can update their own founder time"
on public.founder_time_entries;

drop policy if exists "Users can delete their own founder time"
on public.founder_time_entries;

create policy "Platform admins can read their own founder time"
on public.founder_time_entries
for select
to authenticated
using (
  public.is_platform_admin()
  and user_id = auth.uid()
);

create policy "Platform admins can insert their own founder time"
on public.founder_time_entries
for insert
to authenticated
with check (
  public.is_platform_admin()
  and user_id = auth.uid()
);

create policy "Platform admins can update their own founder time"
on public.founder_time_entries
for update
to authenticated
using (
  public.is_platform_admin()
  and user_id = auth.uid()
)
with check (
  public.is_platform_admin()
  and user_id = auth.uid()
);

create policy "Platform admins can delete their own founder time"
on public.founder_time_entries
for delete
to authenticated
using (
  public.is_platform_admin()
  and user_id = auth.uid()
);
