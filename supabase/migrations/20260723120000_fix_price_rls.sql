-- ============================================================
-- MIGRATION: Correção de RLS em price_table_products
-- Timestamp: 20260723120000
-- Bloco 11A — Correção pós-testes
-- ============================================================
-- PROBLEMA IDENTIFICADO:
-- A policy "Apenas usuários aprovados veem preços de produtos" usa
-- is_approved() mas não filtra por price_table_id da empresa do usuário.
-- Isso permitia que qualquer customer aprovado lesse TODOS os preços
-- de TODAS as tabelas, vazando preços de outras empresas.
-- 
-- SOLUÇÃO:
-- Substituir a policy SELECT de price_table_products por uma que:
-- 1. Verifica is_approved()
-- 2. Filtra pelo price_table_id da empresa vinculada ao profile
--    (join via profiles → companies → price_table_id)
-- Admin continua com acesso irrestrito.
-- ============================================================

-- Remove a policy permissiva anterior
drop policy if exists "Apenas usuários aprovados veem preços de produtos"
  on public.price_table_products;

-- Nova policy: só vê preços da tabela vinculada à sua empresa
create policy "Customer vê apenas preços da sua tabela"
  on public.price_table_products for select
  using (
    -- Admin vê tudo
    public.is_admin()
    -- Seller vê tudo (para cotações e suporte)
    or public.is_seller()
    -- Customer aprovado vê SOMENTE a tabela da sua empresa
    or (
      public.is_approved()
      and price_table_products.price_table_id = (
        select c.price_table_id
        from public.profiles p
        join public.companies c on c.id = p.company_id
        where p.id = auth.uid()
          and c.status = 'approved'
          and c.price_table_id is not null
      )
    )
  );

-- ============================================================
-- PRODUCTS — Policy de DELETE explícita
-- ============================================================
-- Supabase retorna 0 linhas sem erro quando RLS bloqueia DELETE
-- (comportamento correto do PostgreSQL). Mas é melhor ter uma
-- policy explícita para DELETE que só permita admin.
-- A policy "Admin gerencia produtos" já cobre ALL (inclui DELETE).
-- A policy de SELECT permite que authenticated leia produtos publicados,
-- mas não há grant de DELETE implícito — o Supabase silencia o erro.
-- Adicionamos policy explícita negando DELETE para não-admin.
drop policy if exists "Ninguém além de admin apaga produtos" on public.products;
create policy "Ninguém além de admin apaga produtos"
  on public.products for delete
  using (public.is_admin());

-- Similar para price_tables (garantir que DELETE é admin-only)
drop policy if exists "Ninguém além de admin apaga tabelas de preço" on public.price_tables;
create policy "Ninguém além de admin apaga tabelas de preço"
  on public.price_tables for delete
  using (public.is_admin());

-- ============================================================
-- Também garantir policy de SELECT para price_tables:
-- seller pode ver todas as tabelas (para cotações)
-- customer vê somente a sua
-- ============================================================
drop policy if exists "Apenas usuários aprovados veem tabelas de preço" on public.price_tables;
create policy "Customer vê apenas sua tabela de preços"
  on public.price_tables for select
  using (
    public.is_admin()
    or public.is_seller()
    or (
      public.is_approved()
      and price_tables.id = (
        select c.price_table_id
        from public.profiles p
        join public.companies c on c.id = p.company_id
        where p.id = auth.uid()
          and c.status = 'approved'
          and c.price_table_id is not null
      )
    )
  );

-- ============================================================
-- FIM DA MIGRATION 20260723120000
-- ============================================================
