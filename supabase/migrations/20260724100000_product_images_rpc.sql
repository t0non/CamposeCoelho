-- ============================================================
-- MIGRATION: Imagens de Produto (RPCs Transacionais e Segurança)
-- ============================================================

-- 1. Índice Parcial Único para Imagem Principal
create unique index if not exists product_images_single_primary_idx
  on public.product_images (product_id)
  where is_primary = true;

-- ============================================================
-- RPC: register_product_image
-- Registra uma nova imagem no banco e cria audit_log.
-- ============================================================
create or replace function public.register_product_image(
  p_product_id uuid,
  p_url text,
  p_alt_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_image_id uuid;
  v_is_primary boolean := false;
  v_count integer;
  v_result jsonb;
begin
  v_uid := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: Requer privilégios de administrador.';
  end if;

  -- Bloquear o produto em shared mode para garantir existência
  perform 1 from public.products where id = p_product_id for share;
  if not found then
    raise exception 'Produto inexistente: %', p_product_id;
  end if;

  -- Se for a primeira imagem, ela se torna a principal
  select count(*) into v_count from public.product_images where product_id = p_product_id;
  if v_count = 0 then
    v_is_primary := true;
  end if;

  -- Inserir imagem
  insert into public.product_images (product_id, url, alt_text, position, is_primary)
  values (p_product_id, p_url, p_alt_text, v_count, v_is_primary)
  returning id into v_image_id;

  -- Audit Log
  insert into public.audit_logs (actor_id, action, target_table, target_id, payload)
  values (v_uid, 'PRODUCT_IMAGE_UPLOADED', 'product_images', v_image_id, jsonb_build_object(
    'product_id', p_product_id,
    'url', p_url,
    'is_primary', v_is_primary,
    'position', v_count
  ));

  v_result := jsonb_build_object('id', v_image_id, 'url', p_url, 'is_primary', v_is_primary, 'position', v_count);
  return v_result;
end;
$$;

revoke execute on function public.register_product_image(uuid, text, text) from public, anon;
grant execute on function public.register_product_image(uuid, text, text) to authenticated;

-- ============================================================
-- RPC: replace_product_image
-- Substitui a URL de uma imagem existente e retorna a URL antiga.
-- ============================================================
create or replace function public.replace_product_image(
  p_image_id uuid,
  p_product_id uuid,
  p_new_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_old_url text;
  v_result jsonb;
begin
  v_uid := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: Requer privilégios de administrador.';
  end if;

  select url into v_old_url from public.product_images where id = p_image_id and product_id = p_product_id for update;
  if not found then
    raise exception 'Imagem inexistente ou não pertence ao produto informado.';
  end if;

  update public.product_images
  set url = p_new_url
  where id = p_image_id;

  -- Audit Log
  insert into public.audit_logs (actor_id, action, target_table, target_id, payload)
  values (v_uid, 'PRODUCT_IMAGE_REPLACED', 'product_images', p_image_id, jsonb_build_object(
    'product_id', p_product_id,
    'old_url', v_old_url,
    'new_url', p_new_url
  ));

  v_result := jsonb_build_object('id', p_image_id, 'old_url', v_old_url, 'new_url', p_new_url);
  return v_result;
end;
$$;

revoke execute on function public.replace_product_image(uuid, uuid, text) from public, anon;
grant execute on function public.replace_product_image(uuid, uuid, text) to authenticated;

-- ============================================================
-- RPC: remove_product_image
-- Remove uma imagem do banco e retorna sua URL.
-- ============================================================
create or replace function public.remove_product_image(
  p_image_id uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_old_url text;
  v_is_primary boolean;
  v_result jsonb;
begin
  v_uid := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: Requer privilégios de administrador.';
  end if;

  select url, is_primary into v_old_url, v_is_primary from public.product_images where id = p_image_id and product_id = p_product_id for update;
  if not found then
    raise exception 'Imagem inexistente ou não pertence ao produto informado.';
  end if;

  delete from public.product_images where id = p_image_id;

  -- Se era a imagem principal, tentar eleger outra
  if v_is_primary then
    update public.product_images
    set is_primary = true
    where id = (
      select id from public.product_images
      where product_id = p_product_id
      order by position asc, created_at asc
      limit 1
    );
  end if;

  -- Reordenar as restantes para fechar buracos
  with numbered as (
    select id, row_number() over (order by position asc, created_at asc) - 1 as new_pos
    from public.product_images
    where product_id = p_product_id
  )
  update public.product_images pi
  set position = n.new_pos
  from numbered n
  where pi.id = n.id and pi.position is distinct from n.new_pos;

  -- Audit Log
  insert into public.audit_logs (actor_id, action, target_table, target_id, payload)
  values (v_uid, 'PRODUCT_IMAGE_REMOVED', 'product_images', p_image_id, jsonb_build_object(
    'product_id', p_product_id,
    'url', v_old_url,
    'was_primary', v_is_primary
  ));

  v_result := jsonb_build_object('id', p_image_id, 'url', v_old_url);
  return v_result;
end;
$$;

revoke execute on function public.remove_product_image(uuid, uuid) from public, anon;
grant execute on function public.remove_product_image(uuid, uuid) to authenticated;

-- ============================================================
-- RPC: set_primary_image
-- Define a imagem principal e desmarca a antiga.
-- ============================================================
create or replace function public.set_primary_image(
  p_image_id uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_result jsonb;
begin
  v_uid := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: Requer privilégios de administrador.';
  end if;

  perform 1 from public.product_images where id = p_image_id and product_id = p_product_id;
  if not found then
    raise exception 'Imagem inexistente ou não pertence ao produto informado.';
  end if;

  -- Bloquear registros do produto para evitar concorrência
  perform 1 from public.product_images where product_id = p_product_id for update;

  update public.product_images
  set is_primary = false
  where product_id = p_product_id and is_primary = true;

  update public.product_images
  set is_primary = true
  where id = p_image_id;

  -- Audit Log
  insert into public.audit_logs (actor_id, action, target_table, target_id, payload)
  values (v_uid, 'PRODUCT_IMAGE_PRIMARY_CHANGED', 'product_images', p_image_id, jsonb_build_object(
    'product_id', p_product_id
  ));

  v_result := jsonb_build_object('id', p_image_id, 'success', true);
  return v_result;
end;
$$;

revoke execute on function public.set_primary_image(uuid, uuid) from public, anon;
grant execute on function public.set_primary_image(uuid, uuid) to authenticated;

-- ============================================================
-- RPC: reorder_images
-- Reordena imagens de acordo com um array de UUIDs.
-- ============================================================
create or replace function public.reorder_images(
  p_product_id uuid,
  p_image_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_db_count integer;
  v_arr_count integer;
  v_result jsonb;
  i integer;
begin
  v_uid := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: Requer privilégios de administrador.';
  end if;

  -- Remover nulos do array (se houver) e checar unicidade no input
  select count(distinct unnest), count(*)
  into v_arr_count, i
  from unnest(p_image_ids);

  if v_arr_count != i then
    raise exception 'IDs duplicados no array.';
  end if;

  -- Validar quantidade total de imagens no banco
  select count(*) into v_db_count from public.product_images where product_id = p_product_id;
  if v_db_count != v_arr_count then
    raise exception 'O array de ordenação não contém a mesma quantidade de imagens do produto.';
  end if;

  -- Validar se todos os IDs pertencem ao produto (bloqueando para update)
  perform id from public.product_images where product_id = p_product_id and id = any(p_image_ids) for update;
  select count(*) into i from public.product_images where product_id = p_product_id and id = any(p_image_ids);
  if i != v_db_count then
    raise exception 'Existem imagens no array que não pertencem ao produto, ou imagem inexistente.';
  end if;

  -- Executar atualização
  for i in 1..array_length(p_image_ids, 1) loop
    update public.product_images
    set position = i - 1
    where id = p_image_ids[i];
  end loop;

  -- Audit Log
  insert into public.audit_logs (actor_id, action, target_table, target_id, payload)
  values (v_uid, 'PRODUCT_IMAGE_REORDERED', 'product_images', p_product_id, jsonb_build_object(
    'product_id', p_product_id,
    'new_order', p_image_ids
  ));

  v_result := jsonb_build_object('success', true);
  return v_result;
end;
$$;

revoke execute on function public.reorder_images(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_images(uuid, uuid[]) to authenticated;
