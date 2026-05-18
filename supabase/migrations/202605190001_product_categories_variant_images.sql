alter table public.products
  add column if not exists categories text[] not null default '{}';

alter table public.product_variants
  add column if not exists image_urls text[] not null default '{}';

update public.products
set categories = array[category]
where category is not null
  and category <> ''
  and cardinality(categories) = 0;

update public.product_variants
set image_urls = array[image_url]
where image_url is not null
  and image_url <> ''
  and cardinality(image_urls) = 0;
