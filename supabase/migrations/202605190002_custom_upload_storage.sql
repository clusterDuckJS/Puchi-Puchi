insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'custom-uploads',
  'custom-uploads',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload custom references"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'custom-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Authenticated users can update their custom references"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'custom-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'custom-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Authenticated users can delete their custom references"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'custom-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);
