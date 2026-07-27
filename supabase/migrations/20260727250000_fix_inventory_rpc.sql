-- ============================================================
-- MIGRATION: Fix adjust_inventory_manual_atomic and RPC Grants
-- Timestamp: 20260727250000
-- ============================================================

-- 1. Recriar adjust_inventory_manual_atomic usando btrim
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

  if p_reason is null or pg_catalog.length(pg_catalog.btrim(p_reason)) = 0 then
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

-- 2. Conceder permissões para service_role
grant execute on function public.adjust_inventory_atomic(uuid, integer, text, text, text, uuid) to service_role;
grant execute on function public.adjust_inventory_manual_atomic(uuid, integer, text, text) to service_role;

grant execute on function public.create_price_table_atomic(text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.update_price_table_atomic(uuid, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.set_price_table_status_atomic(uuid, boolean) to service_role;
grant execute on function public.upsert_price_entry_atomic(uuid, uuid, uuid, integer, numeric, numeric, timestamptz, timestamptz) to service_role;
grant execute on function public.set_price_entry_status_atomic(uuid, boolean) to service_role;
