-- SchedNest Med private document storage

insert into storage.buckets (id, name, public)
values ('med-documents', 'med-documents', false)
on conflict (id) do nothing;

drop policy if exists "med_documents_storage_insert" on storage.objects;
create policy "med_documents_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'med-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "med_documents_storage_select" on storage.objects;
create policy "med_documents_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'med-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "med_documents_storage_delete" on storage.objects;
create policy "med_documents_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'med-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
