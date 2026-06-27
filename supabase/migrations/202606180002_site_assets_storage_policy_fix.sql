create or replace function public.can_manage_site_assets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.can_manage_site_assets() to authenticated;

drop policy if exists "Admins can upload site assets" on storage.objects;
create policy "Admins can upload site assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] in ('products', 'gallery')
  and public.can_manage_site_assets()
);

drop policy if exists "Admins can update site assets" on storage.objects;
create policy "Admins can update site assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] in ('products', 'gallery')
  and public.can_manage_site_assets()
)
with check (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] in ('products', 'gallery')
  and public.can_manage_site_assets()
);

drop policy if exists "Admins can delete site assets" on storage.objects;
create policy "Admins can delete site assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] in ('products', 'gallery')
  and public.can_manage_site_assets()
);

notify pgrst, 'reload schema';
