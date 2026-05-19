create or replace function public.is_admin()
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

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.custom_uploads enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read products in their orders" on public.products;
create policy "Users can read products in their orders"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.product_id = products.id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products
    where products.id = product_variants.product_id
      and products.is_active = true
  )
);

drop policy if exists "Admins can manage product variants" on public.product_variants;
create policy "Admins can manage product variants"
on public.product_variants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read product variants in their orders" on public.product_variants;
create policy "Users can read product variants in their orders"
on public.product_variants
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.variant_id = product_variants.id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can read their orders" on public.orders;
create policy "Users can read their orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create pending orders" on public.orders;
create policy "Users can create pending orders"
on public.orders
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "Users can update their pending orders" on public.orders;
create policy "Users can update their pending orders"
on public.orders
for update
to authenticated
using (
  auth.uid() = user_id
  and status = 'pending'
)
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "Users can delete their pending orders" on public.orders;
create policy "Users can delete their pending orders"
on public.orders
for delete
to authenticated
using (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read their order items" on public.order_items;
create policy "Users can read their order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can create pending order items" on public.order_items;
create policy "Users can create pending order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
);

drop policy if exists "Users can update their pending order items" on public.order_items;
create policy "Users can update their pending order items"
on public.order_items
for update
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
)
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
);

drop policy if exists "Users can delete their pending order items" on public.order_items;
create policy "Users can delete their pending order items"
on public.order_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
);

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read their custom uploads" on public.custom_uploads;
create policy "Users can read their custom uploads"
on public.custom_uploads
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.id = custom_uploads.order_item_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can create pending custom uploads" on public.custom_uploads;
create policy "Users can create pending custom uploads"
on public.custom_uploads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.id = custom_uploads.order_item_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
);

drop policy if exists "Users can update their pending custom uploads" on public.custom_uploads;
create policy "Users can update their pending custom uploads"
on public.custom_uploads
for update
to authenticated
using (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.id = custom_uploads.order_item_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
)
with check (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.id = custom_uploads.order_item_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
);

drop policy if exists "Users can delete their pending custom uploads" on public.custom_uploads;
create policy "Users can delete their pending custom uploads"
on public.custom_uploads
for delete
to authenticated
using (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.id = custom_uploads.order_item_id
      and orders.user_id = auth.uid()
      and orders.status = 'pending'
  )
);

drop policy if exists "Admins can manage custom uploads" on public.custom_uploads;
create policy "Admins can manage custom uploads"
on public.custom_uploads
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
