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
    where is_active = true or is_published = true
    returning id
  )
  select count(*) into v_archived_count from deactivated;

  -- Inactivate all variants
  update public.product_variants
  set is_active = false, updated_at = now()
  where is_active = true;

  -- Inactivate all commercial prices
  update public.price_table_products
  set is_active = false, updated_at = now()
  where is_active = true;

  -- Log
  insert into public.audit_logs (actor_id, action, target_table, payload)
  values (v_user_id, 'CATALOG_ARCHIVED', 'products', jsonb_build_object('archived_count', v_archived_count));

  return jsonb_build_object('success', true, 'archived_count', v_archived_count);
end;
$$;
