import { createClient } from '@supabase/supabase-js';
import type { LeadStage } from './lead-stage';

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
  name: string | null;
  stage: LeadStage;
  tags: string[];
  last_interest_topic: string | null;
  lucy_paused: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: 'message_in' | 'message_out' | 'stage_changed' | 'handoff_rene' | 'manual_update';
  payload: Record<string, unknown>;
  created_at: string;
}
