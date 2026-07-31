alter table public.orders
  add column if not exists tracking_notes text,
  add column if not exists tracking_carrier text not null default 'india_post';

update public.orders
set tracking_carrier = 'india_post'
where tracking_carrier is null;

alter table public.orders
  drop constraint if exists orders_tracking_notes_length,
  drop constraint if exists orders_tracking_carrier_value;

alter table public.orders
  add constraint orders_tracking_notes_length
  check (tracking_notes is null or char_length(tracking_notes) <= 600),
  add constraint orders_tracking_carrier_value
  check (tracking_carrier in ('india_post', 'ekart'));

notify pgrst, 'reload schema';
