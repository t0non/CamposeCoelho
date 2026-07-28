-- ============================================================
-- 20260727310000_fix_checkout_ownership_seller_address_12b.sql
-- BLOCO 12B — CORREÇÕES CRÍTICAS (não editar 20260727300000)
-- ============================================================
-- Problemas corrigidos:
--
-- 1. IDEMPOTÊNCIA/OWNERSHIP: o fast-path por idempotency_key checava apenas
--    profile_id. Passa a exigir profile_id E company_id coincidentes antes
--    de devolver qualquer dado do pedido existente; caso contrário retorna
--    conflito seguro (IDEMPOTENCY_KEY_CONFLICT), sem vazar order_id/número/
--    valores de outro cliente ou empresa.
--
-- 2. CHECKOUT SELLER: orders.profile_id representa o COMPRADOR (usado nas
--    RLS "profile_id = auth.uid()" para o cliente ler seu próprio pedido).
--    Gravar o profile_id do seller ali o transformaria no "comprador" do
--    pedido, o que é factualmente incorreto. Como a Etapa 14 ainda não
--    define comprador/placed_by/contexto de empresa para o vendedor, o
--    checkout de seller é BLOQUEADO explicitamente neste bloco.
--
-- 3. ENDEREÇO: shipping_address_id passa a exigir company_id = empresa do
--    checkout, além de profile_id do próprio cliente — impede endereço de
--    uma empresa ser usado no checkout de outra.
-- ============================================================

