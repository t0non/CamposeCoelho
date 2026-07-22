-- ============================================================
-- 20260722164500_fix_rls_infinite_recursion.sql
-- Migration para correção de recursão infinita em RLS policies
-- ============================================================

-- 1. Criar/redefinir funções auxiliares SECURITY DEFINER isoladas (com search_path seguro)
create or replace function public.get_my_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'::user_role
  );
$$;

create or replace function public.is_seller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller'::user_role
  );
$$;

create or replace function public.user_belongs_to_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.company_id = target_company_id
  ) or exists (
    select 1 from public.company_members cm
    where cm.profile_id = auth.uid() and cm.company_id = target_company_id
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    left join public.companies c on c.id = p.company_id
    where p.id = auth.uid()
      and (
        p.role in ('admin'::user_role, 'seller'::user_role)
        or (p.role = 'customer'::user_role and c.status = 'approved'::company_status)
      )
  );
$$;

-- Grant de execução das funções de RLS
grant execute on function public.get_my_role to authenticated;
grant execute on function public.is_admin to authenticated;
grant execute on function public.is_seller to authenticated;
grant execute on function public.user_belongs_to_company to authenticated;
grant execute on function public.is_approved to authenticated;

-- 2. Recriar Policies sem ciclos de recursão

-- PROFILES
drop policy if exists "Usuário lê o próprio perfil ou perfis permitidos" on public.profiles;
drop policy if exists "Usuário atualiza o próprio perfil sem alterar role/status" on public.profiles;

create policy "Usuário lê o próprio perfil ou perfis permitidos"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin()
    or (
      public.is_seller() and exists (
        select 1 from public.companies c
        where c.seller_id = auth.uid() and c.id = profiles.company_id
      )
    )
  );

create policy "Usuário atualiza o próprio perfil sem alterar role/status"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- COMPANIES
drop policy if exists "Cliente lê apenas sua própria empresa, vendedor lê atribuídos, admin lê todas" on public.companies;
drop policy if exists "Cliente cria empresa" on public.companies;
drop policy if exists "Apenas Admin atualiza status ou observações de empresas" on public.companies;

create policy "Cliente lê apenas sua própria empresa, vendedor lê atribuídos, admin lê todas"
  on public.companies for select
  using (
    public.is_admin()
    or seller_id = auth.uid()
    or public.user_belongs_to_company(id)
  );

create policy "Cliente cria empresa"
  on public.companies for insert
  with check (auth.role() = 'authenticated');

create policy "Apenas Admin atualiza status ou observações de empresas"
  on public.companies for update
  using (public.is_admin());

-- COMPANY_MEMBERS
drop policy if exists "Membros veem membros da sua empresa" on public.company_members;
create policy "Membros veem membros da sua empresa"
  on public.company_members for select
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or public.user_belongs_to_company(company_id)
  );
