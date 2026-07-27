-- ============================================================
-- MIGRATION: Harden adjust_inventory_atomic & adjust_inventory_manual_atomic
-- Timestamp: 20260727230000
-- ============================================================

-- 1. Redefinir adjust_inventory_atomic com segurança total (SET search_path = '')
create or replace function public.adjust_inventory_atomic(
  p_inventory_id uuid,
  p_quantity_delta integer,
  p_movement_type text,
  p_reason text default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_inv record;
  v_prev_qty integer;
  v_new_qty integer;
begin
  -- 1. Obter usuário autenticado
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  -- 2. Confirmar que é admin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem ajustar estoque';
  end if;

  -- 3. Bloquear linha de estoque com FOR UPDATE para concorrência atômica
  select * into v_inv
  from public.inventories
  where id = p_inventory_id
  for update;

  if v_inv.id is null then
    raise exception 'Registro de estoque não encontrado';
  end if;

  v_prev_qty := v_inv.quantity_available;
  v_new_qty := v_prev_qty + p_quantity_delta;

  -- 3b. Validar tipo de movimentação de acordo com constraint
  if p_movement_type not in ('adjustment', 'reservation', 'release', 'sale', 'return') then
    raise exception 'Tipo de movimentação inválido: % (Permitidos: adjustment, reservation, release, sale, return)', p_movement_type;
  end if;

  -- 4. Impedir estoque negativo
  if v_new_qty < 0 then
    raise exception 'Estoque disponível não pode ser negativo (Atual: %, Delta: %)', v_prev_qty, p_quantity_delta;
  end if;

  -- 5. Impedir reservado maior que disponível
  if v_inv.quantity_reserved > v_new_qty then
    raise exception 'Estoque disponível (%) não pode ser menor que o estoque reservado (%)', v_new_qty, v_inv.quantity_reserved;
  end if;

  -- No-op check (se delta for zero, mas delta zero é rejeitado por Zod/Action/RPC)
  if p_quantity_delta = 0 then
    return jsonb_build_object('success', true, 'inventory_id', p_inventory_id, 'no_op', true);
  end if;

  -- 6. Atualizar estoque
  update public.inventories
  set quantity_available = v_new_qty,
      updated_at = pg_catalog.now()
  where id = p_inventory_id;

  -- 7. Registrar movimentação de estoque
  insert into public.inventory_movements (
    inventory_id,
    variant_id,
    actor_id,
    movement_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    reason,
    reference_type,
    reference_id
  ) values (
    p_inventory_id,
    v_inv.variant_id,
    v_user_id,
    p_movement_type,
    p_quantity_delta,
    v_prev_qty,
    v_new_qty,
    p_reason,
    p_reference_type,
    p_reference_id
  );

  -- 8. Registrar log de auditoria imutável
  insert into public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) values (
    v_user_id,
    'INVENTORY_ADJUSTED',
    'inventories',
    p_inventory_id,
    pg_catalog.jsonb_build_object(
      'quantity_delta', p_quantity_delta,
      'previous_quantity', v_prev_qty,
      'new_quantity', v_new_qty,
      'reason', p_reason,
      'movement_type', p_movement_type
    )
  );

  return pg_catalog.jsonb_build_object(
    'success', true,
    'inventory_id', p_inventory_id,
    'previous_quantity', v_prev_qty,
    'new_quantity', v_new_qty
  );
end;
$$;

-- Restringir RPC Geral: revogar execute de PUBLIC, anon e authenticated
revoke execute on function public.adjust_inventory_atomic(uuid, integer, text, text, text, uuid) from public, anon, authenticated;

-- ============================================================
-- RPC: adjust_inventory_manual_atomic (Wrapper Administrativo Público)
-- ============================================================
create or replace function public.adjust_inventory_manual_atomic(
  p_inventory_id uuid,
  p_quantity_delta integer,
  p_movement_type text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  -- Validações do Wrapper manual
  if p_quantity_delta = 0 then
    raise exception 'Delta de quantidade não pode ser zero';
  end if;

  if p_reason is null or pg_catalog.length(pg_catalog.trim(p_reason)) = 0 then
    raise exception 'Motivo do ajuste é obrigatório';
  end if;

  -- Allowlist de tipos manuais
  if p_movement_type not in ('adjustment', 'return') then
    raise exception 'Operação não permitida via painel administrativo';
  end if;

  -- Return deve ter delta positivo (devolução manual)
  if p_movement_type = 'return' and p_quantity_delta <= 0 then
    raise exception 'Devolução deve possuir saldo positivo';
  end if;

  -- Chamar o núcleo interno
  return public.adjust_inventory_atomic(
    p_inventory_id => p_inventory_id,
    p_quantity_delta => p_quantity_delta,
    p_movement_type => p_movement_type,
    p_reason => p_reason,
    p_reference_type => 'manual',
    p_reference_id => null
  );
end;
$$;

revoke execute on function public.adjust_inventory_manual_atomic(uuid, integer, text, text) from public, anon;
grant execute on function public.adjust_inventory_manual_atomic(uuid, integer, text, text) to authenticated;
