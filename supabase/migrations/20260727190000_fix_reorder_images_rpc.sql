-- ============================================================
-- MIGRATION: Fix reorder_images RPC function locking
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
  
  if p_image_ids is null or array_length(p_image_ids, 1) is null then
    raise exception 'Array de imagens inválido ou vazio.';
  end if;

  -- Remover nulos do array (se houver) e checar unicidade no input
  select count(distinct elem), count(elem)
  into v_arr_count, i
  from unnest(p_image_ids) as elem;

  if v_arr_count != i then
    raise exception 'IDs duplicados no array.';
  end if;

  -- Validar quantidade total de imagens no banco
  select count(*) into v_db_count from public.product_images where product_id = p_product_id;
  if v_db_count != v_arr_count then
    raise exception 'O array de ordenação não contém a mesma quantidade de imagens do produto.';
  end if;

  -- Bloquear todas as imagens do produto para update
  perform 1 from public.product_images where product_id = p_product_id for update;

  -- Validar se todos os IDs pertencem ao produto
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
