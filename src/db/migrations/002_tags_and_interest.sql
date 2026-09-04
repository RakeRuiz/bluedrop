-- Migración para instalaciones existentes de Supabase (el schema.sql base ya
-- incluye estas columnas para instalaciones nuevas).
alter table leads add column if not exists tags text[] not null default '{}';
alter table leads add column if not exists last_interest_topic text;
create index if not exists leads_tags_idx on leads using gin (tags);
