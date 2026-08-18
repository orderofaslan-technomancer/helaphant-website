-- Run once in the Supabase SQL Editor before publishing the product visibility switch.

alter table public.products
  add column if not exists is_active boolean not null default true;

-- Existing products should remain visible unless Helaphant intentionally hides them.
update public.products set is_active = true where is_active is null;

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
  v_is_active boolean;
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

    select inventory_count, is_active into v_inventory, v_is_active
    from products where id = v_product_id for update;
    if not found or not v_is_active then
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
