-- Run once in the Supabase SQL Editor before publishing inventory tracking.

alter table public.products
  add column if not exists inventory_count integer check (inventory_count is null or inventory_count >= 0);

create table if not exists public.inventory_holds (
  id uuid primary key,
  status text not null default 'held' check (status in ('held', 'completed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_hold_items (
  hold_id uuid not null references public.inventory_holds(id) on delete cascade,
  product_id bigint not null references public.products(id),
  quantity integer not null check (quantity > 0),
  reserved boolean not null default false,
  primary key (hold_id, product_id)
);

create or replace function public.reserve_inventory_hold(
  p_hold_id uuid,
  p_items jsonb,
  p_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id bigint;
  v_quantity integer;
  v_inventory integer;
  v_reserved boolean;
begin
  insert into inventory_holds (id, expires_at) values (p_hold_id, p_expires_at);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'id')::bigint;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 then
      raise exception 'Invalid inventory quantity';
    end if;

    select inventory_count into v_inventory
    from products where id = v_product_id for update;
    if not found then
      raise exception 'Product % is no longer available', v_product_id;
    end if;

    v_reserved := v_inventory is not null;
    if v_reserved and v_inventory < v_quantity then
      raise exception 'Not enough inventory for product %', v_product_id;
    end if;
    if v_reserved then
      update products set inventory_count = inventory_count - v_quantity where id = v_product_id;
    end if;

    insert into inventory_hold_items (hold_id, product_id, quantity, reserved)
    values (p_hold_id, v_product_id, v_quantity, v_reserved);
  end loop;
end;
$$;

create or replace function public.confirm_inventory_hold(p_hold_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update inventory_holds
  set status = 'completed'
  where id = p_hold_id and status = 'held';
end;
$$;

create or replace function public.release_inventory_hold(p_hold_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_item record;
begin
  select status into v_status from inventory_holds where id = p_hold_id for update;
  if v_status is distinct from 'held' then return; end if;

  for v_item in select * from inventory_hold_items where hold_id = p_hold_id
  loop
    if v_item.reserved then
      update products
      set inventory_count = inventory_count + v_item.quantity
      where id = v_item.product_id;
    end if;
  end loop;

  update inventory_holds set status = 'released' where id = p_hold_id;
end;
$$;

revoke all on function public.reserve_inventory_hold(uuid, jsonb, timestamptz) from public;
revoke all on function public.confirm_inventory_hold(uuid) from public;
revoke all on function public.release_inventory_hold(uuid) from public;
grant execute on function public.reserve_inventory_hold(uuid, jsonb, timestamptz) to service_role;
grant execute on function public.confirm_inventory_hold(uuid) to service_role;
grant execute on function public.release_inventory_hold(uuid) to service_role;
