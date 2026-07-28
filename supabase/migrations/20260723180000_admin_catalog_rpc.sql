-- Migration: Additive RPC for atomic inventory adjustments and audit logging
-- Created for Bloco 11D

CREATE OR REPLACE FUNCTION public.adjust_inventory_atomic(
  p_inventory_id UUID,
  p_quantity_delta INTEGER,
  p_movement_type TEXT,
  p_reason TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_inv RECORD;
  v_prev_qty INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- 1. Obter usuário autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 2. Confirmar que é admin
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ajustar estoque';
  END IF;

  -- 3. Bloquear linha de estoque com FOR UPDATE para concorrência atômica
  SELECT * INTO v_inv
  FROM public.inventories
  WHERE id = p_inventory_id
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Registro de estoque não encontrado';
  END IF;

  v_prev_qty := v_inv.quantity_available;
  v_new_qty := v_prev_qty + p_quantity_delta;

  -- 3b. Validar tipo de movimentação de acordo com constraint inventory_movements_type_valid
  IF p_movement_type NOT IN ('adjustment', 'reservation', 'release', 'sale', 'return') THEN
    RAISE EXCEPTION 'Tipo de movimentação inválido: % (Permitidos: adjustment, reservation, release, sale, return)', p_movement_type;
  END IF;

  -- 4. Impedir estoque negativo
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Estoque disponível não pode ser negativo (Atual: %, Delta: %)', v_prev_qty, p_quantity_delta;
  END IF;

  -- 5. Impedir reservado maior que disponível
  IF v_inv.quantity_reserved > v_new_qty THEN
    RAISE EXCEPTION 'Estoque disponível (%) não pode ser menor que o estoque reservado (%)', v_new_qty, v_inv.quantity_reserved;
  END IF;

  -- 6. Atualizar estoque
  UPDATE public.inventories
  SET quantity_available = v_new_qty,
      updated_at = NOW()
  WHERE id = p_inventory_id;

  -- 7. Registrar movimentação de estoque com campos exatos do schema
  INSERT INTO public.inventory_movements (
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
  ) VALUES (
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
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_table,
    target_id,
    payload
  ) VALUES (
    v_user_id,
    'INVENTORY_ADJUSTED',
    'inventories',
    p_inventory_id,
    jsonb_build_object(
      'quantity_delta', p_quantity_delta,
      'previous_quantity', v_prev_qty,
      'new_quantity', v_new_qty,
      'reason', p_reason,
      'movement_type', p_movement_type
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'inventory_id', p_inventory_id,
    'previous_quantity', v_prev_qty,
    'new_quantity', v_new_qty
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_inventory_atomic TO authenticated;
