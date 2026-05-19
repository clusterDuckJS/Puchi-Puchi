alter table public.custom_uploads
  add column if not exists base_text text,
  add column if not exists base_fee integer not null default 0;

alter table public.custom_uploads
  drop constraint if exists custom_uploads_base_text_length;

alter table public.custom_uploads
  add constraint custom_uploads_base_text_length
  check (base_text is null or char_length(base_text) <= 40);

notify pgrst, 'reload schema';
