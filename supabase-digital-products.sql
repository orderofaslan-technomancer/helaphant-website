-- Run once in the Supabase SQL Editor before publishing digital-product checkout.

alter table public.products
  add column if not exists is_digital boolean not null default false,
  add column if not exists digital_file_path text;

insert into storage.buckets (id, name, public)
values ('digital-downloads', 'digital-downloads', false)
on conflict (id) do update set public = false;

drop policy if exists "Authenticated users can manage digital downloads" on storage.objects;
create policy "Authenticated users can manage digital downloads"
on storage.objects
for all
to authenticated
using (bucket_id = 'digital-downloads')
with check (bucket_id = 'digital-downloads');
