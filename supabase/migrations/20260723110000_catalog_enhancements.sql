-- ============================================================
-- MIGRATION: Catálogo B2B — Campos, Constraints, Índices, Storage, RLS
-- Timestamp: 20260723110000
-- Bloco 11A da Etapa 11
-- ============================================================
-- PG 17.6 confirmado → NULLS NOT DISTINCT disponível
-- pg_trgm já habilitado na migration inicial
-- ============================================================

-- ============================================================
-- 1. PRODUCTS — campos aditivos
-- ============================================================

alter table public.products
  add column if not exists is_published     boolean not null default false,
  add column if not exists is_featured      boolean not null default false,
  add column if not exists is_new_arrival   boolean not null default false,
  add column if not exists short_description text,
  add column if not exists seo_title        text,
  add column if not exists seo_description  text;

comment on column public.products.is_published    is 'true = visível no catálogo público; false = rascunho';
comment on column public.products.is_featured     is 'badge de destaque na home e catálogo';
comment on column public.products.is_new_arrival  is 'badge de lançamento';
comment on column public.products.short_description is 'descrição curta exibida nos cards de produto';
comment on column public.products.seo_title       is 'título de SEO; usa name se nulo';
comment on column public.products.seo_description is 'meta descrição de SEO';

-- ============================================================
-- 2. CATEGORIES — campos aditivos de SEO
-- ============================================================

alter table public.categories
  add column if not exists seo_title       text,
  add column if not exists seo_description text;

-- ============================================================
-- 3. BRANDS — campos aditivos
-- ============================================================

alter table public.brands
  add column if not exists description     text,
  add column if not exists seo_title       text,
  add column if not exists seo_description text;

-- ============================================================
-- 4. PRODUCT_VARIANTS — campos aditivos
-- ============================================================

alter table public.product_variants
  add column if not exists is_active         boolean not null default true,
  add column if not exists barcode           text,
  add column if not exists min_quantity      integer not null default 1,
  add column if not exists multiple_quantity integer not null default 1;

alter table public.product_variants
  add constraint product_variants_min_quantity_positive
    check (min_quantity > 0),
  add constraint product_variants_multiple_quantity_positive
    check (multiple_quantity > 0);

-- ============================================================
-- 5. PRICE_TABLES — campos aditivos de validade
-- ============================================================

alter table public.price_tables
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at   timestamptz;

-- ============================================================
-- 6. PRICE_TABLE_PRODUCTS — campos aditivos
-- ============================================================

alter table public.price_table_products
  add column if not exists is_active    boolean not null default true,
  add column if not exists min_quantity integer not null default 1;

alter table public.price_table_products
  add constraint price_table_products_min_quantity_positive
    check (min_quantity > 0);

-- Preço promocional não pode superar o preço normal
-- (admin pode autorizar exceção removendo constraint, mas por padrão protege)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'price_table_products_promo_lte_unit'
      and conrelid = 'public.price_table_products'::regclass
  ) then
    alter table public.price_table_products
      add constraint price_table_products_promo_lte_unit
        check (
          promotional_price is null
          or promotional_price <= unit_price
        );
  end if;
end $$;

-- ============================================================
-- 7. INVENTORIES — restrições de integridade com NULL
-- ============================================================
-- PG 17: NULLS NOT DISTINCT garante que dois registros com
-- (product_id, variant_id=NULL) sejam tratados como duplicatas.
-- Drop e recria usando ALTER TABLE para substituir a constraint antiga.
-- ============================================================

-- Remove a constraint original (nome inferido pelo PG como inventories_product_id_variant_id_key)
alter table public.inventories
  drop constraint if exists inventories_product_id_variant_id_key;

-- Recria com NULLS NOT DISTINCT para tratar NULL como valor duplicável
alter table public.inventories
  add constraint inventories_product_variant_unique
    unique nulls not distinct (product_id, variant_id);

-- Estoque não pode ficar negativo
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventories_quantity_available_non_negative'
      and conrelid = 'public.inventories'::regclass
  ) then
    alter table public.inventories
      add constraint inventories_quantity_available_non_negative
        check (quantity_available >= 0),
      add constraint inventories_quantity_reserved_non_negative
        check (quantity_reserved >= 0),
      add constraint inventories_reserved_lte_available
        check (quantity_reserved <= quantity_available);
  end if;
