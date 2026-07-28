-- Grants para as novas tabelas de importação do Excel
grant select, insert, update, delete on table 
  public.catalog_import_sessions,
  public.catalog_import_session_rows,
  public.catalog_import_session_batches,
  public.catalog_import_logs
to authenticated, service_role;
