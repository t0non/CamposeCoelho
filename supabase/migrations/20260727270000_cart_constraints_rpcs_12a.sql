-- ============================================================
-- 20260727270000_cart_constraints_rpcs_12a.sql
-- BLOCO 12A: Carrinho Atômico
-- ============================================================
-- PRÉ-REQUISITO: PG 17.6 (verificado)
-- Colunas de vigência: price_tables.starts_at / ends_at
--                      price_table_products.promotion_starts_at / promotion_ends_at
-- ============================================================

-- ============================================================
-- 1. CHECK constraint de status (somente após auditoria de dados)
-- ============================================================
ALTER TABLE public.carts
  ADD CONSTRAINT carts_status_check
  CHECK (status IN ('active', 'abandoned', 'converted'));

-- ============================================================
-- 2. CHECK: company_id obrigatório em todos os status
-- ============================================================
ALTER TABLE public.carts
  ADD CONSTRAINT carts_company_required
  CHECK (company_id IS NOT NULL);

-- ============================================================
-- 3. UNIQUE INDEX: um carrinho active por (profile_id, company_id)
-- company_id já é NOT NULL por constraint acima
-- ============================================================
CREATE UNIQUE INDEX idx_carts_active_unique
  ON public.carts (profile_id, company_id)
  WHERE status = 'active';

-- ============================================================
-- 4. UNIQUE INDEX: um item por (cart_id, product_id, variant_id)
-- variant_id NULL tratado como a mesma chave (PG17 NULLS NOT DISTINCT)
-- ============================================================
CREATE UNIQUE INDEX idx_cart_items_unique
  ON public.cart_items (cart_id, product_id, variant_id)
  NULLS NOT DISTINCT;

-- ============================================================
-- 5. TRIGGER: sync profile_id em cart_items via carrinho pai
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_cart_item_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cart_profile_id uuid;
BEGIN
  -- Em INSERT: preencher profile_id pelo carrinho pai
  IF TG_OP = 'INSERT' THEN
    SELECT profile_id INTO v_cart_profile_id
    FROM public.carts
    WHERE id = NEW.cart_id;

    IF v_cart_profile_id IS NULL THEN
      RAISE EXCEPTION 'cart_id inválido ou não encontrado';
    END IF;

    -- Ignorar qualquer profile_id vindo de fora
    NEW.profile_id := v_cart_profile_id;
    RETURN NEW;
  END IF;

  -- Em UPDATE: rejeitar qualquer mudança de cart_id ou profile_id
  IF TG_OP = 'UPDATE' THEN
    IF NEW.cart_id IS DISTINCT FROM OLD.cart_id THEN
      RAISE EXCEPTION 'Não é permitido alterar cart_id de um item';
    END IF;
    IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
      RAISE EXCEPTION 'Não é permitido alterar profile_id de um item';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cart_items_sync_profile
  BEFORE INSERT OR UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_cart_item_profile();

-- ============================================================
-- 6. REMOVER policies inseguras (FOR ALL) de carts e cart_items
-- ============================================================
DROP POLICY IF EXISTS "Usuário gerencia próprio carrinho" ON public.carts;
DROP POLICY IF EXISTS "Usuário gerencia itens do seu carrinho" ON public.cart_items;

-- ============================================================
-- 7. REVOGAR DML direto de authenticated em carts e cart_items
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON public.carts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cart_items FROM authenticated;

-- ============================================================
-- 8. POLICIES SELECT estritas para carts
-- ============================================================
-- Customer: só vê o próprio carrinho
CREATE POLICY "Customer lê próprio carrinho"
  ON public.carts FOR SELECT
  USING (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'customer'::public.user_role
    )
  );

-- Seller: só vê SEUS carrinhos (profile_id = auth.uid()) para empresas da própria carteira
CREATE POLICY "Seller lê carrinhos próprios da carteira"
  ON public.carts FOR SELECT
  USING (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'seller'::public.user_role
    )
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = carts.company_id
        AND c.seller_id = auth.uid()
    )
  );

-- ============================================================
-- 9. POLICIES SELECT estritas para cart_items
-- ============================================================
-- Acesso somente se o carrinho pai passar nas policies acima
CREATE POLICY "Usuário lê itens do próprio carrinho"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts ct
      WHERE ct.id = cart_items.cart_id
        AND ct.profile_id = auth.uid()
        AND (
          -- Customer
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'customer'::public.user_role
          )
          OR
          -- Seller (empresa da carteira)
          (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'seller'::public.user_role
            )
            AND EXISTS (
              SELECT 1 FROM public.companies c
              WHERE c.id = ct.company_id AND c.seller_id = auth.uid()
            )
          )
        )
    )
  );

