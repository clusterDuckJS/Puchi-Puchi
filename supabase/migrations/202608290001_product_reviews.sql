alter table public.reviews
  add column if not exists product_id uuid references public.products(id) on delete set null;

create index if not exists reviews_product_id_review_date_idx
  on public.reviews (product_id, review_date desc, created_at desc);

-- Preserve existing reviews by linking every unambiguous legacy product name.
update public.reviews as review
set product_id = product.id
from public.products as product
where review.product_id is null
  and lower(trim(review.product_name)) = lower(trim(product.name));

-- Customer submissions must identify the product they review.
drop policy if exists "Anyone can submit pending reviews" on public.reviews;
create policy "Anyone can submit pending reviews"
on public.reviews
for insert
to anon, authenticated
with check (
  is_approved = false
  and source = 'customer'
  and product_id is not null
  and exists (
    select 1
    from public.products
    where products.id = reviews.product_id
      and products.is_active = true
  )
);

notify pgrst, 'reload schema';
