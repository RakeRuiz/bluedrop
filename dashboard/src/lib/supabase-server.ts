import { createClient } from '@supabase/supabase-js';
import type { EstadoSolicitud } from './lead-status';

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del dashboard.');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

export interface Lead {
  id: string;
  zernio_contact_id: string | null;
  whatsapp_number: string;
  nombre: string | null;
  apellido: string | null;
  servicio_interes: string | null;
  ubicacion_merida: 'si' | 'no' | 'sin_confirmar';
  zona_merida: string | null;
  nombre_negocio: string | null;
  ubicacion_negocio: string | null;
  informacion_trampa: string | null;
  problematica_actual: string | null;
  tipo_necesidad: string | null;
  preferencia_contacto: string | null;
  recurso_enviado: string[];
  requiere_asesor: boolean;
  motivo_canalizacion: string | null;
  estado_solicitud: EstadoSolicitud;
  tags: string[];
  franco_paused: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: 'message_in' | 'message_out' | 'resource_sent' | 'handoff_asesor' | 'manual_update' | 'error';
  payload: Record<string, unknown>;
  created_at: string;
}