-- ============================================================
-- 10. HELPER INTERNO de preço canônico (não acessível ao authenticated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_cart_price_canonical(
  p_company_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity    integer
)
RETURNS TABLE (
  unit_price        numeric,
  promotional_price numeric,
  effective_price   numeric,
  is_on_promotion   boolean,
  applied_min_qty   integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_price_table_id uuid;
  v_company_status text;
BEGIN
  -- Validar quantidade positiva
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN;
  END IF;

  -- Resolver price_table_id da empresa, confirmando approved
  SELECT c.price_table_id, c.status::text
  INTO v_price_table_id, v_company_status
  FROM public.companies c
  WHERE c.id = p_company_id;

  IF v_company_status IS DISTINCT FROM 'approved' OR v_price_table_id IS NULL THEN
    RETURN;
  END IF;

  -- Confirmar tabela ativa e vigente
  RETURN QUERY
  WITH price_candidates AS (
    -- Prioridade 1: entrada específica da variante
    SELECT
      ptp.unit_price,
      ptp.promotional_price,
      ptp.promotion_starts_at,
      ptp.promotion_ends_at,
      ptp.min_quantity,
      1 AS priority
    FROM public.price_table_products ptp
    JOIN public.price_tables pt ON pt.id = ptp.price_table_id
    WHERE ptp.price_table_id = v_price_table_id
      AND ptp.product_id = p_product_id
      AND ptp.variant_id IS NOT DISTINCT FROM p_variant_id
      AND ptp.is_active = true
      AND pt.is_active = true
      AND (pt.starts_at IS NULL OR pt.starts_at <= now())
      AND (pt.ends_at IS NULL OR pt.ends_at >= now())
      AND ptp.min_quantity <= p_quantity

    UNION ALL

    -- Prioridade 2: fallback para produto (variant_id NULL), somente se variante não encontrar
    SELECT
      ptp.unit_price,
      ptp.promotional_price,
      ptp.promotion_starts_at,
      ptp.promotion_ends_at,
      ptp.min_quantity,
      2 AS priority
    FROM public.price_table_products ptp
    JOIN public.price_tables pt ON pt.id = ptp.price_table_id
    WHERE ptp.price_table_id = v_price_table_id
      AND ptp.product_id = p_product_id
      AND ptp.variant_id IS NULL
      AND p_variant_id IS NOT NULL  -- só usa fallback quando tem variante sem entrada própria
      AND ptp.is_active = true
      AND pt.is_active = true
      AND (pt.starts_at IS NULL OR pt.starts_at <= now())
      AND (pt.ends_at IS NULL OR pt.ends_at >= now())
      AND ptp.min_quantity <= p_quantity
  ),
  best_per_priority AS (
    SELECT DISTINCT ON (priority)
      unit_price, promotional_price, promotion_starts_at, promotion_ends_at, min_quantity, priority
    FROM price_candidates
    ORDER BY priority, min_quantity DESC
  ),
  best AS (
    SELECT * FROM best_per_priority
    ORDER BY priority
    LIMIT 1
  )
  SELECT
    b.unit_price,
    b.promotional_price,
    CASE
      WHEN b.promotional_price IS NOT NULL
        AND b.promotional_price > 0
        AND (b.promotion_starts_at IS NULL OR b.promotion_starts_at <= now())
        AND (b.promotion_ends_at IS NULL OR b.promotion_ends_at >= now())
      THEN b.promotional_price
      ELSE b.unit_price
    END AS effective_price,
    CASE
      WHEN b.promotional_price IS NOT NULL
        AND b.promotional_price > 0
        AND (b.promotion_starts_at IS NULL OR b.promotion_starts_at <= now())
        AND (b.promotion_ends_at IS NULL OR b.promotion_ends_at >= now())
      THEN true
      ELSE false
    END AS is_on_promotion,
    b.min_quantity AS applied_min_qty
  FROM best b;
END;
$$;

-- Helper interno: somente owner/service_role
REVOKE ALL ON FUNCTION public.resolve_cart_price_canonical(uuid, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_cart_price_canonical(uuid, uuid, uuid, integer) TO service_role;

-- ============================================================
-- 11. RPC: get_active_cart_with_prices (leitura set-based)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_cart_with_prices(
  p_target_company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  cart_id           uuid,
  item_id           uuid,
  product_id        uuid,
  variant_id        uuid,
  product_name      text,
  product_sku       text,
  variant_name      text,
  variant_sku       text,
  image_url         text,
  unit              text,
  min_quantity      integer,
  multiple_quantity integer,
  quantity          integer,
  unit_price        numeric,
  promotional_price numeric,
  effective_price   numeric,
  is_on_promotion   boolean,
  line_total        numeric,
  stock_available   integer,
  is_available      boolean,
  unavailable_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_role      text;
  v_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  -- Resolver role e empresa
  SELECT p.role::text, p.company_id
  INTO v_role, v_company_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_role = 'customer' THEN
    -- Customer: empresa derivada do profile, ignorar p_target_company_id
    NULL; -- v_company_id já está preenchido
    -- Validar empresa aprovada com price_table_id
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id
        AND c.status = 'approved'
        AND c.price_table_id IS NOT NULL
    ) THEN RETURN; END IF;

  ELSIF v_role = 'seller' THEN
    IF p_target_company_id IS NULL THEN RETURN; END IF;
    -- Validar carteira do seller
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = p_target_company_id
        AND c.seller_id = v_user_id
        AND c.status = 'approved'
        AND c.price_table_id IS NOT NULL
    ) THEN RETURN; END IF;
    v_company_id := p_target_company_id;
  ELSE
    RETURN; -- admin, pending, rejected, anon
  END IF;

  RETURN QUERY
  SELECT
    ct.id AS cart_id,
    ci.id AS item_id,
    ci.product_id,
    ci.variant_id,
    p.name AS product_name,
    p.sku AS product_sku,
    pv.name AS variant_name,
    pv.sku AS variant_sku,
    (
      SELECT pi2.url FROM public.product_images pi2
      WHERE pi2.product_id = p.id AND pi2.is_primary = true
      LIMIT 1
    ) AS image_url,
    p.unit,
    p.min_quantity,
    p.multiple_quantity,
    ci.quantity,
    price.unit_price,
    price.promotional_price,
    price.effective_price,
    price.is_on_promotion,
    CASE WHEN price.effective_price IS NOT NULL THEN ROUND(price.effective_price * ci.quantity, 2) ELSE NULL END AS line_total,
    COALESCE(inv.quantity_available - inv.quantity_reserved, 0) AS stock_available,
    CASE
      WHEN NOT p.is_active THEN false
      WHEN NOT p.is_published THEN false
      WHEN ci.variant_id IS NOT NULL AND NOT pv.is_active THEN false
      WHEN price.effective_price IS NULL THEN false
      WHEN COALESCE(inv.quantity_available - inv.quantity_reserved, 0) < ci.quantity THEN false
      ELSE true
    END AS is_available,
    CASE
      WHEN NOT p.is_active THEN 'Produto inativo'
      WHEN NOT p.is_published THEN 'Produto não publicado'
      WHEN ci.variant_id IS NOT NULL AND NOT pv.is_active THEN 'Variante inativa'
      WHEN price.effective_price IS NULL THEN 'Sem preço disponível'
      WHEN COALESCE(inv.quantity_available - inv.quantity_reserved, 0) < ci.quantity THEN 'Estoque insuficiente'
      ELSE NULL
    END AS unavailable_reason
  FROM public.carts ct
  JOIN public.cart_items ci ON ci.cart_id = ct.id
  JOIN public.products p ON p.id = ci.product_id
  LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
  LEFT JOIN public.inventories inv ON inv.variant_id IS NOT DISTINCT FROM ci.variant_id
    AND inv.product_id = ci.product_id
  CROSS JOIN LATERAL public.resolve_cart_price_canonical(
    v_company_id, ci.product_id, ci.variant_id, ci.quantity
  ) AS price
  WHERE ct.profile_id = v_user_id
    AND ct.company_id = v_company_id
    AND ct.status = 'active'
  ORDER BY ci.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_cart_with_prices(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_cart_with_prices(uuid) TO authenticated, service_role;

-- ============================================================
-- 12. RPC: add_to_cart_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_to_cart_atomic(
  p_product_id        uuid,
  p_variant_id        uuid DEFAULT NULL,
  p_quantity          integer DEFAULT 1,
  p_target_company_id uuid DEFAULT NULL
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
  v_item_id       uuid;
  v_current_qty   integer;
  v_final_qty     bigint;
  v_product       record;
  v_variant       record;
  v_inv_avail     integer;
  v_inv_reserved  integer;
  v_price         record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED');
  END IF;

  -- Validar quantidade recebida: positivo, inteiro
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_QUANTITY');
  END IF;
  IF p_quantity > 2147483647 THEN
    RETURN jsonb_build_object('success', false, 'code', 'QUANTITY_OVERFLOW');
  END IF;

  -- Resolver role e empresa
  SELECT p.role::text, p.company_id
  INTO v_role, v_company_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_role = 'customer' THEN
    -- Customer: rejeitar target_company_id enviado
    IF p_target_company_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
    END IF;
    -- Validar empresa aprovada
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id
        AND c.status = 'approved'
        AND c.price_table_id IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('success', false, 'code', 'COMPANY_NOT_ELIGIBLE');
    END IF;

  ELSIF v_role = 'seller' THEN
    IF p_target_company_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'TARGET_COMPANY_REQUIRED');
    END IF;
    -- Validar carteira do seller
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = p_target_company_id
        AND c.seller_id = v_user_id
        AND c.status = 'approved'
        AND c.price_table_id IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
    END IF;
    v_company_id := p_target_company_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
  END IF;

  -- Validar produto
  SELECT id, is_active, is_published, min_quantity, multiple_quantity
  INTO v_product
  FROM public.products
  WHERE id = p_product_id;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'PRODUCT_NOT_FOUND');
  END IF;
  IF NOT v_product.is_active THEN
    RETURN jsonb_build_object('success', false, 'code', 'PRODUCT_INACTIVE');
  END IF;
  IF NOT v_product.is_published THEN
    RETURN jsonb_build_object('success', false, 'code', 'PRODUCT_NOT_PUBLISHED');
  END IF;

  -- Validar variante quando fornecida
  IF p_variant_id IS NOT NULL THEN
    SELECT id, is_active, product_id
    INTO v_variant
    FROM public.product_variants
    WHERE id = p_variant_id;

    IF v_variant IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'VARIANT_NOT_FOUND');
    END IF;
    IF NOT v_variant.is_active THEN
      RETURN jsonb_build_object('success', false, 'code', 'VARIANT_INACTIVE');
    END IF;
    IF v_variant.product_id IS DISTINCT FROM p_product_id THEN
      RETURN jsonb_build_object('success', false, 'code', 'VARIANT_WRONG_PRODUCT');
    END IF;
  END IF;

  -- Criar ou recuperar carrinho active (concorrência segura via índice único)
  INSERT INTO public.carts (profile_id, company_id, status)
  VALUES (v_user_id, v_company_id, 'active')
  ON CONFLICT (profile_id, company_id) WHERE status = 'active'
  DO NOTHING
  RETURNING id INTO v_cart_id;

  IF v_cart_id IS NULL THEN
    SELECT id INTO v_cart_id
    FROM public.carts
    WHERE profile_id = v_user_id AND company_id = v_company_id AND status = 'active';
  END IF;

  -- LOCK do carrinho para serializar mutações
  PERFORM id FROM public.carts WHERE id = v_cart_id FOR UPDATE;

  -- Quantidade atual do item (se já existir)
  SELECT id, quantity INTO v_item_id, v_current_qty
  FROM public.cart_items
  WHERE cart_id = v_cart_id
    AND product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  -- Bloquear item existente se houver
  IF v_item_id IS NOT NULL THEN
    PERFORM id FROM public.cart_items WHERE id = v_item_id FOR UPDATE;
  END IF;

  v_current_qty := COALESCE(v_current_qty, 0);
  v_final_qty := v_current_qty::bigint + p_quantity::bigint;

  -- Verificar overflow de integer
  IF v_final_qty > 2147483647 THEN
    RETURN jsonb_build_object('success', false, 'code', 'QUANTITY_OVERFLOW');
  END IF;

  -- Validar min_quantity na quantidade final
  IF v_final_qty < v_product.min_quantity THEN
    RETURN jsonb_build_object('success', false, 'code', 'BELOW_MIN_QUANTITY',
      'min_quantity', v_product.min_quantity);
  END IF;

  -- Validar multiple_quantity na quantidade final
  IF v_product.multiple_quantity IS NOT NULL AND v_product.multiple_quantity > 1
     AND (v_final_qty % v_product.multiple_quantity) <> 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MULTIPLE',
      'multiple_quantity', v_product.multiple_quantity);
  END IF;

  -- Resolver preço canônico para a quantidade final
  SELECT * INTO v_price
  FROM public.resolve_cart_price_canonical(v_company_id, p_product_id, p_variant_id, v_final_qty::integer);

  IF v_price IS NULL OR v_price.effective_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_PRICE_AVAILABLE');
  END IF;

  -- Validar estoque utilizável (quantity_available - quantity_reserved)
  SELECT COALESCE(inv.quantity_available, 0), COALESCE(inv.quantity_reserved, 0)
  INTO v_inv_avail, v_inv_reserved
  FROM public.inventories inv
  WHERE inv.product_id = p_product_id
    AND inv.variant_id IS NOT DISTINCT FROM p_variant_id
  LIMIT 1;

  IF (v_inv_avail - v_inv_reserved) < v_final_qty THEN
    RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_STOCK',
      'available', v_inv_avail - v_inv_reserved);
  END IF;

  -- Upsert atômico (profile_id preenchido pelo trigger sync_cart_item_profile)
  IF v_item_id IS NOT NULL THEN
    UPDATE public.cart_items
    SET quantity = v_final_qty::integer, updated_at = now()
    WHERE id = v_item_id;
  ELSE
    INSERT INTO public.cart_items (cart_id, product_id, variant_id, quantity, profile_id)
    VALUES (v_cart_id, p_product_id, p_variant_id, v_final_qty::integer, v_user_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'changed', true,
    'cart_id', v_cart_id,
    'quantity', v_final_qty
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_to_cart_atomic(uuid, uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_to_cart_atomic(uuid, uuid, integer, uuid) TO authenticated, service_role;

-- ============================================================
-- 13. RPC: update_cart_item_atomic
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
  INTO v_cart_id, v_current_qty, v_product.id, v_variant_id, v_company_id
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
  FROM public.products pr WHERE pr.id = v_product.id;

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
  FROM public.resolve_cart_price_canonical(v_company_id, v_product.id, v_variant_id, p_quantity);

  IF v_price IS NULL OR v_price.effective_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_PRICE_AVAILABLE');
  END IF;

  -- Estoque utilizável
  SELECT COALESCE(inv.quantity_available, 0), COALESCE(inv.quantity_reserved, 0)
  INTO v_inv_avail, v_inv_reserved
  FROM public.inventories inv
  WHERE inv.product_id = v_product.id AND inv.variant_id IS NOT DISTINCT FROM v_variant_id
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

-- ============================================================
-- 14. RPC: remove_cart_item_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.remove_cart_item_atomic(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_role    text;
  v_cart_id uuid;
  v_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_user_id;

  IF v_role NOT IN ('customer', 'seller') THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  -- Localizar sem revelar existência alheia
  SELECT ci.cart_id, ct.company_id
  INTO v_cart_id, v_company_id
  FROM public.cart_items ci
  JOIN public.carts ct ON ct.id = ci.cart_id
  WHERE ci.id = p_item_id
    AND ct.profile_id = v_user_id
    AND ct.status = 'active';

  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  -- Para seller: validar carteira
  IF v_role = 'seller' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = v_company_id AND c.seller_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'changed', false);
    END IF;
  END IF;

  -- Lock e remoção
  PERFORM id FROM public.carts WHERE id = v_cart_id FOR UPDATE;

  DELETE FROM public.cart_items WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true, 'changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_cart_item_atomic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_cart_item_atomic(uuid) TO authenticated, service_role;

-- ============================================================
-- 15. RPC: clear_cart_atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.clear_cart_atomic(
  p_target_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    uuid;
  v_role       text;
  v_company_id uuid;
  v_cart_id    uuid;
  v_rows_deleted integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  SELECT p.role::text, p.company_id
  INTO v_role, v_company_id
  FROM public.profiles p WHERE p.id = v_user_id;

  IF v_role = 'customer' THEN
    NULL; -- v_company_id já populado
  ELSIF v_role = 'seller' THEN
    IF p_target_company_id IS NULL THEN
      RETURN jsonb_build_object('success', true, 'changed', false);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = p_target_company_id AND c.seller_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'changed', false);
    END IF;
    v_company_id := p_target_company_id;
  ELSE
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE profile_id = v_user_id
    AND company_id = v_company_id
    AND status = 'active';

  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  -- Lock e limpeza
  PERFORM id FROM public.carts WHERE id = v_cart_id FOR UPDATE;

  WITH deleted AS (
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id RETURNING id
  )
  SELECT count(*) INTO v_rows_deleted FROM deleted;

  IF v_rows_deleted = 0 THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  RETURN jsonb_build_object('success', true, 'changed', true, 'items_removed', v_rows_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_cart_atomic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_cart_atomic(uuid) TO authenticated, service_role;