end $$;

-- ============================================================
-- 8. PRICE_TABLE_PRODUCTS — integridade com NULL em variant_id
-- ============================================================

alter table public.price_table_products
  drop constraint if exists price_table_products_price_table_id_product_id_variant_id_key;

-- Garante unicidade por (price_table_id, product_id, variant_id) com NULLS NOT DISTINCT
-- para evitar preços duplicados quando variant_id é NULL
alter table public.price_table_products
  add constraint price_table_products_unique_entry
    unique nulls not distinct (price_table_id, product_id, variant_id, min_quantity);

-- ============================================================
-- 9. PRODUCT_IMAGES — somente uma imagem principal por produto
-- ============================================================

-- Sanitizar imagens primárias duplicadas existentes deixando apenas a mais antiga como primary
with ranked_primary as (
  select id, row_number() over (partition by product_id order by created_at asc, id asc) as rn
  from public.product_images
  where is_primary = true
)
update public.product_images
set is_primary = false
where id in (select id from ranked_primary where rn > 1);

-- Índice parcial: impede mais de um is_primary=true por product_id
create unique index if not exists product_images_one_primary_per_product_idx
  on public.product_images (product_id)
  where is_primary = true;

-- Posição não pode ser negativa
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_images_position_non_negative'
      and conrelid = 'public.product_images'::regclass
  ) then
    alter table public.product_images
      add constraint product_images_position_non_negative
        check (position >= 0);
  end if;
end $$;

-- ============================================================
-- 10. PRODUCTS — constraints adicionais
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_min_quantity_positive'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_min_quantity_positive
        check (min_quantity > 0),
      add constraint products_multiple_quantity_positive
        check (multiple_quantity > 0);
  end if;
end $$;

-- ============================================================
-- 11. NOVA TABELA: inventory_movements
-- ============================================================

create table if not exists public.inventory_movements (
  id                uuid        primary key default gen_random_uuid(),
  inventory_id      uuid        not null references public.inventories(id) on delete cascade,
  variant_id        uuid        references public.product_variants(id) on delete set null,
  actor_id          uuid        references public.profiles(id) on delete set null,
  movement_type     text        not null,  -- 'adjustment', 'reservation', 'release', 'sale'
  quantity_delta    integer     not null,  -- positivo = entrada, negativo = saída
  previous_quantity integer     not null,
  new_quantity      integer     not null,
  reason            text,
  reference_type    text,        -- 'order', 'manual', 'return'
  reference_id      uuid,
  created_at        timestamptz not null default now(),
  constraint inventory_movements_type_valid
    check (movement_type in ('adjustment', 'reservation', 'release', 'sale', 'return'))
);

alter table public.inventory_movements enable row level security;

create policy "Admin vê movimentos de inventário"
  on public.inventory_movements for select
  using (public.is_admin());

create policy "Admin insere movimentos de inventário"
  on public.inventory_movements for insert
  with check (public.is_admin());

create index if not exists inventory_movements_inventory_id_idx
  on public.inventory_movements (inventory_id);

create index if not exists inventory_movements_created_at_idx
  on public.inventory_movements (created_at desc);

-- ============================================================
-- 12. ÍNDICES ADICIONAIS PARA BUSCA E FILTROS
-- ============================================================

-- pg_trgm já habilitado na migration inicial (extension pg_trgm)
-- Índice GIN já existe para products.name

-- Índice para busca por SKU de produto (btree)
create index if not exists products_sku_lower_idx
  on public.products using btree (lower(sku));

-- Índice trgm para short_description (busca por termo)
create index if not exists products_short_description_trgm_idx
  on public.products using gin (short_description gin_trgm_ops);

-- Índice para busca por SKU de variante
create index if not exists product_variants_sku_lower_idx
  on public.product_variants using btree (lower(sku));

-- Índice trgm para nome de variante
create index if not exists product_variants_name_trgm_idx
  on public.product_variants using gin (name gin_trgm_ops);

-- Índice para filtros de publicação e destaque
create index if not exists products_published_active_idx
  on public.products (is_published, is_active)
  where is_published = true and is_active = true;

create index if not exists products_featured_idx
  on public.products (is_featured)
  where is_featured = true;

