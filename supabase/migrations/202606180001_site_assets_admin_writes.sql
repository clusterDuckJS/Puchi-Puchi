drop policy if exists "Admins can upload site assets" on storage.objects;
create policy "Admins can upload site assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-assets'
  and public.is_admin()
);

drop policy if exists "Admins can update site assets" on storage.objects;
create policy "Admins can update site assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-assets'
  and public.is_admin()
)
with check (
  bucket_id = 'site-assets'
  and public.is_admin()
);

drop policy if exists "Admins can delete site assets" on storage.objects;
create policy "Admins can delete site assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-assets'
  and public.is_admin()
);

notify pgrst, 'reload schema';
