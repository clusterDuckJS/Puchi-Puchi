alter table public.orders
  add column if not exists paid_at timestamp with time zone,
  add column if not exists tracking_id text,
  add column if not exists dispatched_at timestamp with time zone;

update public.orders
set paid_at = created_at
where paid_at is null
  and status <> 'pending';

alter table public.orders
  drop constraint if exists orders_tracking_id_length;

alter table public.orders
  add constraint orders_tracking_id_length
  check (tracking_id is null or char_length(tracking_id) <= 120);

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
