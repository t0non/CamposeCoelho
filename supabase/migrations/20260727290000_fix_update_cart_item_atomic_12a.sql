-- ============================================================
-- 20260727290000_fix_update_cart_item_atomic_12a.sql
-- BLOCO 12A — CORREÇÃO (não editar migrations anteriores)
-- ============================================================
-- Problema factual detectado no banco (Local/Remote):
--   update_cart_item_atomic() falha com
--   "record \"v_product\" is not assigned yet" (SQLSTATE 55000).
--   O primeiro SELECT ... INTO grava em `v_product.id`, ou seja, num campo
--   de um RECORD ainda não atribuído — o que o PL/pgSQL não permite.
--
-- Correção: usar uma variável escalar `v_product_id uuid` para carregar o
-- product_id do item; o RECORD `v_product` só é atribuído depois, ao ler a
-- linha de products. Nenhuma regra de negócio, assinatura, retorno ou
-- segurança é alterada. Grants preservados (reafirmados por robustez).
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_cart_item_atomic(
  p_item_id  uuid,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id      uuid;
  v_role         text;
  v_company_id   uuid;
  v_cart_id      uuid;
  v_current_qty  integer;
  v_product_id   uuid;
  v_product      record;
  v_variant_id   uuid;
  v_price        record;
  v_inv_avail    integer;
  v_inv_reserved integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED');
  END IF;

  -- Validar quantidade: positivo, não zero (zero = usar remove)
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_QUANTITY');
  END IF;
  IF p_quantity > 2147483647 THEN
    RETURN jsonb_build_object('success', false, 'code', 'QUANTITY_OVERFLOW');
  END IF;

  -- Resolver role e empresa
  SELECT p.role::text, p.company_id
  INTO v_role, v_company_id
  FROM public.profiles p WHERE p.id = v_user_id;

  IF v_role NOT IN ('customer', 'seller') THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  -- Localizar item e carrinho (sem revelar existência se alheio)
  SELECT ci.cart_id, ci.quantity, ci.product_id, ci.variant_id, ct.company_id
  INTO v_cart_id, v_current_qty, v_product_id, v_variant_id, v_company_id
  FROM public.cart_items ci
  JOIN public.carts ct ON ct.id = ci.cart_id
  WHERE ci.id = p_item_id
    AND ct.profile_id = v_user_id
    AND ct.status = 'active';

  IF v_cart_id IS NULL THEN
    -- No-op silencioso: item não encontrado ou alheio
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  -- Para seller: verificar carteira
  IF v_role = 'seller' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id AND c.seller_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'changed', false);
    END IF;
  END IF;

  -- No-op: mesma quantidade
  IF p_quantity = v_current_qty THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  -- LOCK do carrinho e item
  PERFORM id FROM public.carts WHERE id = v_cart_id FOR UPDATE;
  PERFORM id FROM public.cart_items WHERE id = p_item_id FOR UPDATE;

  -- Validar produto e variante
  SELECT pr.id, pr.is_active, pr.is_published, pr.min_quantity, pr.multiple_quantity
  INTO v_product
  FROM public.products pr WHERE pr.id = v_product_id;

  IF NOT v_product.is_active OR NOT v_product.is_published THEN
    RETURN jsonb_build_object('success', false, 'code', 'PRODUCT_UNAVAILABLE');
  END IF;

  IF v_variant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.product_variants WHERE id = v_variant_id AND is_active = true) THEN
      RETURN jsonb_build_object('success', false, 'code', 'VARIANT_INACTIVE');
    END IF;
  END IF;

  -- Validar min_quantity e multiple_quantity para a nova quantidade
  IF p_quantity < v_product.min_quantity THEN
    RETURN jsonb_build_object('success', false, 'code', 'BELOW_MIN_QUANTITY',
      'min_quantity', v_product.min_quantity);
  END IF;

  IF v_product.multiple_quantity IS NOT NULL AND v_product.multiple_quantity > 1
     AND (p_quantity % v_product.multiple_quantity) <> 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MULTIPLE',
      'multiple_quantity', v_product.multiple_quantity);
  END IF;

  -- Resolver preço para a nova quantidade
  SELECT * INTO v_price
  FROM public.resolve_cart_price_canonical(v_company_id, v_product_id, v_variant_id, p_quantity);

  IF v_price IS NULL OR v_price.effective_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_PRICE_AVAILABLE');
  END IF;

  -- Estoque utilizável
  SELECT COALESCE(inv.quantity_available, 0), COALESCE(inv.quantity_reserved, 0)
  INTO v_inv_avail, v_inv_reserved
  FROM public.inventories inv
  WHERE inv.product_id = v_product_id AND inv.variant_id IS NOT DISTINCT FROM v_variant_id
  LIMIT 1;

  IF (v_inv_avail - v_inv_reserved) < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_STOCK',
      'available', v_inv_avail - v_inv_reserved);
  END IF;

  UPDATE public.cart_items SET quantity = p_quantity, updated_at = now()
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true, 'changed', true, 'quantity', p_quantity);
END;
$$;

REVOKE ALL ON FUNCTION public.update_cart_item_atomic(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_cart_item_atomic(uuid, integer) TO authenticated, service_role;
