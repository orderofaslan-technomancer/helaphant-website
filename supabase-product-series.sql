-- Run once in the Supabase SQL Editor before publishing product series headings.

alter table public.products
  add column if not exists series text;
