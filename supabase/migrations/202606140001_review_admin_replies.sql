alter table public.reviews
add column if not exists admin_reply_text text,
add column if not exists admin_reply_date timestamp with time zone;

alter table public.reviews
drop constraint if exists reviews_admin_reply_text_length;

alter table public.reviews
add constraint reviews_admin_reply_text_length
check (admin_reply_text is null or char_length(admin_reply_text) <= 1000);

drop policy if exists "Anyone can submit pending reviews" on public.reviews;
create policy "Anyone can submit pending reviews"
on public.reviews
for insert
to anon, authenticated
with check (
  is_approved = false
  and source = 'customer'
  and admin_reply_text is null
  and admin_reply_date is null
);

notify pgrst, 'reload schema';
