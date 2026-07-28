-- ============================================================
-- 20260727300000_checkout_atomic_12b.sql
-- BLOCO 12B: Checkout Atômico e Criação de Pedido
-- ============================================================

-- ============================================================
-- 1. IDEMPOTÊNCIA: chave única em orders
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.orders
  ADD CONSTRAINT orders_idempotency_key_unique UNIQUE (idempotency_key);

-- ============================================================
-- 2. SNAPSHOT DE ENDEREÇO em orders (não depender apenas da FK)
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_address_snapshot jsonb;

-- ============================================================
-- 3. SNAPSHOT DE ITEM em order_items (não depender apenas de FKs)
-- ============================================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS variant_name text,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS promotional_price numeric,
  ADD COLUMN IF NOT EXISTS price_table_id uuid REFERENCES public.price_tables(id),
  ADD COLUMN IF NOT EXISTS min_quantity_applied integer;

-- ============================================================
-- 4. ENDURECIMENTO: bloquear DML direto de authenticated
-- Mesma lógica do BLOCO 12A: mutações só através da RPC atômica.
-- SELECT permanece via as policies já existentes (leitura do próprio
-- pedido), preservando o fluxo de confirmação/consulta.
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_status_history FROM authenticated;

-- ============================================================
-- 5. RPC: checkout_atomic
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

  -- acumuladores paralelos das linhas validadas (uma entrada por cart_item)
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

  -- ── FAST PATH: retry/duplo clique com a mesma idempotency key ──
  SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.shipping_cost, o.total, o.profile_id
    INTO v_existing
  FROM public.orders o
  WHERE o.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.profile_id IS DISTINCT FROM v_user_id THEN
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

  -- ── Resolver role e empresa (mesmo padrão do carrinho) ──
  SELECT p.role::text, p.company_id
  INTO v_role, v_company_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_role = 'customer' THEN
    IF p_target_company_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id AND c.status = 'approved' AND c.price_table_id IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('success', false, 'code', 'COMPANY_NOT_ELIGIBLE');
    END IF;
  ELSIF v_role = 'seller' THEN
    IF p_target_company_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'TARGET_COMPANY_REQUIRED');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = p_target_company_id AND c.seller_id = v_user_id
        AND c.status = 'approved' AND c.price_table_id IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
    END IF;
    v_company_id := p_target_company_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
  END IF;

  SELECT c.price_table_id INTO v_price_table_id FROM public.companies c WHERE c.id = v_company_id;

  -- ── Validar endereço (sempre do próprio profile) ──
  SELECT a.id, a.label, a.zip_code, a.street, a.number, a.complement, a.neighborhood, a.city, a.state
    INTO v_address
  FROM public.addresses a
  WHERE a.id = p_shipping_address_id
    AND a.profile_id = v_user_id;

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
    -- Concorrência: outra chamada já converteu este carrinho. Reconferir
    -- a idempotency key (agora visível, pois a outra transação committou).
    SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.shipping_cost, o.total, o.profile_id
      INTO v_existing
    FROM public.orders o
    WHERE o.idempotency_key = p_idempotency_key;

    IF v_existing.id IS NOT NULL AND v_existing.profile_id = v_user_id THEN
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

  -- ── Revalidar cada item, na MESMA ordem determinística usada para o
  -- lock de estoque (product_id, variant_id), evitando deadlocks entre
  -- checkouts concorrentes que compartilham produtos. ──
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

    -- Mesma lógica canônica de preço usada pelo carrinho
    SELECT * INTO v_price
    FROM public.resolve_cart_price_canonical(v_company_id, v_ci.product_id, v_ci.variant_id, v_ci.quantity);

    IF v_price IS NULL OR v_price.effective_price IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'NO_PRICE_AVAILABLE',
        'product_id', v_ci.product_id);
    END IF;

    -- LOCK determinístico da linha de estoque (ordem já garantida pelo cursor)
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

  -- ── Criar o pedido (order_number gerado pelo default da tabela, seguro
  -- sob concorrência via nextval de sequência — nunca count(*)+1) ──
  BEGIN
    INSERT INTO public.orders (
      company_id, profile_id, seller_id, status,
      shipping_address_id, shipping_address_snapshot,
      subtotal, discount, shipping_cost, total,
      idempotency_key
    ) VALUES (
      v_company_id, v_user_id, CASE WHEN v_role = 'seller' THEN v_user_id ELSE NULL END, 'pending',
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
    -- Colisão de idempotency key sob concorrência real: a outra transação
    -- venceu e já commitou. Retornar o pedido dela em vez de duplicar.
    SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.shipping_cost, o.total, o.profile_id
      INTO v_existing
    FROM public.orders o
    WHERE o.idempotency_key = p_idempotency_key;

    IF v_existing.id IS NOT NULL AND v_existing.profile_id = v_user_id THEN
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

  -- ── Itens do pedido (snapshot completo) ──
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

  -- ── Reservar estoque: somente quantity_reserved aumenta; available
  -- permanece intocado nesta etapa. ──
  FOR v_i IN 1..array_length(v_arr_inv_id, 1) LOOP
    UPDATE public.inventories
    SET quantity_reserved = quantity_reserved + v_arr_quantity[v_i]
    WHERE id = v_arr_inv_id[v_i];
  END LOOP;

  -- ── Histórico: exatamente uma linha inicial ──
  INSERT INTO public.order_status_history (order_id, status, notes, created_by)
  VALUES (v_order_id, 'pending', 'Pedido criado via checkout atômico.', v_user_id);

  -- ── Converter o carrinho ──
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
