-- ============================================================
-- MIGRATION: Correção de políticas de UPDATE em companies
-- Timestamp: 20260722185000
-- Problema: Seller conseguia fazer UPDATE em companies por estar
--           como seller_id. A RLS original de UPDATE só tinha
--           using(is_admin()), mas o trigger de proteção de campos
--           precisava cobrir seller também.
-- Solução: Reescrever o trigger para bloquear seller explicitamente
--           e remover policy duplicada de UPDATE.
-- ============================================================

-- 1. Corrigir função de proteção de campos sensíveis para bloquear seller também
create or replace function public.protect_company_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
begin
  -- Verificar role do usuário atual (via SECURITY DEFINER evita recursão)
  select p.role into current_role
  from public.profiles p
  where p.id = auth.uid();

  -- service_role (migrações, admin server-side) pode tudo
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Admin pode tudo
  if current_role = 'admin' then
    return new;
  end if;

  -- Seller e customer NÃO podem alterar campos protegidos
  if new.status is distinct from old.status then
    raise exception 'Acesso negado: apenas administradores podem alterar o status da empresa.';
  end if;

  if new.seller_id is distinct from old.seller_id then
    raise exception 'Acesso negado: apenas administradores podem atribuir ou alterar o vendedor responsável.';
  end if;

  if new.price_table_id is distinct from old.price_table_id then
    raise exception 'Acesso negado: apenas administradores podem alterar a tabela de preços da empresa.';
  end if;

  if new.internal_notes is distinct from old.internal_notes then
    raise exception 'Acesso negado: apenas administradores podem alterar as observações internas.';
  end if;

  if new.approved_at is distinct from old.approved_at or new.rejected_at is distinct from old.rejected_at then
    raise exception 'Acesso negado: apenas administradores podem alterar as datas de aprovação ou recusa.';
  end if;

  if new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Acesso negado: apenas administradores podem alterar o motivo de recusa.';
  end if;

  -- Seller não pode alterar NENHUM campo — seller é somente leitura das empresas atribuídas
  if current_role = 'seller' then
    raise exception 'Acesso negado: vendedores não podem alterar dados de empresas.';
  end if;

  return new;
end;
$$;

-- Garantir que o trigger está ativo com a função corrigida
drop trigger if exists enforce_company_sensitive_fields_protection on public.companies;
create trigger enforce_company_sensitive_fields_protection
  before update on public.companies
  for each row
  execute function public.protect_company_sensitive_fields();

-- 2. Garantir que a policy de UPDATE do schema original (admin only) ainda existe
-- A nova policy adicionada pela migration anterior permite customer atualizar
-- Seller não pode atualizar companies por nenhuma policy (além do trigger).
-- Remover a policy que permite update irrestrito do seller (se existir)
drop policy if exists "Apenas Admin atualiza status ou observações de empresas" on public.companies;

-- Recriar policy de UPDATE apenas para admin e customer (seller fica bloqueado pelo trigger)
create policy "Admin atualiza qualquer empresa"
  on public.companies for update
  using (public.is_admin());