create index if not exists products_new_arrival_idx
  on public.products (is_new_arrival)
  where is_new_arrival = true;

-- Índice para filtros de preço por tabela (consultas de customer)
create index if not exists price_table_products_table_variant_idx
  on public.price_table_products (price_table_id, variant_id)
  where is_active = true;

-- Índice para busca de inventário por variante
create index if not exists inventories_variant_id_idx
  on public.inventories (variant_id);

-- ============================================================
-- 13. RLS — correções e novas policies de catálogo
-- ============================================================

-- Produto publicado é público para anon; rascunho somente para admin
-- Substitui a policy genérica "Produtos públicos para todos"
drop policy if exists "Produtos públicos para todos" on public.products;
create policy "Produtos ativos e publicados são públicos"
  on public.products for select
  using (
    (is_active = true and is_published = true)
    or public.is_admin()
  );

-- Variantes: somente variantes ativas são públicas
drop policy if exists "Variantes de produtos para todos" on public.product_variants;
create policy "Variantes ativas são públicas"
  on public.product_variants for select
  using (
    is_active = true
    or public.is_admin()
  );

-- Admin gerencia variantes
drop policy if exists "Admin gerencia variantes" on public.product_variants;
create policy "Admin gerencia variantes"
  on public.product_variants for all
  using (public.is_admin());

-- Admin gerencia imagens de produto
drop policy if exists "Admin gerencia imagens de produto" on public.product_images;
create policy "Admin gerencia imagens de produto"
  on public.product_images for all
  using (public.is_admin());

-- Admin gerencia categorias
drop policy if exists "Admin gerencia categorias" on public.categories;
create policy "Admin gerencia categorias"
  on public.categories for all
  using (public.is_admin());

-- Admin gerencia marcas
drop policy if exists "Admin gerencia marcas" on public.brands;
create policy "Admin gerencia marcas"
  on public.brands for all
  using (public.is_admin());

-- Customer approved pode ler favoritos — já existe a policy "Usuário gerencia próprios favoritos"
-- Adicionar policy de INSERT explícita para confirmed users
drop policy if exists "Customer insere favoritos" on public.favorites;
create policy "Customer insere favoritos"
  on public.favorites for insert
  with check (
    profile_id = auth.uid()
    and public.is_approved()
  );

-- ============================================================
-- 14. STORAGE — bucket product-images (público para leitura)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,                    -- público: URLs diretas sem assinatura
  5242880,                 -- 5 MB por imagem
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public          = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Policies de Storage para product-images
-- Leitura pública (bucket já é público, mas policy explícita para clareza)
drop policy if exists "Leitura pública de imagens de produto" on storage.objects;
create policy "Leitura pública de imagens de produto"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Upload restrito a admin
drop policy if exists "Admin faz upload de imagens de produto" on storage.objects;
create policy "Admin faz upload de imagens de produto"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );

-- Atualização restrita a admin
drop policy if exists "Admin atualiza imagens de produto" on storage.objects;
create policy "Admin atualiza imagens de produto"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

-- Exclusão restrita a admin
drop policy if exists "Admin exclui imagens de produto" on storage.objects;
create policy "Admin exclui imagens de produto"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

-- ============================================================
-- 15. FUNÇÃO SECURITY DEFINER: preço efetivo pela sessão
-- ============================================================
-- Resolve o preço de uma variante para o customer autenticado
-- SEM receber companyId ou priceTableId do exterior.
-- Retorna NULL se o usuário não for approved ou não tiver tabela.
-- ============================================================

