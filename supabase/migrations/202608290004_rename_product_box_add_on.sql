alter table public.products
  rename column allow_gift_box to allow_product_box;

alter table public.custom_uploads
  rename column gift_box to product_box;

notify pgrst, 'reload schema';
