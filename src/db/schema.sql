-- Esquema para el agente Franco (Blue Drop) y su dashboard de leads.
-- Ejecutar completo en el editor SQL de Supabase antes de conectar el agente.
--
-- Nombres con prefijo bluedrop_ a propósito: este proyecto de Supabase es
-- compartido entre varios clientes, así que las tablas/índices de cada cliente
-- deben ser distinguibles a simple vista y no chocar entre sí.

create extension if not exists "pgcrypto";

create table if not exists bluedrop_leads (
  id uuid primary key default gen_random_uuid(),
  zernio_contact_id text unique,
  whatsapp_number text unique not null,
  nombre text,
  apellido text,
  -- bomba_dosificadora | blue_drop_shock | limpieza_trampa | lagos | aguas_residuales |
  -- antiolores_mascotas | eliminador_tuberias | blue_poop | alguicida | sin_identificar
  servicio_interes text,
  ubicacion_merida text not null default 'sin_confirmar'
    check (ubicacion_merida in ('si', 'no', 'sin_confirmar')),
  zona_merida text
    check (zona_merida in ('norte', 'poniente', 'centro', 'oriente', 'sur', 'sin_identificar') or zona_merida is null),
  nombre_negocio text,
  ubicacion_negocio text,
  informacion_trampa text,
  problematica_actual text,
  tipo_necesidad text
    check (tipo_necesidad in ('preventiva', 'correctiva', 'limpieza', 'sin_identificar') or tipo_necesidad is null),
  preferencia_contacto text
    check (preferencia_contacto in ('llamada', 'whatsapp') or preferencia_contacto is null),
  recurso_enviado text[] not null default '{}',
  requiere_asesor boolean not null default false,
  motivo_canalizacion text,
  estado_solicitud text not null default 'en_curso'
    check (estado_solicitud in ('en_curso', 'registrada', 'canalizada', 'cerrada', 'con_error')),
  -- Etiquetas libres que el humano administra desde el dashboard, independientes
  -- de estado_solicitud (que sigue siendo controlado por los tools del agente).
  tags text[] not null default '{}',
  -- Si es true, Franco deja de contestar automáticamente a este lead (se sigue
  -- guardando el mensaje, pero un humano toma la conversación a partir de ahí).
  franco_paused boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bluedrop_leads_estado_idx on bluedrop_leads (estado_solicitud);
create index if not exists bluedrop_leads_servicio_idx on bluedrop_leads (servicio_interes);
create index if not exists bluedrop_leads_tags_idx on bluedrop_leads using gin (tags);

create table if not exists bluedrop_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references bluedrop_leads (id) on delete cascade,
  -- event_type: message_in | message_out | resource_sent | handoff_asesor | manual_update
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bluedrop_lead_events_lead_id_idx on bluedrop_lead_events (lead_id, created_at);

-- Configuración global (una sola fila). Si el cliente pausó a un lead
-- individual, ver bluedrop_leads.franco_paused en su lugar.
create table if not exists bluedrop_app_settings (
  id boolean primary key default true,
  franco_enabled boolean not null default true,
  constraint bluedrop_app_settings_singleton check (id)
);
insert into bluedrop_app_settings (id, franco_enabled) values (true, true) on conflict (id) do nothing;

-- RLS activo: solo se accede vía SUPABASE_SERVICE_ROLE_KEY desde el servidor.
alter table bluedrop_leads enable row level security;
alter table bluedrop_lead_events enable row level security;
alter table bluedrop_app_settings enable row level security;

-- ============================================================
-- Supabase Storage (NO es SQL — se hace desde el dashboard de Supabase o vía
-- supabase-js con la service role key, no desde el editor SQL):
--
--   supabase.storage.createBucket('blue-drop-media', { public: true })
--
-- Subir a ese bucket: "Uso de Bomba Dosificadora.mp4", "Antes y Despues del
-- tratamiento trampa de grasa.mp4", "Cómo usar el Antiolores mascotas.png",
-- "Instrucciones eliminador de olores tuberias.png", y el PDF de cotización
-- ("Cotización Tratamiento trampa de grasas - Bomba dosificadora 2026.pdf").
-- Copiar cada URL pública resultante a las variables MEDIA_URL_* del .env.
-- El nombre del bucket ya es específico de Blue Drop, no necesita prefijo extra.
-- ============================================================
