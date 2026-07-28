-- ============================================================
-- 20260722163000_grant_data_api_access.sql
-- Nova migration corretiva de concessão de acessos à Data API do Supabase
-- ============================================================

-- 1. Uso do schema public
grant usage on schema public to anon, authenticated, service_role;

-- 2. Acesso administrativo completo para service_role (Bypassa RLS)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 3. Acesso para usuários autenticados (Sujeito estritamente às policies RLS)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 4. Acesso somente leitura para visitantes (anon) às tabelas públicas do catálogo
grant select on table
  public.categories,
  public.brands,
  public.products,
  public.product_images,
  public.product_variants,
  public.banners,
  public.collections,
  public.collection_products
to anon;

-- 5. Acesso de inserção para visitantes (anon) no cadastro de newsletter
grant insert on table public.newsletter_leads to anon;

-- ============================================================
-- NOTA DE SEGURANÇA:
-- Nenhuma permissão de SELECT, INSERT, UPDATE ou DELETE foi concedida
-- para 'anon' nas 16 tabelas sensíveis:
-- (profiles, companies, company_members, company_documents, addresses,
--  price_tables, price_table_products, favorites, carts, cart_items,
--  payment_terms, orders, order_items, order_status_history,
--  notifications, audit_logs).
-- ============================================================
