alter table public.products
  add column if not exists slug text;

create or replace function public.slugify_product_name(value text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

create or replace function public.assign_product_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 2;
begin
  if new.slug is null or btrim(new.slug) = '' then
    base_slug := coalesce(public.slugify_product_name(new.name), 'product');
    candidate_slug := base_slug;

    while exists (
      select 1
      from public.products
      where slug = candidate_slug
        and id is distinct from new.id
    ) loop
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    end loop;

    new.slug := candidate_slug;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_product_slug_before_write on public.products;
create trigger assign_product_slug_before_write
before insert or update of name, slug on public.products
for each row execute function public.assign_product_slug();

do $$
declare
  product_record record;
begin
  for product_record in select id from public.products where slug is null or btrim(slug) = '' loop
    update public.products set slug = null where id = product_record.id;
  end loop;
end;
$$;

alter table public.products
  alter column slug set not null;

create unique index if not exists products_slug_unique_idx
  on public.products (slug);

notify pgrst, 'reload schema';
