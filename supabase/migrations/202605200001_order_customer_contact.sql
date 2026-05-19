alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text;

update public.orders
set
  customer_name = nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''),
  customer_email = profiles.email,
  customer_phone = profiles.phone
from public.profiles
where orders.user_id = profiles.id
  and (
    orders.customer_name is null
    or orders.customer_email is null
    or orders.customer_phone is null
  );

alter table public.orders
  drop constraint if exists orders_customer_name_length,
  drop constraint if exists orders_customer_email_length,
  drop constraint if exists orders_customer_phone_length;

alter table public.orders
  add constraint orders_customer_name_length
  check (customer_name is null or char_length(customer_name) <= 160),
  add constraint orders_customer_email_length
  check (customer_email is null or char_length(customer_email) <= 254),
  add constraint orders_customer_phone_length
  check (customer_phone is null or char_length(customer_phone) <= 32);

notify pgrst, 'reload schema';
