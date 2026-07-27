-- ============================================================
-- MIGRATION: Price Constraints and Atomic RPCs
-- Timestamp: 20260727220000
-- ============================================================

-- 1. Substituir constraint para garantir promotional_price < unit_price
alter table public.price_table_products
  drop constraint if exists price_table_products_promo_lte_unit;

alter table public.price_table_products
  add constraint price_table_products_promo_lt_unit
    check (
      promotional_price is null
      or promotional_price < unit_price
    );

-- 2. Adicionar checks de coerência temporal
alter table public.price_tables
  drop constraint if exists price_tables_date_coherence;

alter table public.price_tables
  add constraint price_tables_date_coherence
    check (
      ends_at is null
      or starts_at is null
      or ends_at > starts_at
    );

alter table public.price_table_products
  drop constraint if exists price_table_products_date_coherence;

alter table public.price_table_products
  add constraint price_table_products_date_coherence
    check (
      promotion_ends_at is null
      or promotion_starts_at is null
      or promotion_ends_at > promotion_starts_at
    );

-- ============================================================
-- RPC: create_price_table_atomic
-- ============================================================
create or replace function public.create_price_table_atomic(
  p_name text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_new_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  -- Validações de data
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'A data de término deve ser posterior à data de início';
  end if;

  insert into public.price_tables (
    name,
    description,
    starts_at,
    ends_at,
    is_default,
    is_active
  ) values (
    p_name,
    p_description,
    p_starts_at,
    p_ends_at,
    false,
    true
  )
  returning id into v_new_id;

  -- Registrar audit log
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_user_id,
    'PRICE_TABLE_CREATED',
    'price_tables',
    v_new_id,
    jsonb_build_object(
      'name', p_name,
      'description', p_description,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    )
  );

  return jsonb_build_object(
    'success', true,
    'id', v_new_id
  );
end;
$$;

