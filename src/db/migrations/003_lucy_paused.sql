-- Migración para instalaciones existentes de Supabase (el schema.sql base ya
-- incluye esta columna para instalaciones nuevas).
alter table leads add column if not exists lucy_paused boolean not null default false;
