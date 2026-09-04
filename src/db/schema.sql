-- Esquema para el seguimiento de leads del taller (Fase 1: agente + captura de leads).
-- Ejecutar en el editor SQL de Supabase antes de conectar el agente.

create extension if not exists "pgcrypto";

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  zernio_contact_id text unique,
  whatsapp_number text unique not null,
  name text,
  stage text not null default 'nuevo'
    check (stage in ('nuevo','contactado','interesado','en_seguimiento_pago','pagado_inscrito','perdido_sin_respuesta')),
  -- Etiquetas libres que el humano administra desde el dashboard (independientes
  -- de la etapa, que sigue siendo controlada por los tools del agente).
  tags text[] not null default '{}',
  -- Último tema de interés detectado por la tool mark-interested, para poder
  -- filtrar/buscar en el dashboard.
  last_interest_topic text,
  -- Si es true, Lucy deja de contestar automáticamente a este lead (se sigue
  -- guardando el mensaje, pero un humano toma la conversación a partir de ahí).
  lucy_paused boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_tags_idx on leads using gin (tags);

create table if not exists lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  -- event_type: message_in | message_out | stage_changed | handoff_rene | manual_update
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_id_idx on lead_events (lead_id, created_at);

-- Configuración global (una sola fila). Hoy solo tiene el apagado general de Lucy;
-- si el cliente pausó a un lead individual, ver leads.lucy_paused en su lugar.
create table if not exists app_settings (
  id boolean primary key default true,
  lucy_enabled boolean not null default true,
  constraint app_settings_singleton check (id)
);
insert into app_settings (id, lucy_enabled) values (true, true) on conflict (id) do nothing;

-- RLS activo: solo se accede vía SUPABASE_SERVICE_ROLE_KEY desde el servidor.
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table app_settings enable row level security;
