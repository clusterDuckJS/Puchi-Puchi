alter table public.custom_uploads
  add column if not exists whatsapp_number text;

alter table public.custom_uploads
  drop constraint if exists custom_uploads_whatsapp_number_length;

alter table public.custom_uploads
  add constraint custom_uploads_whatsapp_number_length
  check (whatsapp_number is null or char_length(whatsapp_number) <= 32);

notify pgrst, 'reload schema';
