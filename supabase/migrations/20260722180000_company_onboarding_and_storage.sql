-- ============================================================
-- MIGRATION: Company Onboarding, Documents & Storage RLS Policies
-- Timestamp: 20260722180000
-- ============================================================

-- 1. Colunas aditivas na tabela public.companies
alter table public.companies
  add column if not exists submitted_at timestamp with time zone,
  add column if not exists rejection_reason text;

-- 2. Garantir criação do bucket privado "company-documents" no Supabase Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  10485760, -- 10MB limit
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 3. Função SECURITY DEFINER para checar acesso aos documentos da empresa no Storage
create or replace function public.can_access_company_document(path text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
  user_id uuid;
begin
  user_id := auth.uid();
  if user_id is null then
    return false;
  end if;

  -- Admin sempre pode acessar
  if public.is_admin() then
    return true;
  end if;

  -- Extrai o primeiro segmento do caminho (ID da empresa)
  begin
    target_company_id := (string_to_array(path, '/'))[1]::uuid;
  exception when others then
    return false;
  end;

  -- Checa se o perfil do usuário pertence à empresa ou se o vendedor é responsável
  return exists (
    select 1 from public.profiles p
    where p.id = user_id and p.company_id = target_company_id
  ) or exists (
    select 1 from public.companies c
    where c.id = target_company_id and c.seller_id = user_id
  );
end;
$$;

-- 4. Policies de RLS em storage.objects para o bucket company-documents
drop policy if exists "Leitura de documentos da empresa ou admin" on storage.objects;
create policy "Leitura de documentos da empresa ou admin"
  on storage.objects for select
  using (
    bucket_id = 'company-documents'
    and public.can_access_company_document(name)
  );

drop policy if exists "Upload de documentos da própria empresa" on storage.objects;
create policy "Upload de documentos da própria empresa"
  on storage.objects for insert
  with check (
    bucket_id = 'company-documents'
    and public.can_access_company_document(name)
  );

drop policy if exists "Exclusão de documentos da empresa" on storage.objects;
create policy "Exclusão de documentos da empresa"
  on storage.objects for delete
  using (
    bucket_id = 'company-documents'
    and public.can_access_company_document(name)
  );

-- 5. Trigger para impedir que clientes alterem campos protegidos em public.companies
create or replace function public.protect_company_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Se for admin ou service_role, permite todas as alterações
  if public.is_admin() then
    return new;
  end if;

  -- Se for usuário comum, não pode alterar status, seller_id, price_table_id, internal_notes, approved_at, rejected_at
  if new.status is distinct from old.status then
    raise exception 'Apenas administradores podem alterar o status da empresa.';
  end if;

  if new.seller_id is distinct from old.seller_id then
    raise exception 'Apenas administradores podem atribuir ou alterar o vendedor responsável.';
  end if;

  if new.price_table_id is distinct from old.price_table_id then
    raise exception 'Apenas administradores podem alterar a tabela de preços da empresa.';
  end if;

  if new.internal_notes is distinct from old.internal_notes then
    raise exception 'Apenas administradores podem alterar as observações internas.';
  end if;

  if new.approved_at is distinct from old.approved_at or new.rejected_at is distinct from old.rejected_at then
    raise exception 'Apenas administradores podem alterar as datas de aprovação ou recusa.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_company_sensitive_fields_protection on public.companies;
create trigger enforce_company_sensitive_fields_protection
  before update on public.companies
  for each row
  execute function public.protect_company_sensitive_fields();

-- 6. Policy de UPDATE para que os clientes possam atualizar seus próprios dados de empresa quando pending/rejected
drop policy if exists "Cliente atualiza dados da própria empresa" on public.companies;
create policy "Cliente atualiza dados da própria empresa"
  on public.companies for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = companies.id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = companies.id
    )
  );

-- 7. Policies para company_documents (UPDATE / DELETE)
drop policy if exists "Cliente ou Admin atualiza documentos" on public.company_documents;
create policy "Cliente ou Admin atualiza documentos"
  on public.company_documents for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = company_documents.company_id
    )
  );

drop policy if exists "Cliente ou Admin remove documentos" on public.company_documents;
create policy "Cliente ou Admin remove documentos"
  on public.company_documents for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = company_documents.company_id
    )
  );

-- 8. Policies para notifications e audit_logs
drop policy if exists "Usuário insere notificações" on public.notifications;
create policy "Usuário insere notificações"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Usuário insere audit logs" on public.audit_logs;
create policy "Usuário insere audit logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');

-- 9. Grants de Data API
grant select, insert, update, delete on public.company_documents to authenticated, service_role;
grant select, insert, update on public.notifications to authenticated, service_role;
grant select, insert on public.audit_logs to authenticated, service_role;
