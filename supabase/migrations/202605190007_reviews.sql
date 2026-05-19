create table if not exists public.reviews (
  id uuid not null default gen_random_uuid(),
  reviewer_first_name text not null,
  place text not null,
  product_name text not null,
  rating integer not null,
  review_text text not null,
  review_date date not null default current_date,
  is_approved boolean not null default false,
  source text not null default 'customer',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint reviews_pkey primary key (id),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_reviewer_first_name_length check (char_length(reviewer_first_name) <= 40),
  constraint reviews_place_length check (char_length(place) <= 80),
  constraint reviews_product_name_length check (char_length(product_name) <= 120),
  constraint reviews_review_text_length check (char_length(review_text) <= 1000),
  constraint reviews_source_value check (source in ('customer', 'admin', 'legacy'))
);

alter table public.reviews enable row level security;

create policy "Public can read approved reviews"
on public.reviews
for select
to anon, authenticated
using (is_approved = true);

create policy "Anyone can submit pending reviews"
on public.reviews
for insert
to anon, authenticated
with check (
  is_approved = false
  and source = 'customer'
);

create policy "Admins can manage reviews"
on public.reviews
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

notify pgrst, 'reload schema';
