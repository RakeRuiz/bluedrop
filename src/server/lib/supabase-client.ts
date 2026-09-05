import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EstadoSolicitud, UbicacionMerida } from '../../lib/lead-status.js';

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });
  return cachedClient;
}

// Proxy que crea el cliente real hasta el primer uso real (una llamada .from(...)),
// para que importar este módulo (ej. al arrancar Mastra Studio para chatear
// directamente con Franco sin Supabase configurado todavía) no tumbe todo el
// proceso — solo falla la operación puntual que de verdad necesite la base de datos.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export interface Lead {
  id: string;
  zernio_contact_id: string | null;
  whatsapp_number: string;
  nombre: string | null;
  apellido: string | null;
  servicio_interes: string | null;
  ubicacion_merida: UbicacionMerida;
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

export type LeadFieldUpdate = Partial<
  Pick<
    Lead,
    | 'nombre'
    | 'apellido'
    | 'servicio_interes'
    | 'ubicacion_merida'
    | 'zona_merida'
    | 'nombre_negocio'
    | 'ubicacion_negocio'
    | 'informacion_trampa'
    | 'problematica_actual'
    | 'tipo_necesidad'
    | 'preferencia_contacto'
  >
>;

export async function getLeadByWhatsapp(whatsappNumber: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('bluedrop_leads')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .maybeSingle();

  if (error) throw error;
  return data as Lead | null;
}

export async function upsertLeadSkeleton(whatsappNumber: string): Promise<Lead> {
  const existing = await getLeadByWhatsapp(whatsappNumber);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('bluedrop_leads')
    .insert({ whatsapp_number: whatsappNumber })
    .select('*')
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function updateLeadFields(leadId: string, fields: LeadFieldUpdate): Promise<void> {
  if (Object.keys(fields).length === 0) return;

  const { error } = await supabase
    .from('bluedrop_leads')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function touchLeadLastMessage(leadId: string): Promise<void> {
  const { error } = await supabase
    .from('bluedrop_leads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function appendRecursoEnviado(leadId: string, resourceKey: string): Promise<void> {
  const { data, error: readError } = await supabase
    .from('bluedrop_leads')
    .select('recurso_enviado')
    .eq('id', leadId)
    .single();
  if (readError) throw readError;

  const current: string[] = data?.recurso_enviado ?? [];
  if (current.includes(resourceKey)) return;

  const { error } = await supabase
    .from('bluedrop_leads')
    .update({ recurso_enviado: [...current, resourceKey], updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function markHandoffToAsesor(
  leadId: string,
  fields: { motivo_canalizacion: string; estado_solicitud: EstadoSolicitud; preferencia_contacto?: string },
): Promise<void> {
  const { error } = await supabase
    .from('bluedrop_leads')
    .update({ requiere_asesor: true, updated_at: new Date().toISOString(), ...fields })
    .eq('id', leadId);

  if (error) throw error;
}

export async function setLeadZernioContactId(leadId: string, zernioContactId: string): Promise<void> {
  const { error } = await supabase.from('bluedrop_leads').update({ zernio_contact_id: zernioContactId }).eq('id', leadId);

  if (error) throw error;
}

export async function markLeadError(leadId: string, error: unknown): Promise<void> {
  const { error: dbError } = await supabase
    .from('bluedrop_leads')
    .update({ estado_solicitud: 'con_error' satisfies EstadoSolicitud, franco_paused: true, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (dbError) throw dbError;

  const message = error instanceof Error ? error.message : String(error);
  await logLeadEvent(leadId, 'error', { message });
}

export async function isFrancoGloballyEnabled(): Promise<boolean> {
  const { data, error } = await supabase.from('bluedrop_app_settings').select('franco_enabled').eq('id', true).maybeSingle();

  if (error) {
    console.error('[supabase-client] No se pudo leer app_settings, se asume Franco activo', error);
    return true;
  }
  // Si la fila todavía no existe (instalación sin migrar), se asume activo por defecto.
  return data?.franco_enabled ?? true;
}

export async function logLeadEvent(
  leadId: string,
  eventType: 'message_in' | 'message_out' | 'resource_sent' | 'handoff_asesor' | 'manual_update' | 'error',
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('bluedrop_lead_events').insert({ lead_id: leadId, event_type: eventType, payload });

  if (error) throw error;
}
