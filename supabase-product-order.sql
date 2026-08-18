-- Run once in the Supabase SQL Editor before publishing drag-and-drop product ordering.

alter table public.products
  add column if not exists sort_order integer;

with numbered_products as (
  select id, row_number() over (order by id) * 1000 as new_sort_order
  from public.products
)
update public.products
set sort_order = numbered_products.new_sort_order
from numbered_products
where public.products.id = numbered_products.id
  and public.products.sort_order is null;
