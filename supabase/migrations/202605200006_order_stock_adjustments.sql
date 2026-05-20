alter table public.orders
  add column if not exists inventory_deducted_at timestamptz null;

create or replace function public.deduct_order_stock(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_inventory_deducted_at timestamptz;
begin
  select inventory_deducted_at
  into order_inventory_deducted_at
  from public.orders
  where id = target_order_id
  for update;

  if order_inventory_deducted_at is not null then
    return;
  end if;

  update public.product_variants
  set stock = greatest(coalesce(product_variants.stock, 0) - item_totals.quantity, 0)
  from (
    select variant_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = target_order_id
      and variant_id is not null
    group by variant_id
  ) as item_totals
  where product_variants.id = item_totals.variant_id;

  update public.orders
  set inventory_deducted_at = now()
  where id = target_order_id;
end;
$$;

create or replace function public.restore_order_stock(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_inventory_deducted_at timestamptz;
begin
  select inventory_deducted_at
  into order_inventory_deducted_at
  from public.orders
  where id = target_order_id
  for update;

  if order_inventory_deducted_at is null then
    return;
  end if;

  update public.product_variants
  set stock = coalesce(product_variants.stock, 0) + item_totals.quantity
  from (
    select variant_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = target_order_id
      and variant_id is not null
    group by variant_id
  ) as item_totals
  where product_variants.id = item_totals.variant_id;

  update public.orders
  set inventory_deducted_at = null
  where id = target_order_id;
end;
$$;
