-- ============================================================
-- 20260727280000_fix_cart_price_ambiguity_12a.sql
-- BLOCO 12A — CORREÇÃO (não editar a migration 20260727270000)
-- ============================================================
-- Problema factual detectado no banco (Local/Remote):
--   resolve_cart_price_canonical() falha com
--   "column reference \"unit_price\" is ambiguous" (SQLSTATE 42702).
--   No CTE best_per_priority, os identificadores `unit_price` e
--   `promotional_price` sem qualificação colidem com os parâmetros OUT
--   homônimos da cláusula RETURNS TABLE, tornando a referência ambígua.
--   Isso derruba add_to_cart_atomic e get_active_cart_with_prices.
--
-- Correção: CREATE OR REPLACE da função com TODAS as colunas dos CTEs
-- qualificadas por alias (pc./bp.), eliminando a ambiguidade. Nenhuma
-- regra de negócio, assinatura, retorno ou segurança é alterada.
-- CREATE OR REPLACE preserva owner e grants; ainda assim, reafirmamos os
-- grants ao final por robustez/idempotência.
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
      ptp.unit_price          AS c_unit_price,
      ptp.promotional_price   AS c_promotional_price,
      ptp.promotion_starts_at AS c_promotion_starts_at,
      ptp.promotion_ends_at   AS c_promotion_ends_at,
      ptp.min_quantity        AS c_min_quantity,
      1 AS c_priority
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
      ptp.unit_price          AS c_unit_price,
      ptp.promotional_price   AS c_promotional_price,
      ptp.promotion_starts_at AS c_promotion_starts_at,
      ptp.promotion_ends_at   AS c_promotion_ends_at,
      ptp.min_quantity        AS c_min_quantity,
      2 AS c_priority
    FROM public.price_table_products ptp
    JOIN public.price_tables pt ON pt.id = ptp.price_table_id
    WHERE ptp.price_table_id = v_price_table_id
      AND ptp.product_id = p_product_id
      AND ptp.variant_id IS NULL
      AND p_variant_id IS NOT NULL
      AND ptp.is_active = true
      AND pt.is_active = true
      AND (pt.starts_at IS NULL OR pt.starts_at <= now())
      AND (pt.ends_at IS NULL OR pt.ends_at >= now())
      AND ptp.min_quantity <= p_quantity
  ),
  best_per_priority AS (
    SELECT DISTINCT ON (pc.c_priority)
      pc.c_unit_price,
      pc.c_promotional_price,
      pc.c_promotion_starts_at,
      pc.c_promotion_ends_at,
      pc.c_min_quantity,
      pc.c_priority
    FROM price_candidates pc
    ORDER BY pc.c_priority, pc.c_min_quantity DESC
  ),
  best AS (
    SELECT
      bp.c_unit_price,
      bp.c_promotional_price,
      bp.c_promotion_starts_at,
      bp.c_promotion_ends_at,
      bp.c_min_quantity,
      bp.c_priority
    FROM best_per_priority bp
    ORDER BY bp.c_priority
    LIMIT 1
  )
  SELECT
    b.c_unit_price,
    b.c_promotional_price,
    CASE
      WHEN b.c_promotional_price IS NOT NULL
        AND b.c_promotional_price > 0
        AND (b.c_promotion_starts_at IS NULL OR b.c_promotion_starts_at <= now())
        AND (b.c_promotion_ends_at IS NULL OR b.c_promotion_ends_at >= now())
      THEN b.c_promotional_price
      ELSE b.c_unit_price
    END AS effective_price,
    CASE
      WHEN b.c_promotional_price IS NOT NULL
        AND b.c_promotional_price > 0
        AND (b.c_promotion_starts_at IS NULL OR b.c_promotion_starts_at <= now())
        AND (b.c_promotion_ends_at IS NULL OR b.c_promotion_ends_at >= now())
      THEN true
      ELSE false
    END AS is_on_promotion,
    b.c_min_quantity AS applied_min_qty
  FROM best b;
END;
$$;

-- Reafirmar restrições de execução (helper interno)
REVOKE ALL ON FUNCTION public.resolve_cart_price_canonical(uuid, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_cart_price_canonical(uuid, uuid, uuid, integer) TO service_role;
