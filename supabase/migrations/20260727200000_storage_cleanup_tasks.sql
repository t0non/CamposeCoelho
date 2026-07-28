-- ============================================================
-- MIGRATION: Fila Persistente de Limpeza do Storage
-- Timestamp: 20260727200000
-- ============================================================

create table if not exists public.storage_cleanup_tasks (
  id              uuid        primary key default gen_random_uuid(),
  bucket_id       text        not null,
  object_path     text        not null,
  operation       text        not null,
  source_table    text,
  source_id       uuid,
  status          text        not null default 'pending',
  attempts        integer     not null default 0,
  last_error      text,
  next_retry_at   timestamptz not null default now(),
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,
  constraint storage_cleanup_tasks_status_check
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint storage_cleanup_tasks_operation_check
    check (operation in ('delete', 'replace'))
);

-- Habilitar RLS
alter table public.storage_cleanup_tasks enable row level security;

-- Policies: Somente admin consulta e gerencia
drop policy if exists "Admin gerencia tarefas de limpeza de storage" on public.storage_cleanup_tasks;
create policy "Admin gerencia tarefas de limpeza de storage"
  on public.storage_cleanup_tasks for all
  using (public.is_admin())
  with check (public.is_admin());

-- Índice para busca de tarefas pendentes
create index if not exists storage_cleanup_tasks_pending_idx
  on public.storage_cleanup_tasks (status, next_retry_at, created_at)
  where status = 'pending';

-- Índece parcial para evitar tarefas pendentes duplicadas para o mesmo objeto/operação
create unique index if not exists storage_cleanup_tasks_unique_pending_idx
  on public.storage_cleanup_tasks (bucket_id, object_path, operation)
  where status in ('pending', 'processing');

-- ============================================================
-- RPC: register_storage_cleanup_task
-- Registrar uma tarefa persistente de limpeza evitando duplicadas
-- ============================================================
create or replace function public.register_storage_cleanup_task(
  p_bucket_id text,
  p_object_path text,
  p_operation text default 'delete',
  p_source_table text default null,
  p_source_id uuid default null,
  p_last_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_task_id uuid;
begin
  v_uid := auth.uid();
  if not public.is_admin() then
    raise exception 'Acesso negado: Requer privilégios de administrador.';
  end if;

  insert into public.storage_cleanup_tasks (
    bucket_id,
    object_path,
    operation,
    source_table,
    source_id,
    status,
    last_error,
    created_by
  )
  values (
    p_bucket_id,
    p_object_path,
    p_operation,
    p_source_table,
    p_source_id,
    'pending',
    substring(p_last_error from 1 for 500), -- Sanitizar erro sem secrets
    v_uid
  )
  on conflict (bucket_id, object_path, operation) where status in ('pending', 'processing')
  do update set
    attempts = public.storage_cleanup_tasks.attempts + 1,
    last_error = substring(p_last_error from 1 for 500),
    updated_at = now()
  returning id into v_task_id;

  return jsonb_build_object('success', true, 'task_id', v_task_id);
end;
$$;

revoke execute on function public.register_storage_cleanup_task(text, text, text, text, uuid, text) from public, anon;
grant execute on function public.register_storage_cleanup_task(text, text, text, text, uuid, text) to authenticated;