create or replace function public.get_effective_price_for_session(
  p_variant_id uuid
)
returns table (
  unit_price        numeric,
  promotional_price numeric,
  effective_price   numeric,
  is_on_promotion   boolean,
  min_quantity      integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id        uuid;
  v_profile_role   text;
  v_company_status text;
  v_price_table_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return;
  end if;

  -- Resolver role e, para customer, a empresa e tabela de preços
  select
    p.role,
    c.status,
    c.price_table_id
  into
    v_profile_role,
    v_company_status,
    v_price_table_id
  from public.profiles p
  left join public.companies c on c.id = p.company_id
  where p.id = v_user_id;

  -- Admin e seller veem preços (sem filtrar por tabela de empresa)
  if v_profile_role in ('admin', 'seller') then
    return query
      select
        ptp.unit_price,
        ptp.promotional_price,
        case
          when ptp.promotional_price is not null
            and ptp.promotional_price > 0
            and (ptp.promotion_starts_at is null or ptp.promotion_starts_at <= now())
            and (ptp.promotion_ends_at   is null or ptp.promotion_ends_at   >= now())
            and ptp.is_active = true
          then ptp.promotional_price
          else ptp.unit_price
        end as effective_price,
        case
          when ptp.promotional_price is not null
            and ptp.promotional_price > 0
            and (ptp.promotion_starts_at is null or ptp.promotion_starts_at <= now())
            and (ptp.promotion_ends_at   is null or ptp.promotion_ends_at   >= now())
            and ptp.is_active = true
          then true
          else false
        end as is_on_promotion,
        ptp.min_quantity
      from public.price_table_products ptp
      where ptp.variant_id = p_variant_id
        and ptp.is_active = true
      order by ptp.min_quantity asc
      limit 1;
    return;
  end if;

  -- Customer: verificar approved e ter price_table_id
  if v_profile_role = 'customer'
     and v_company_status = 'approved'
     and v_price_table_id is not null
  then
    return query
      select
        ptp.unit_price,
        ptp.promotional_price,
        case
          when ptp.promotional_price is not null
            and ptp.promotional_price > 0
            and (ptp.promotion_starts_at is null or ptp.promotion_starts_at <= now())
            and (ptp.promotion_ends_at   is null or ptp.promotion_ends_at   >= now())
            and ptp.is_active = true
          then ptp.promotional_price
          else ptp.unit_price
        end as effective_price,
        case
          when ptp.promotional_price is not null
            and ptp.promotional_price > 0
            and (ptp.promotion_starts_at is null or ptp.promotion_starts_at <= now())
            and (ptp.promotion_ends_at   is null or ptp.promotion_ends_at   >= now())
            and ptp.is_active = true
          then true
          else false
        end as is_on_promotion,
        ptp.min_quantity
      from public.price_table_products ptp
      where ptp.variant_id     = p_variant_id
        and ptp.price_table_id = v_price_table_id
        and ptp.is_active      = true
      order by ptp.min_quantity asc
      limit 1;
    return;
  end if;

  -- Para todos os outros (anon, pending, rejected, suspended): retorna vazio
  return;
end;
$$;

-- Grant para chamada autenticada
grant execute on function public.get_effective_price_for_session(uuid)
  to authenticated, service_role;

-- ============================================================
-- 16. GRANTS — novas tabelas e colunas
-- ============================================================

-- inventory_movements
grant select, insert on public.inventory_movements to authenticated, service_role;

-- Garantir que anon pode SELECT nas tabelas públicas do catálogo
-- (já existem via migration inicial, mas confirmar para novas colunas)
grant select on public.products          to anon, authenticated, service_role;
grant select on public.product_images    to anon, authenticated, service_role;
grant select on public.product_variants  to anon, authenticated, service_role;
grant select on public.categories        to anon, authenticated, service_role;
grant select on public.brands            to anon, authenticated, service_role;
grant select on public.collections       to anon, authenticated, service_role;
grant select on public.collection_products to anon, authenticated, service_role;
grant select on public.banners           to anon, authenticated, service_role;
grant select on public.favorites         to authenticated, service_role;
grant select on public.inventories       to authenticated, service_role;

-- Admin-only: modificação via RLS (as políticas bloqueiam, mas grants são necessários)
grant insert, update, delete on public.products          to authenticated, service_role;
grant insert, update, delete on public.product_images    to authenticated, service_role;
grant insert, update, delete on public.product_variants  to authenticated, service_role;
grant insert, update, delete on public.categories        to authenticated, service_role;
grant insert, update, delete on public.brands            to authenticated, service_role;
grant insert, update, delete on public.inventories       to authenticated, service_role;
grant insert, update, delete on public.price_tables      to authenticated, service_role;
grant insert, update, delete on public.price_table_products to authenticated, service_role;
grant insert, delete on public.favorites                 to authenticated, service_role;

-- ============================================================
-- FIM DA MIGRATION 20260723110000
-- ============================================================
