-- ============================================================
-- 20260722165500_prevent_role_escalation_trigger.sql
-- Trigger de segurança para impedir escalação de privilégio em profiles
-- ============================================================

create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Se a alteração não for realizada por admin, proibir mudança de role e status
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Apenas administradores podem alterar a função (role) de um perfil.';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Apenas administradores podem alterar o status de um perfil.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_escalation_protection on public.profiles;

create trigger enforce_profile_escalation_protection
  before update on public.profiles
  for each row
  execute procedure public.prevent_profile_escalation();
