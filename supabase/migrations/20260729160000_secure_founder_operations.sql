-- Align founder operations with the shared platform-admin authorization model.
-- This removes the brittle dependency on one literal administrator email.

drop policy if exists "Admins can read revenue impact"
on public.client_revenue_impact;

drop policy if exists "Admins can insert revenue impact"
on public.client_revenue_impact;

drop policy if exists "Admins can update revenue impact"
on public.client_revenue_impact;

drop policy if exists "Admins can delete revenue impact"
on public.client_revenue_impact;

create policy "Platform admins can read revenue impact"
on public.client_revenue_impact
for select
to authenticated
using (public.is_platform_admin());

create policy "Platform admins can insert revenue impact"
on public.client_revenue_impact
for insert
to authenticated
with check (
  public.is_platform_admin()
  and recorded_by = auth.uid()
);

create policy "Platform admins can update revenue impact"
on public.client_revenue_impact
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admins can delete revenue impact"
on public.client_revenue_impact
for delete
to authenticated
using (public.is_platform_admin());
