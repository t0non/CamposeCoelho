-- ============================================================
-- 20260728170000_admin_excel_import.sql
-- Importador de Produtos via Excel: Tabelas de Sessão e RPCs atômicas
-- ============================================================

create type catalog_import_mode as enum ('import_update', 'replace');
create type catalog_import_status as enum ('preview', 'confirmed', 'processing', 'completed', 'failed');
create type catalog_import_batch_status as enum ('pending', 'processing', 'completed', 'failed');
create type catalog_import_row_status as enum ('valid', 'warning', 'error');

-- ============================================================
-- 1. SESSÃO DE IMPORTAÇÃO
-- ============================================================
create table public.catalog_import_sessions (
  id               uuid primary key default gen_random_uuid(),
  admin_id         uuid not null references public.profiles(id) on delete cascade,
  file_name        text not null,
  file_hash        text,
  status           catalog_import_status not null default 'preview',
  mode             catalog_import_mode not null default 'import_update',
  price_table_id   uuid references public.price_tables(id) on delete set null,
  publish_products boolean not null default false,
  total_rows       integer not null default 0,
  processed_rows   integer not null default 0,
  batch_size       integer not null default 100,
  total_batches    integer not null default 0,
  error_message    text,
  created_at       timestamptz not null default now(),
  confirmed_at     timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  failed_at        timestamptz,
  finalized_at     timestamptz
);

alter table public.catalog_import_sessions enable row level security;
create policy "Admin gerencia import sessions" on public.catalog_import_sessions for all using (public.is_admin());

-- ============================================================
-- 2. LINHAS TEMPORÁRIAS DA SESSÃO
-- ============================================================
create table public.catalog_import_session_rows (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.catalog_import_sessions(id) on delete cascade,
  raw_row_number    integer not null,
  sku               text not null,
  name              text not null,
  barcode           text,
  unit              text not null default 'UN',
  sale_price        numeric,
  is_inactive       boolean not null default false,
  validation_status catalog_import_row_status not null default 'valid',
  warnings          jsonb not null default '[]',
  errors            jsonb not null default '[]',
  row_hash          text,
  created_at        timestamptz not null default now()
);

alter table public.catalog_import_session_rows enable row level security;
create policy "Admin gerencia import session rows" on public.catalog_import_session_rows for all using (public.is_admin());
create index idx_import_rows_session on public.catalog_import_session_rows(session_id, raw_row_number);
create index idx_import_rows_sku on public.catalog_import_session_rows(session_id, sku);

-- ============================================================
-- 3. LOTES (BATCHES) DA SESSÃO
-- ============================================================
create table public.catalog_import_session_batches (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.catalog_import_sessions(id) on delete cascade,
  batch_number   integer not null,
  status         catalog_import_batch_status not null default 'pending',
  rows_start     integer not null,
  rows_end       integer not null,
  processed_rows integer not null default 0,
  created_count  integer not null default 0,
  updated_count  integer not null default 0,
  warning_count  integer not null default 0,
  error_count    integer not null default 0,
  error_message  text,
  started_at     timestamptz,
  completed_at   timestamptz,
  unique(session_id, batch_number)
);

alter table public.catalog_import_session_batches enable row level security;
create policy "Admin gerencia import session batches" on public.catalog_import_session_batches for all using (public.is_admin());

-- ============================================================
-- 4. LOG DE AUDITORIA PERMANENTE
-- ============================================================
create table public.catalog_import_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid not null references public.profiles(id) on delete set null,
  file_name      text not null,
  mode           catalog_import_mode not null,
  status         catalog_import_status not null,
  total_rows     integer not null default 0,
  created_count  integer not null default 0,
  updated_count  integer not null default 0,
  archived_count integer not null default 0,
  error_message  text,
  started_at     timestamptz not null,
  completed_at   timestamptz not null default now()
);

alter table public.catalog_import_logs enable row level security;
create policy "Admin lê logs de importação" on public.catalog_import_logs for select using (public.is_admin());
create policy "Admin insere logs de importação" on public.catalog_import_logs for insert with check (public.is_admin());