revoke execute on function public.create_price_table_atomic(text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.create_price_table_atomic(text, text, timestamptz, timestamptz) to authenticated;

-- ============================================================
-- RPC: update_price_table_atomic
-- ============================================================
create or replace function public.update_price_table_atomic(
  p_id uuid,
  p_name text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_old RECORD;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  -- Validações de data
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'A data de término deve ser posterior à data de início';
  end if;

  select * into v_old
  from public.price_tables
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Tabela de preços não encontrada';
  end if;

  -- No-op check
  if coalesce(v_old.name, '') = coalesce(p_name, '')
     and coalesce(v_old.description, '') = coalesce(p_description, '')
     and (v_old.starts_at is not distinct from p_starts_at)
     and (v_old.ends_at is not distinct from p_ends_at) then
    return jsonb_build_object('success', true, 'no_op', true);
  end if;

  update public.price_tables
  set name = p_name,
      description = p_description,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      updated_at = now()
  where id = p_id;

  -- Registrar audit log
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_user_id,
    'PRICE_TABLE_UPDATED',
    'price_tables',
    p_id,
    jsonb_build_object(
      'name', p_name,
      'description', p_description,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    )
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.update_price_table_atomic(uuid, text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.update_price_table_atomic(uuid, text, text, timestamptz, timestamptz) to authenticated;

-- ============================================================
-- RPC: set_price_table_status_atomic
-- ============================================================
create or replace function public.set_price_table_status_atomic(
  p_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_old_status boolean;
  v_action text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  select is_active into v_old_status
  from public.price_tables
  where id = p_id
  for update;

  if v_old_status is null then
    raise exception 'Tabela de preços não encontrada';
  end if;

  -- No-op check
  if v_old_status = p_is_active then
    return jsonb_build_object('success', true, 'no_op', true);
  end if;

  update public.price_tables
  set is_active = p_is_active,
      updated_at = now()
  where id = p_id;

  if p_is_active then
    v_action := 'PRICE_TABLE_REACTIVATED';
  else
    v_action := 'PRICE_TABLE_DEACTIVATED';
  end if;

  -- Registrar audit log
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_user_id,
    v_action,
    'price_tables',
    p_id,
    jsonb_build_object('is_active', p_is_active)
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.set_price_table_status_atomic(uuid, boolean) from public, anon;
grant execute on function public.set_price_table_status_atomic(uuid, boolean) to authenticated;

-- ============================================================
-- RPC: upsert_price_entry_atomic
-- ============================================================
create or replace function public.upsert_price_entry_atomic(
  p_price_table_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_min_quantity integer,
  p_unit_price numeric,
  p_promotional_price numeric,
  p_promotion_starts_at timestamptz,
  p_promotion_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_existing_id uuid;
  v_existing_active boolean;
  v_existing_unit_price numeric;
  v_existing_promotional_price numeric;
  v_existing_p_starts_at timestamptz;
  v_existing_p_ends_at timestamptz;
  v_ins_id uuid;
  v_is_variant_belong boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  -- Validações de inputs
  if p_min_quantity is null or p_min_quantity <= 0 then
    raise exception 'Quantidade mínima deve ser maior que zero';
  end if;

  if p_unit_price is null or p_unit_price <= 0 then
    raise exception 'Preço unitário deve ser maior que zero';
  end if;

  if p_promotional_price is not null then
    if p_promotional_price <= 0 then
      raise exception 'Preço promocional deve ser maior que zero';
    end if;
    if p_promotional_price >= p_unit_price then
      raise exception 'Preço promocional deve ser menor que o preço normal';
    end if;
  end if;

  if p_promotion_starts_at is not null and p_promotion_ends_at is not null and p_promotion_ends_at <= p_promotion_starts_at then
    raise exception 'A data de término da promoção deve ser posterior à data de início';
  end if;

  -- Validar tabela
  if not exists (select 1 from public.price_tables where id = p_price_table_id) then
    raise exception 'Tabela de preços não encontrada';
  end if;

  -- Validar produto
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produto não encontrado';
  end if;

  -- Validar variante pertence ao produto
  if p_variant_id is not null then
    select exists (
      select 1 from public.product_variants
      where id = p_variant_id and product_id = p_product_id
    ) into v_is_variant_belong;
    if not v_is_variant_belong then
      raise exception 'A variante informada não pertence a este produto';
    end if;
  end if;

  -- Concorrência Determinística: INSERT ON CONFLICT DO NOTHING
  begin
    insert into public.price_table_products (
      price_table_id,
      product_id,
      variant_id,
      min_quantity,
      unit_price,
      promotional_price,
      promotion_starts_at,
      promotion_ends_at,
      is_active
    ) values (
      p_price_table_id,
      p_product_id,
      p_variant_id,
      p_min_quantity,
      p_unit_price,
      p_promotional_price,
      p_promotion_starts_at,
      p_promotion_ends_at,
      true
    )
    returning id into v_ins_id;
  exception
    when unique_violation then
      v_ins_id := null;
  end;

  if v_ins_id is not null then
    -- Operação de inserção com sucesso
    insert into public.audit_logs (
      actor_id,
      action,
      target_table,
      target_id,
      payload
    ) values (
      v_user_id,
      'PRICE_ENTRY_CREATED',
      'price_table_products',
      v_ins_id,
      jsonb_build_object(
        'price_table_id', p_price_table_id,
        'product_id', p_product_id,
        'variant_id', p_variant_id,
        'min_quantity', p_min_quantity,
        'unit_price', p_unit_price,
        'promotional_price', p_promotional_price
      )
    );

    return jsonb_build_object('success', true, 'id', v_ins_id, 'action', 'created');
  end if;

  -- Se não inseriu, localiza a entrada existente e bloqueia via FOR UPDATE
  select id, is_active, unit_price, promotional_price, promotion_starts_at, promotion_ends_at
  into v_existing_id, v_existing_active, v_existing_unit_price, v_existing_promotional_price, v_existing_p_starts_at, v_existing_p_ends_at
  from public.price_table_products
  where price_table_id = p_price_table_id
    and product_id = p_product_id
    and variant_id is not distinct from p_variant_id
    and min_quantity = p_min_quantity
  for update;

  if v_existing_id is null then
    raise exception 'Conflito de concorrência ao buscar entrada de preço';
  end if;

  -- No-op check
  if v_existing_unit_price = p_unit_price
     and (v_existing_promotional_price is not distinct from p_promotional_price)
     and (v_existing_p_starts_at is not distinct from p_promotion_starts_at)
     and (v_existing_p_ends_at is not distinct from p_promotion_ends_at) then
    return jsonb_build_object('success', true, 'id', v_existing_id, 'no_op', true);
  end if;

  -- Atualizar a entrada preservando is_active
  update public.price_table_products
  set unit_price = p_unit_price,
      promotional_price = p_promotional_price,
      promotion_starts_at = p_promotion_starts_at,
      promotion_ends_at = p_promotion_ends_at,
      updated_at = now()
  where id = v_existing_id;

  -- Registrar audit log
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_user_id,
    'PRICE_ENTRY_UPDATED',
    'price_table_products',
    v_existing_id,
    jsonb_build_object(
      'price_table_id', p_price_table_id,
      'product_id', p_product_id,
      'variant_id', p_variant_id,
      'min_quantity', p_min_quantity,
      'unit_price', p_unit_price,
      'promotional_price', p_promotional_price
    )
  );

  return jsonb_build_object('success', true, 'id', v_existing_id, 'action', 'updated');
end;
$$;

revoke execute on function public.upsert_price_entry_atomic(uuid, uuid, uuid, integer, numeric, numeric, timestamptz, timestamptz) from public, anon;
grant execute on function public.upsert_price_entry_atomic(uuid, uuid, uuid, integer, numeric, numeric, timestamptz, timestamptz) to authenticated;

-- ============================================================
-- RPC: set_price_entry_status_atomic
-- ============================================================
create or replace function public.set_price_entry_status_atomic(
  p_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_old_status boolean;
  v_action text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  select is_active into v_old_status
  from public.price_table_products
  where id = p_id
  for update;

  if v_old_status is null then
    raise exception 'Entrada de preço não encontrada';
  end if;

  -- No-op check
  if v_old_status = p_is_active then
    return jsonb_build_object('success', true, 'no_op', true);
  end if;

  update public.price_table_products
  set is_active = p_is_active,
      updated_at = now()
  where id = p_id;

  if p_is_active then
    v_action := 'PRICE_ENTRY_REACTIVATED';
  else
    v_action := 'PRICE_ENTRY_DEACTIVATED';
  end if;

  -- Registrar audit log
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_user_id,
    v_action,
    'price_table_products',
    p_id,
    jsonb_build_object('is_active', p_is_active)
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.set_price_entry_status_atomic(uuid, boolean) from public, anon;
grant execute on function public.set_price_entry_status_atomic(uuid, boolean) to authenticated;
