-- Migration: Fix RLS Infinite Recursion (Final)
-- Elimina subqueries de tabelas das policies e usa apenas helpers SECURITY DEFINER blindados.

-- ========================================================
-- 1. HELPERS ESTREITOS E SEGUROS (SECURITY DEFINER)
-- ========================================================

-- Helper: is_current_user_admin()
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
$$;

-- Helper: current_customer_company_id()
-- Retorna o company_id do customer apenas se approved
CREATE OR REPLACE FUNCTION public.current_customer_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id
  FROM public.profiles p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = auth.uid()
    AND p.role = 'customer'::public.user_role
    AND c.status = 'approved'::public.company_status
  LIMIT 1;
$$;

-- Helper: current_customer_price_table_id()
-- Retorna a tabela de preços do customer aprovado
CREATE OR REPLACE FUNCTION public.current_customer_price_table_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.price_table_id
  FROM public.profiles p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = auth.uid()
    AND p.role = 'customer'::public.user_role
    AND c.status = 'approved'::public.company_status
    AND c.price_table_id IS NOT NULL
  LIMIT 1;
$$;

-- Helper: seller_can_access_company(company_id uuid)
CREATE OR REPLACE FUNCTION public.seller_can_access_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON c.seller_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'seller'::public.user_role
      AND c.id = target_company_id
  );
$$;

-- Helper: seller_can_access_price_table(price_table_id uuid)
-- Retorna TRUE se a tabela solicitada está atribuída a alguma empresa da carteira do vendedor
CREATE OR REPLACE FUNCTION public.seller_can_access_price_table(target_price_table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON c.seller_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'seller'::public.user_role
      AND c.price_table_id = target_price_table_id
  );
$$;

-- Helper genérico existente, reescrito com restrições
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.company_id = target_company_id
  ) OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.profile_id = auth.uid() AND cm.company_id = target_company_id
  );
$$;


-- ========================================================
-- 2. REVOGAR PUBLIC E CONCEDER APENAS A AUTHENTICATED
-- ========================================================

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.current_customer_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_customer_company_id() TO authenticated;

REVOKE ALL ON FUNCTION public.current_customer_price_table_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_customer_price_table_id() TO authenticated;

REVOKE ALL ON FUNCTION public.seller_can_access_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_can_access_company(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.seller_can_access_price_table(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_can_access_price_table(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_belongs_to_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid) TO authenticated;

-- (As funções antigas mantemos apenas se precisarem ficar para compatibilidade com outras policies não listadas aqui, mas as novas devem substitui-las)

-- ========================================================
-- 3. REESCRITA DE POLICIES (SEM SUBQUERIES E SEM CICLOS)
-- ========================================================

-- TABELA: profiles
DROP POLICY IF EXISTS "Usuário lê o próprio perfil ou perfis permitidos" ON public.profiles;
CREATE POLICY "Usuário lê o próprio perfil ou perfis permitidos"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_current_user_admin()
    OR public.seller_can_access_company(company_id)
  );

DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil sem alterar role/status" ON public.profiles;
CREATE POLICY "Usuário atualiza o próprio perfil sem alterar role/status"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_current_user_admin());


-- TABELA: companies
DROP POLICY IF EXISTS "Cliente lê apenas sua própria empresa, vendedor lê atribuíd" ON public.companies;
DROP POLICY IF EXISTS "Cliente lê apenas sua própria empresa, vendedor lê atribuídos, admin lê todas" ON public.companies;
CREATE POLICY "Leitura de empresas isolada por RLS"
  ON public.companies FOR SELECT
  USING (
    public.is_current_user_admin()
    OR (seller_id = auth.uid() AND public.seller_can_access_company(id))
    OR id = public.current_customer_company_id()
    OR public.user_belongs_to_company(id)
  );

DROP POLICY IF EXISTS "Somente admin faz UPDATE em companies" ON public.companies;
DROP POLICY IF EXISTS "Apenas Admin atualiza status ou observações de empresas" ON public.companies;
CREATE POLICY "Admin faz UPDATE em companies"
  ON public.companies FOR UPDATE
  USING (public.is_current_user_admin());


-- TABELA: company_members
DROP POLICY IF EXISTS "Membros veem membros da sua empresa" ON public.company_members;
CREATE POLICY "Membros veem membros da sua empresa"
  ON public.company_members FOR SELECT
  USING (
    public.is_current_user_admin()
    OR profile_id = auth.uid()
    OR public.user_belongs_to_company(company_id)
  );


-- TABELA: price_tables
DROP POLICY IF EXISTS "Customer vê apenas sua tabela de preços" ON public.price_tables;
CREATE POLICY "Customer vê apenas sua tabela de preços"
  ON public.price_tables FOR SELECT
  USING (
    public.is_current_user_admin()
    OR public.seller_can_access_price_table(id)
    OR id = public.current_customer_price_table_id()
  );

DROP POLICY IF EXISTS "Admin gerencia tabelas de preço" ON public.price_tables;
CREATE POLICY "Admin gerencia tabelas de preço"
  ON public.price_tables FOR ALL
  USING (public.is_current_user_admin());


-- TABELA: price_table_products
DROP POLICY IF EXISTS "Customer vê apenas preços da sua tabela" ON public.price_table_products;
CREATE POLICY "Customer vê apenas preços da sua tabela"
  ON public.price_table_products FOR SELECT
  USING (
    public.is_current_user_admin()
    OR public.seller_can_access_price_table(price_table_id)
    OR price_table_id = public.current_customer_price_table_id()
  );

DROP POLICY IF EXISTS "Admin gerencia preços de produtos" ON public.price_table_products;
CREATE POLICY "Admin gerencia preços de produtos"
  ON public.price_table_products FOR ALL
  USING (public.is_current_user_admin());

