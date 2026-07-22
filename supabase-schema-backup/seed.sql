-- ============================================================
-- seed.sql — Dados de catálogo e tabelas comerciais
-- Nota: Para criar usuários no Supabase Auth com perfis e empresas,
-- utilize o script seguro de servidor: `npm run seed`
-- ============================================================

-- 1. Tabela de Preço Padrão
insert into public.price_tables (id, name, description, is_default, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Tabela Atacado Padrão', 'Tabela comercial com preços de atacado padrão', true, true)
on conflict (id) do nothing;

-- 2. Categorias
insert into public.categories (id, name, slug, position)
values
  ('33333333-3333-3333-3333-333333333301', 'Alimentos & Bebidas', 'alimentos-bebidas', 1),
  ('33333333-3333-3333-3333-333333333302', 'Limpeza & Higiene', 'limpeza-higiene', 2)
on conflict (id) do nothing;

-- 3. Marcas
insert into public.brands (id, name, slug)
values
  ('44444444-4444-4444-4444-444444444401', 'Marca Premium B2B', 'marca-premium'),
  ('44444444-4444-4444-4444-444444444402', 'NutriMax Atacado', 'nutrimax')
on conflict (id) do nothing;

-- 4. Produtos
insert into public.products (id, sku, name, slug, description, category_id, brand_id, unit, min_quantity, multiple_quantity)
values
  (
    '55555555-5555-5555-5555-555555555501',
    'SKU-1001',
    'Caixa de Azeite Extra Virgem 500ml (12 un)',
    'azeite-extra-virgem-500ml-cx12',
    'Azeite de oliva extra virgem de altíssima qualidade, embalagem de vidro em caixa com 12 unidades.',
    '33333333-3333-3333-3333-333333333301',
    '44444444-4444-4444-4444-444444444401',
    'CX',
    5,
    5
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    'SKU-1002',
    'Fardo de Café Torrado e Moído 500g (20 un)',
    'cafe-torrado-moido-500g-fd20',
    'Café especial gourmet torrado e moído 100% arábica, fardo com 20 pacotes de 500g.',
    '33333333-3333-3333-3333-333333333301',
    '44444444-4444-4444-4444-444444444402',
    'FD',
    2,
    2
  )
on conflict (id) do nothing;

-- 5. Imagens dos Produtos
insert into public.product_images (product_id, url, is_primary)
values
  ('55555555-5555-5555-5555-555555555501', '/placeholder-product.png', true),
  ('55555555-5555-5555-5555-555555555502', '/placeholder-product.png', true);

-- 6. Preços Protegidos na Tabela de Preços
insert into public.price_table_products (price_table_id, product_id, unit_price, promotional_price)
values
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 289.90, 269.90),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 319.00, null);

-- 7. Inventários
insert into public.inventories (product_id, quantity_available, quantity_reserved)
values
  ('55555555-5555-5555-5555-555555555501', 150, 10),
  ('55555555-5555-5555-5555-555555555502', 200, 0)
on conflict (product_id, variant_id) do nothing;

-- 8. Métodos de Envio & Condições de Pagamento
insert into public.shipping_methods (name, code, description, estimated_days)
values
  ('Transportadora Rodoviário', 'TRASP_ROD', 'Entrega via transportadora parceira', 5),
  ('Retira no Galpão', 'RETIRA_GALPAO', 'Retirada agendada no centro de distribuição', 1)
on conflict (code) do nothing;

insert into public.payment_terms (name, code, days_to_pay, installments, min_order_value)
values
  ('À Vista no PIX / Boleto', 'AVISTA', 0, 1, 500.00),
  ('Faturado 30 Dias (Boleto)', 'FAT_30', 30, 1, 1000.00),
  ('Faturado 30/60 Dias (2x)', 'FAT_30_60', 60, 2, 2000.00)
on conflict (code) do nothing;
