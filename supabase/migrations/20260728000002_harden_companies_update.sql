-- 20260728000002_harden_companies_update.sql

-- Garantir que as roles têm permissão no Postgres para tentar o UPDATE
GRANT UPDATE ON public.companies TO authenticated;

-- Remover qualquer policy muito solta ou quebrada
DROP POLICY IF EXISTS "Cliente atualiza dados da própria empresa" ON public.companies;
DROP POLICY IF EXISTS "Seller atualiza empresas da carteira" ON public.companies;

-- 1. Restaurar a policy para o Cliente atualizar SUA PRÓPRIA EMPRESA.
-- O RLS 'USING' seleciona a linha. O Trigger 'protect_company_sensitive_fields' fará o bloqueio
-- de campos restritos (status, seller_id, price_table_id) levantando uma exceção real.
CREATE POLICY "Cliente atualiza dados da própria empresa"
  ON public.companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = companies.id
    )
  );

-- 2. Criar a policy para o Vendedor atualizar empresas da SUA CARTEIRA.
-- Mesma lógica: o RLS seleciona, e o Trigger barra escalonamento de campos restritos.
CREATE POLICY "Seller atualiza empresas da carteira"
  ON public.companies FOR UPDATE
  USING (
    seller_id = auth.uid() AND public.seller_can_access_company(id)
  );
