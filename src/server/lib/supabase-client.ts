import { createClient } from '@supabase/supabase-js';
import type { LeadStage } from '../../lib/lead-stage.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export interface Lead {
  id: string;
  zernio_contact_id: string | null;
  whatsapp_number: string;
  name: string | null;
  stage: LeadStage;
  tags: string[];
  last_interest_topic: string | null;
  lucy_paused: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getLeadByWhatsapp(whatsappNumber: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
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
    .from('leads')
    .insert({ whatsapp_number: whatsappNumber, stage: 'nuevo' satisfies LeadStage })
    .select('*')
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function updateLeadName(leadId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function updateLeadStage(leadId: string, stage: LeadStage): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function touchLeadLastMessage(leadId: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function updateLeadInterestTopic(leadId: string, topic: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ last_interest_topic: topic, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw error;
}

export async function setLeadZernioContactId(leadId: string, zernioContactId: string): Promise<void> {
  const { error } = await supabase.from('leads').update({ zernio_contact_id: zernioContactId }).eq('id', leadId);

  if (error) throw error;
}

export async function isLucyGloballyEnabled(): Promise<boolean> {
  const { data, error } = await supabase.from('app_settings').select('lucy_enabled').eq('id', true).maybeSingle();

  if (error) {
    console.error('[supabase-client] No se pudo leer app_settings, se asume Lucy activa', error);
    return true;
  }
  // Si la fila todavía no existe (instalación sin migrar), se asume activa por defecto.
  return data?.lucy_enabled ?? true;
}

export async function logLeadEvent(
  leadId: string,
  eventType: 'message_in' | 'message_out' | 'stage_changed' | 'handoff_rene' | 'manual_update',
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('lead_events').insert({ lead_id: leadId, event_type: eventType, payload });

  if (error) throw error;
}
