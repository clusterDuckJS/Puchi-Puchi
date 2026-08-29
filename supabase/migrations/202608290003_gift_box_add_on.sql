alter table public.products
  add column if not exists allow_gift_box boolean not null default false;

alter table public.custom_uploads
  add column if not exists gift_box boolean not null default false;

notify pgrst, 'reload schema';
