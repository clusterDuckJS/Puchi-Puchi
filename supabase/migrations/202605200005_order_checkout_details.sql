alter table public.orders
  add column if not exists selected_address_id uuid null references public.user_addresses (id) on delete set null,
  add column if not exists delivery_address jsonb null,
  add column if not exists shipping_method text null,
  add column if not exists shipping_amount integer not null default 0,
  add column if not exists has_insurance boolean not null default false,
  add column if not exists insurance_amount integer not null default 0,
  add column if not exists crafting_speed text null,
  add column if not exists crafting_speed_fee integer not null default 0;

alter table public.orders
  drop constraint if exists orders_shipping_method_check,
  drop constraint if exists orders_shipping_amount_check,
  drop constraint if exists orders_insurance_amount_check,
  drop constraint if exists orders_crafting_speed_check,
  drop constraint if exists orders_crafting_speed_fee_check;

alter table public.orders
  add constraint orders_shipping_method_check
    check (shipping_method is null or shipping_method in ('standard', 'priority')),
  add constraint orders_shipping_amount_check
    check (shipping_amount >= 0),
  add constraint orders_insurance_amount_check
    check (insurance_amount >= 0),
  add constraint orders_crafting_speed_check
    check (crafting_speed is null or crafting_speed in ('standard', 'priority')),
  add constraint orders_crafting_speed_fee_check
    check (crafting_speed_fee >= 0);
