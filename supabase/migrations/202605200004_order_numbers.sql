alter table public.orders
  add column if not exists order_number integer;

create sequence if not exists public.order_number_seq
  start with 177
  increment by 1;

with existing_order_numbers as (
  select greatest(coalesce(max(order_number), 176), 176) as base_order_number
  from public.orders
),
numbered_orders as (
  select
    id,
    existing_order_numbers.base_order_number + row_number() over (order by created_at, id) as next_order_number
  from public.orders
  cross join existing_order_numbers
  where status <> 'pending'
    and order_number is null
)
update public.orders
set order_number = numbered_orders.next_order_number
from numbered_orders
where orders.id = numbered_orders.id;

select setval(
  'public.order_number_seq',
  greatest(coalesce((select max(order_number) from public.orders), 176), 176),
  true
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_order_number_unique'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_order_number_unique unique (order_number);
  end if;
end $$;

create or replace function public.assign_order_number(target_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_order_number integer;
begin
  update public.orders
  set order_number = coalesce(order_number, nextval('public.order_number_seq')::integer)
  where id = target_order_id
  returning order_number into assigned_order_number;

  return assigned_order_number;
end;
$$;
