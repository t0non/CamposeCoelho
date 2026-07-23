-- ============================================================
-- MIGRATION: Correção definitiva do UPDATE em companies
-- Timestamp: 20260722190000
-- Diagnóstico: O trigger BEFORE UPDATE só é ativado se o RLS
--              já permitiu passar o update. Existe conflito de
--              múltiplas policies permitindo updates.
-- Solução: Remover TODAS as policies de UPDATE de companies e
--          recriar apenas uma: somente admin pode fazer UPDATE.
--          O cliente e o seller não têm policy de UPDATE,
--          portanto são bloqueados pelo RLS antes do trigger.
-- ============================================================

-- 1. Remover todas as policies de UPDATE em companies para garantir estado limpo
drop policy if exists "Apenas Admin atualiza status ou observações de empresas" on public.companies;
drop policy if exists "Cliente atualiza dados da própria empresa" on public.companies;
drop policy if exists "Admin atualiza qualquer empresa" on public.companies;

-- 2. Criar política única de UPDATE: somente admin
--    O cliente (customer) NÃO pode fazer UPDATE diretamente.
--    Toda atualização de dados da empresa pelo cliente passa pelo
--    Route Handler do servidor (usando admin client), que valida
--    role, status e campos permitidos.
create policy "Somente admin faz UPDATE em companies"
  on public.companies for update
  using (public.is_admin())
  with check (public.is_admin());