-- ============================================================
-- 5. RPC: Confirmar Sessão
-- ============================================================
create or replace function public.confirm_catalog_import_session_atomic(
  p_session_id uuid,
  p_mode public.catalog_import_mode,
  p_price_table_id uuid,
  p_publish_products boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_session public.catalog_import_sessions;
begin
  v_user_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem confirmar sessões de importação.';
  end if;

  select * into v_session from public.catalog_import_sessions where id = p_session_id for update;

  if not found then
    raise exception 'Sessão não encontrada.';
  end if;

  if v_session.admin_id != v_user_id then
    raise exception 'Acesso negado: a sessão não pertence a este administrador.';
  end if;

  if v_session.status != 'preview' then
    raise exception 'A sessão não está em modo preview (status atual: %).', v_session.status;
  end if;

  if p_price_table_id is not null then
    if not exists (select 1 from public.price_tables where id = p_price_table_id) then
      raise exception 'Tabela de preços inválida.';
    end if;
  end if;

  update public.catalog_import_sessions
  set mode = p_mode,
      price_table_id = p_price_table_id,
      publish_products = p_publish_products,
      status = 'confirmed',
      confirmed_at = now()
  where id = p_session_id;

  return jsonb_build_object('success', true, 'status', 'confirmed');
end;
$$;
revoke execute on function public.confirm_catalog_import_session_atomic from public;
revoke execute on function public.confirm_catalog_import_session_atomic from anon;
grant execute on function public.confirm_catalog_import_session_atomic to authenticated;

-- ============================================================
-- 6. RPC: Processar Lote (Import/Update)
-- ============================================================
create or replace function public.import_products_batch_atomic(
  p_import_session_id uuid,
  p_batch_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_session public.catalog_import_sessions;
  v_batch public.catalog_import_session_batches;
  v_row record;
  v_prod_id uuid;
  v_var_id uuid;
  v_created_count integer := 0;
  v_updated_count integer := 0;
  v_error_count integer := 0;
begin
  v_user_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem processar lotes.';
  end if;

  -- Lock the batch row
  select * into v_batch from public.catalog_import_session_batches
  where session_id = p_import_session_id and batch_number = p_batch_number
  for update;

  if not found then
    raise exception 'Lote % não encontrado para a sessão %', p_batch_number, p_import_session_id;
  end if;

  if v_batch.status = 'completed' then
    return jsonb_build_object('success', true, 'message', 'Lote já concluído');
  end if;

  -- Verify session
  select * into v_session from public.catalog_import_sessions
  where id = p_import_session_id;

  if v_session.status not in ('confirmed', 'processing') then
    raise exception 'A sessão não está pronta para processamento (status: %)', v_session.status;
  end if;

  -- Mark session as processing if needed
  if v_session.status = 'confirmed' then
    update public.catalog_import_sessions
    set status = 'processing', started_at = coalesce(started_at, now())
    where id = p_import_session_id;
  end if;

  -- Mark batch as processing
  update public.catalog_import_session_batches
  set status = 'processing', started_at = coalesce(started_at, now())
  where id = v_batch.id;

  -- Iterate over valid rows in this batch
  for v_row in (
    select * from public.catalog_import_session_rows
    where session_id = p_import_session_id
      and raw_row_number >= v_batch.rows_start
      and raw_row_number <= v_batch.rows_end
      and validation_status != 'error'
  ) loop
    begin
      -- Try to find existing product
      select id into v_prod_id from public.products where sku = v_row.sku;
      
      if v_prod_id is null then
        -- Insert new product
        insert into public.products (
          sku, name, slug, unit, min_quantity, multiple_quantity, is_active, is_published, created_at, updated_at
        ) values (
          v_row.sku, v_row.name, v_row.sku || '-' || gen_random_uuid(), v_row.unit, 1, 1, 
          not v_row.is_inactive, 
          case when not v_row.is_inactive then v_session.publish_products else false end,
          now(), now()
        ) returning id into v_prod_id;

        -- Insert primary variant
        insert into public.product_variants (
          product_id, sku, name, is_active, barcode, min_quantity, multiple_quantity, created_at, updated_at
        ) values (
          v_prod_id, v_row.sku, v_row.name, not v_row.is_inactive, v_row.barcode, 1, 1, now(), now()
        ) returning id into v_var_id;

        -- Initialize inventory with 0
        insert into public.inventories (product_id, variant_id, quantity_available, quantity_reserved)
        values (v_prod_id, v_var_id, 0, 0);

        v_created_count := v_created_count + 1;
      else
        -- Update existing product
        update public.products
        set name = v_row.name,
            unit = v_row.unit,
            is_active = not v_row.is_inactive,
            is_published = case when not v_row.is_inactive then v_session.publish_products else false end,
            updated_at = now()
        where id = v_prod_id;

        select id into v_var_id from public.product_variants where product_id = v_prod_id and sku = v_row.sku;
        
        if v_var_id is not null then
          update public.product_variants
          set name = v_row.name,
              barcode = v_row.barcode,
              is_active = not v_row.is_inactive,
              updated_at = now()
          where id = v_var_id;
        else
          insert into public.product_variants (
            product_id, sku, name, is_active, barcode, min_quantity, multiple_quantity, created_at, updated_at
          ) values (
            v_prod_id, v_row.sku, v_row.name, not v_row.is_inactive, v_row.barcode, 1, 1, now(), now()
          ) returning id into v_var_id;
          
          -- Initialize inventory if missing
          if not exists (select 1 from public.inventories where product_id = v_prod_id and variant_id = v_var_id) then
             insert into public.inventories (product_id, variant_id, quantity_available, quantity_reserved)
             values (v_prod_id, v_var_id, 0, 0);
          end if;
        end if;
        v_updated_count := v_updated_count + 1;
      end if;

      -- Handle Price (only if valid sale_price is provided and > 0, otherwise if 0 it shouldn't be active)
      if v_session.price_table_id is not null and v_row.sale_price is not null then
        insert into public.price_table_products (
          price_table_id, product_id, variant_id, unit_price, is_active, min_quantity, created_at, updated_at
        ) values (
          v_session.price_table_id, v_prod_id, v_var_id, v_row.sale_price, (v_row.sale_price > 0), 1, now(), now()
        )
        on conflict (price_table_id, product_id, variant_id, min_quantity)
        do update set
          unit_price = excluded.unit_price,
          is_active = (excluded.unit_price > 0),
          updated_at = now();
      end if;

    exception when others then
      v_error_count := v_error_count + 1;
      update public.catalog_import_session_rows
      set validation_status = 'error',
          errors = errors || jsonb_build_array(jsonb_build_object('type', 'db_error', 'message', SQLERRM))
      where id = v_row.id;
    end;
  end loop;

  -- Finalize batch
  update public.catalog_import_session_batches
  set status = case when v_error_count > 0 then 'completed'::public.catalog_import_batch_status else 'completed'::public.catalog_import_batch_status end,
      created_count = v_created_count,
      updated_count = v_updated_count,
      error_count = v_batch.error_count + v_error_count,
      completed_at = now()
  where id = v_batch.id;

  return jsonb_build_object('success', true, 'created', v_created_count, 'updated', v_updated_count, 'errors', v_error_count);
end;
$$;
revoke execute on function public.import_products_batch_atomic from public;
revoke execute on function public.import_products_batch_atomic from anon;
grant execute on function public.import_products_batch_atomic to authenticated;

-- ============================================================
-- 7. RPC: Finalizar Substituição de Catálogo
-- ============================================================
create or replace function public.finalize_catalog_replacement_atomic(
  p_import_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_session public.catalog_import_sessions;
  v_incomplete_batches integer;
  v_archived_count integer := 0;
begin
  v_user_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem finalizar substituição.';
  end if;

  select * into v_session from public.catalog_import_sessions where id = p_import_session_id for update;

  if not found then
    raise exception 'Sessão não encontrada.';
  end if;
  
  if v_session.mode != 'replace' then
    raise exception 'Esta sessão não está no modo de substituição de catálogo.';
  end if;

  if v_session.finalized_at is not null then
    return jsonb_build_object('success', true, 'message', 'Sessão já foi finalizada.');
  end if;

  -- Check if all batches are completed
  select count(*) into v_incomplete_batches from public.catalog_import_session_batches
  where session_id = p_import_session_id and status != 'completed';

  if v_incomplete_batches > 0 then
    raise exception 'Ainda existem % lotes não concluídos. Aguarde a conclusão total.', v_incomplete_batches;
  end if;

  -- Disable products whose SKU is not in this import session's valid rows
  with deactivated as (
    update public.products p
    set is_active = false, is_published = false, updated_at = now()
    where not exists (
      select 1 from public.catalog_import_session_rows r
      where r.session_id = p_import_session_id
        and r.sku = p.sku
        and r.validation_status != 'error'
    )
    returning p.id
  )
  select count(*) into v_archived_count from deactivated;

  -- Update price tables to inactive for those products
  update public.price_table_products ptp
  set is_active = false, updated_at = now()
  where not exists (
    select 1 from public.catalog_import_session_rows r
    join public.products p on p.sku = r.sku
    where r.session_id = p_import_session_id
      and p.id = ptp.product_id
      and r.validation_status != 'error'
  );

  update public.catalog_import_sessions
  set finalized_at = now(),
      status = 'completed',
      completed_at = now()
  where id = p_import_session_id;

  -- Create permanent log
  insert into public.catalog_import_logs (
    admin_id, file_name, mode, status, total_rows, created_count, updated_count, archived_count, started_at, completed_at
  )
  select
    admin_id, file_name, mode, 'completed', total_rows, 
    (select coalesce(sum(created_count), 0) from public.catalog_import_session_batches b where b.session_id = p_import_session_id),
    (select coalesce(sum(updated_count), 0) from public.catalog_import_session_batches b where b.session_id = p_import_session_id),
    v_archived_count,
    started_at, now()
  from public.catalog_import_sessions where id = p_import_session_id;

  return jsonb_build_object('success', true, 'archived_count', v_archived_count);
end;
$$;
revoke execute on function public.finalize_catalog_replacement_atomic from public;
revoke execute on function public.finalize_catalog_replacement_atomic from anon;
grant execute on function public.finalize_catalog_replacement_atomic to authenticated;

-- ============================================================
-- 8. RPC: Arquivar Todo o Catálogo (Substituto do Delete)
-- ============================================================
create or replace function public.archive_all_catalog_products_atomic(
  p_confirmation_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_archived_count integer := 0;
begin
  v_user_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem arquivar o catálogo.';
  end if;

  if p_confirmation_text != 'REMOVER TODOS OS PRODUTOS' then
    raise exception 'Texto de confirmação incorreto.';
  end if;

  -- Soft delete products
  with deactivated as (
    update public.products
    set is_active = false, is_published = false, updated_at = now()
    returning id
  )
  select count(*) into v_archived_count from deactivated;

  -- Inactivate all variants
  update public.product_variants
  set is_active = false, updated_at = now();

  -- Inactivate all commercial prices
  update public.price_table_products
  set is_active = false, updated_at = now();

  -- Log
  insert into public.audit_logs (actor_id, action, target_table, payload)
  values (v_user_id, 'CATALOG_ARCHIVED', 'products', jsonb_build_object('archived_count', v_archived_count));

  return jsonb_build_object('success', true, 'archived_count', v_archived_count);
end;
$$;
revoke execute on function public.archive_all_catalog_products_atomic from public;
revoke execute on function public.archive_all_catalog_products_atomic from anon;
grant execute on function public.archive_all_catalog_products_atomic to authenticated;

-- ============================================================
-- 9. RPC: Limpeza de Sessões Temporárias
-- ============================================================
create or replace function public.cleanup_stale_import_sessions_atomic()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_deleted_count integer := 0;
begin
  v_user_id := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado.';
  end if;

  -- Delete rows older than 7 days where status is not processing, skip locked to avoid blocking
  with deletable as (
    select id from public.catalog_import_sessions
    where created_at < now() - interval '7 days'
      and status != 'processing'
    for update skip locked
  ), deleted_sessions as (
    delete from public.catalog_import_sessions
    where id in (select id from deletable)
    returning id
  )
  select count(*) into v_deleted_count from deleted_sessions;

  return jsonb_build_object('success', true, 'deleted_sessions', v_deleted_count);
end;
$$;
revoke execute on function public.cleanup_stale_import_sessions_atomic from public;
revoke execute on function public.cleanup_stale_import_sessions_atomic from anon;
grant execute on function public.cleanup_stale_import_sessions_atomic to authenticated;