CREATE OR REPLACE FUNCTION public.checkout_atomic(
  p_idempotency_key    uuid,
  p_shipping_address_id uuid,
  p_target_company_id  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id       uuid;
  v_role          text;
  v_company_id    uuid;
  v_cart_id       uuid;
  v_cart_status   text;
  v_item_count    integer;
  v_address       record;
  v_existing      record;

  v_arr_product_id   uuid[]    := '{}';
  v_arr_variant_id    uuid[]    := '{}';
  v_arr_product_name  text[]    := '{}';
  v_arr_product_sku   text[]    := '{}';
  v_arr_variant_name  text[]    := '{}';
  v_arr_variant_sku   text[]    := '{}';
  v_arr_quantity      integer[] := '{}';
  v_arr_unit_price    numeric[] := '{}';
  v_arr_promo_price   numeric[] := '{}';
  v_arr_line_total    numeric[] := '{}';
  v_arr_min_qty       integer[] := '{}';
  v_arr_inv_id        uuid[]    := '{}';

  v_ci            record;
  v_product       record;
  v_variant_active     boolean;
  v_variant_product_id uuid;
  v_variant_name        text;
  v_variant_sku         text;
  v_price         record;
  v_inv           record;
  v_inv_avail     integer;
  v_inv_reserved  integer;

  v_subtotal      numeric := 0;
  v_discount      numeric := 0;
  v_shipping_cost numeric := 0;
  v_total         numeric := 0;

  v_order_id      uuid;
  v_order_number  text;
  v_price_table_id uuid;
  v_i             integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED');
  END IF;

  IF p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REQUIRED');
  END IF;
  IF p_shipping_address_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'ADDRESS_REQUIRED');
  END IF;

  -- ── Resolver role e empresa ANTES do fast-path de idempotência: o
  -- ownership da chave exige company_id conhecido. ──
  SELECT p.role::text, p.company_id
  INTO v_role, v_company_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- BLOCO 12B: checkout de vendedor fica para a Etapa 14, quando comprador,
  -- placed_by e contexto de empresa forem definidos. orders.profile_id
  -- representa o comprador — jamais o vendedor.
  IF v_role = 'seller' THEN
    RETURN jsonb_build_object('success', false, 'code', 'SELLER_CHECKOUT_NOT_SUPPORTED');
  ELSIF v_role = 'customer' THEN
    IF p_target_company_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id AND c.status = 'approved' AND c.price_table_id IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('success', false, 'code', 'COMPANY_NOT_ELIGIBLE');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
  END IF;

  -- ── FAST PATH: retry/duplo clique com a mesma idempotency key.
  -- Só retorna dados do pedido quando profile_id E company_id coincidem
  -- com o contexto atual — nunca por coincidência isolada da chave. ──
  SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.shipping_cost, o.total,
         o.profile_id, o.company_id
    INTO v_existing
  FROM public.orders o
  WHERE o.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.profile_id IS DISTINCT FROM v_user_id
       OR v_existing.company_id IS DISTINCT FROM v_company_id THEN
      RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_CONFLICT');
    END IF;
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true,
      'order_id', v_existing.id, 'order_number', v_existing.order_number,
      'status', v_existing.status, 'subtotal', v_existing.subtotal,
      'discount', v_existing.discount, 'shipping_cost', v_existing.shipping_cost,
      'total', v_existing.total
    );
  END IF;

  SELECT c.price_table_id INTO v_price_table_id FROM public.companies c WHERE c.id = v_company_id;

  -- ── Validar endereço: precisa pertencer ao MESMO profile E à MESMA
  -- empresa do checkout — nunca endereço de outra empresa. ──
  SELECT a.id, a.label, a.zip_code, a.street, a.number, a.complement, a.neighborhood, a.city, a.state
    INTO v_address
  FROM public.addresses a
  WHERE a.id = p_shipping_address_id
    AND a.profile_id = v_user_id
    AND a.company_id = v_company_id;

  IF v_address.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'ADDRESS_NOT_FOUND');
  END IF;

  -- ── Localizar carrinho ativo ──
  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE profile_id = v_user_id AND company_id = v_company_id AND status = 'active';

  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMPTY_CART');
  END IF;

  -- LOCK do carrinho: serializa checkouts concorrentes do mesmo carrinho
  SELECT status INTO v_cart_status FROM public.carts WHERE id = v_cart_id FOR UPDATE;

  IF v_cart_status IS DISTINCT FROM 'active' THEN
    SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.shipping_cost, o.total,
           o.profile_id, o.company_id
      INTO v_existing
    FROM public.orders o
    WHERE o.idempotency_key = p_idempotency_key;

    IF v_existing.id IS NOT NULL
       AND v_existing.profile_id = v_user_id
       AND v_existing.company_id = v_company_id THEN
      RETURN jsonb_build_object(
        'success', true, 'idempotent', true,
        'order_id', v_existing.id, 'order_number', v_existing.order_number,
        'status', v_existing.status, 'subtotal', v_existing.subtotal,
        'discount', v_existing.discount, 'shipping_cost', v_existing.shipping_cost,
        'total', v_existing.total
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'code', 'EMPTY_CART');
  END IF;

  SELECT count(*) INTO v_item_count FROM public.cart_items WHERE cart_id = v_cart_id;
  IF v_item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMPTY_CART');
  END IF;

  FOR v_ci IN
    SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity
    FROM public.cart_items ci
    WHERE ci.cart_id = v_cart_id
    ORDER BY ci.product_id, ci.variant_id
  LOOP
    SELECT id, is_active, is_published, min_quantity, multiple_quantity, name, sku
    INTO v_product
    FROM public.products
    WHERE id = v_ci.product_id;

    IF v_product.id IS NULL OR NOT v_product.is_active OR NOT v_product.is_published THEN
      RETURN jsonb_build_object('success', false, 'code', 'PRODUCT_UNAVAILABLE',
        'product_id', v_ci.product_id);
    END IF;

    v_variant_active := NULL;
    v_variant_product_id := NULL;
    v_variant_name := NULL;
    v_variant_sku := NULL;

    IF v_ci.variant_id IS NOT NULL THEN
      SELECT is_active, product_id, name, sku
      INTO v_variant_active, v_variant_product_id, v_variant_name, v_variant_sku
      FROM public.product_variants
      WHERE id = v_ci.variant_id;

      IF v_variant_active IS NULL OR NOT v_variant_active
         OR v_variant_product_id IS DISTINCT FROM v_ci.product_id THEN
        RETURN jsonb_build_object('success', false, 'code', 'VARIANT_INVALID',
          'product_id', v_ci.product_id);
      END IF;
    END IF;

    IF v_ci.quantity < v_product.min_quantity THEN
      RETURN jsonb_build_object('success', false, 'code', 'BELOW_MIN_QUANTITY',
        'product_id', v_ci.product_id, 'min_quantity', v_product.min_quantity);
    END IF;
    IF v_product.multiple_quantity IS NOT NULL AND v_product.multiple_quantity > 1
       AND (v_ci.quantity % v_product.multiple_quantity) <> 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_MULTIPLE',
        'product_id', v_ci.product_id, 'multiple_quantity', v_product.multiple_quantity);
    END IF;

    SELECT * INTO v_price
    FROM public.resolve_cart_price_canonical(v_company_id, v_ci.product_id, v_ci.variant_id, v_ci.quantity);

    IF v_price IS NULL OR v_price.effective_price IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'NO_PRICE_AVAILABLE',
        'product_id', v_ci.product_id);
    END IF;

    SELECT id, quantity_available, quantity_reserved
    INTO v_inv
    FROM public.inventories
    WHERE product_id = v_ci.product_id AND variant_id IS NOT DISTINCT FROM v_ci.variant_id
    FOR UPDATE;

    v_inv_avail := COALESCE(v_inv.quantity_available, 0);
    v_inv_reserved := COALESCE(v_inv.quantity_reserved, 0);

    IF (v_inv_avail - v_inv_reserved) < v_ci.quantity THEN
      RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_STOCK',
        'product_id', v_ci.product_id, 'available', v_inv_avail - v_inv_reserved);
    END IF;

    v_subtotal := v_subtotal + ROUND(v_price.effective_price * v_ci.quantity, 2);

    v_arr_product_id  := array_append(v_arr_product_id, v_ci.product_id);
    v_arr_variant_id  := array_append(v_arr_variant_id, v_ci.variant_id);
    v_arr_product_name:= array_append(v_arr_product_name, v_product.name);
    v_arr_product_sku := array_append(v_arr_product_sku, v_product.sku);
    v_arr_variant_name:= array_append(v_arr_variant_name, v_variant_name);
    v_arr_variant_sku := array_append(v_arr_variant_sku, v_variant_sku);
    v_arr_quantity    := array_append(v_arr_quantity, v_ci.quantity);
    v_arr_unit_price  := array_append(v_arr_unit_price, v_price.effective_price);
    v_arr_promo_price := array_append(v_arr_promo_price,
      CASE WHEN v_price.is_on_promotion THEN v_price.promotional_price ELSE NULL END);
    v_arr_line_total  := array_append(v_arr_line_total, ROUND(v_price.effective_price * v_ci.quantity, 2));
    v_arr_min_qty     := array_append(v_arr_min_qty, v_price.applied_min_qty);
    v_arr_inv_id      := array_append(v_arr_inv_id, v_inv.id);
  END LOOP;

  v_total := v_subtotal - v_discount + v_shipping_cost;

  BEGIN
    INSERT INTO public.orders (
      company_id, profile_id, seller_id, status,
      shipping_address_id, shipping_address_snapshot,
      subtotal, discount, shipping_cost, total,
      idempotency_key
    ) VALUES (
      v_company_id, v_user_id, NULL, 'pending',
      p_shipping_address_id,
      jsonb_build_object(
        'label', v_address.label, 'zip_code', v_address.zip_code, 'street', v_address.street,
        'number', v_address.number, 'complement', v_address.complement,
        'neighborhood', v_address.neighborhood, 'city', v_address.city, 'state', v_address.state
      ),
      v_subtotal, v_discount, v_shipping_cost, v_total,
      p_idempotency_key
    )
    RETURNING id, order_number INTO v_order_id, v_order_number;
  EXCEPTION WHEN unique_violation THEN
    SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.shipping_cost, o.total,
           o.profile_id, o.company_id
      INTO v_existing
    FROM public.orders o
    WHERE o.idempotency_key = p_idempotency_key;

    IF v_existing.id IS NOT NULL
       AND v_existing.profile_id = v_user_id
       AND v_existing.company_id = v_company_id THEN
      RETURN jsonb_build_object(
        'success', true, 'idempotent', true,
        'order_id', v_existing.id, 'order_number', v_existing.order_number,
        'status', v_existing.status, 'subtotal', v_existing.subtotal,
        'discount', v_existing.discount, 'shipping_cost', v_existing.shipping_cost,
        'total', v_existing.total
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_CONFLICT');
  END;

  FOR v_i IN 1..array_length(v_arr_product_id, 1) LOOP
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, quantity, unit_price, total_price,
      product_name, product_sku, variant_name, variant_sku,
      promotional_price, price_table_id, min_quantity_applied
    ) VALUES (
      v_order_id, v_arr_product_id[v_i], v_arr_variant_id[v_i], v_arr_quantity[v_i],
      v_arr_unit_price[v_i], v_arr_line_total[v_i],
      v_arr_product_name[v_i], v_arr_product_sku[v_i], v_arr_variant_name[v_i], v_arr_variant_sku[v_i],
      v_arr_promo_price[v_i], v_price_table_id, v_arr_min_qty[v_i]
    );
  END LOOP;

  FOR v_i IN 1..array_length(v_arr_inv_id, 1) LOOP
    UPDATE public.inventories
    SET quantity_reserved = quantity_reserved + v_arr_quantity[v_i]
    WHERE id = v_arr_inv_id[v_i];
  END LOOP;

  INSERT INTO public.order_status_history (order_id, status, notes, created_by)
  VALUES (v_order_id, 'pending', 'Pedido criado via checkout atômico.', v_user_id);

  UPDATE public.carts SET status = 'converted', updated_at = now() WHERE id = v_cart_id;

  RETURN jsonb_build_object(
    'success', true, 'idempotent', false,
    'order_id', v_order_id, 'order_number', v_order_number,
    'status', 'pending', 'subtotal', v_subtotal, 'discount', v_discount,
    'shipping_cost', v_shipping_cost, 'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checkout_atomic(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_atomic(uuid, uuid, uuid) TO authenticated, service_role;
