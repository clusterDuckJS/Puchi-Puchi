create table if not exists public.user_addresses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  label text null,
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text null,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  delivery_notes text null,
  is_default boolean not null default false,
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  updated_at timestamp with time zone null default timezone('utc'::text, now()),
  constraint user_addresses_pkey primary key (id),
  constraint user_addresses_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

create unique index if not exists user_addresses_one_default_per_user
on public.user_addresses (user_id)
where is_default;

alter table public.user_addresses enable row level security;

create policy "Users can read their addresses"
on public.user_addresses
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their addresses"
on public.user_addresses
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their addresses"
on public.user_addresses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their addresses"
on public.user_addresses
for delete
to authenticated
using (auth.uid() = user_id);
