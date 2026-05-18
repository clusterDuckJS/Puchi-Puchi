create policy "Authenticated users can read their custom references"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'custom-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);
