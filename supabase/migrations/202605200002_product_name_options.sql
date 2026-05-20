alter table public.products
  add column if not exists allow_custom_name boolean not null default false,
  add column if not exists allow_name_plate boolean not null default false;

alter table public.custom_uploads
  add column if not exists custom_text_type text null;

alter table public.custom_uploads
  alter column image_url drop not null;

alter table public.custom_uploads
  drop constraint if exists custom_uploads_custom_text_type_check;

alter table public.custom_uploads
  add constraint custom_uploads_custom_text_type_check
  check (custom_text_type is null or custom_text_type in ('name', 'name_plate'));

notify pgrst, 'reload schema';
