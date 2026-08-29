alter table public.reviews
  add column if not exists review_image_url text;

alter table public.reviews
  drop constraint if exists reviews_review_image_url_length;

alter table public.reviews
  add constraint reviews_review_image_url_length
  check (review_image_url is null or char_length(review_image_url) <= 2048);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  10485760,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload review images" on storage.objects;
create policy "Authenticated users can upload review images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'review-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated users can delete review images" on storage.objects;
create policy "Authenticated users can delete review images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'review-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Anyone can submit pending reviews" on public.reviews;
create policy "Authenticated users can submit pending reviews"
on public.reviews
for insert
to authenticated
with check (
  is_approved = false
  and source = 'customer'
  and product_id is not null
  and admin_reply_text is null
  and admin_reply_date is null
  and exists (
    select 1
    from public.products
    where products.id = reviews.product_id
      and products.is_active = true
  )
);

notify pgrst, 'reload schema';
