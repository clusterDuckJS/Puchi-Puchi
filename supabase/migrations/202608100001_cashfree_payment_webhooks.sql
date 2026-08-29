alter table public.orders
  add column if not exists cashfree_order_id text,
  add column if not exists cashfree_payment_id text,
  add column if not exists cashfree_payment_status text,
  add column if not exists checkout_started_at timestamptz;

create unique index if not exists orders_cashfree_order_id_key
  on public.orders (cashfree_order_id)
  where cashfree_order_id is not null;

create index if not exists orders_cashfree_payment_id_idx
  on public.orders (cashfree_payment_id)
  where cashfree_payment_id is not null;

notify pgrst, 'reload schema';
