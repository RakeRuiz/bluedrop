-- Migración para instalaciones existentes de Supabase (el schema.sql base ya
-- incluye esto para instalaciones nuevas).
create table if not exists app_settings (
  id boolean primary key default true,
  lucy_enabled boolean not null default true,
  constraint app_settings_singleton check (id)
);
insert into app_settings (id, lucy_enabled) values (true, true) on conflict (id) do nothing;
alter table app_settings enable row level security;
