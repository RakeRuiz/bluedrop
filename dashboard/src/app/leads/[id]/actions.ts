'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { EstadoSolicitud } from '@/lib/lead-status';

async function setEstadoSolicitud(leadId: string, estado: EstadoSolicitud, reason: string) {
  if (!leadId) return;
  const supabase = getSupabaseServerClient();

  const { data: current } = await supabase.from('bluedrop_leads').select('estado_solicitud').eq('id', leadId).maybeSingle();

  await supabase.from('bluedrop_leads').update({ estado_solicitud: estado, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase.from('bluedrop_lead_events').insert({
    lead_id: leadId,
    event_type: 'manual_update',
    payload: { field: 'estado_solicitud', from: current?.estado_solicitud ?? null, to: estado, reason },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}

export async function markCerrada(formData: FormData) {
  await setEstadoSolicitud(String(formData.get('leadId') ?? ''), 'cerrada', 'manual_dashboard');
}

export async function markConError(formData: FormData) {
  await setEstadoSolicitud(String(formData.get('leadId') ?? ''), 'con_error', 'manual_dashboard');
}

export async function reopenEnCurso(formData: FormData) {
  await setEstadoSolicitud(String(formData.get('leadId') ?? ''), 'en_curso', 'manual_dashboard');
}

export async function addTag(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '');
  const tag = String(formData.get('tag') ?? '').trim();
  if (!leadId || !tag) return;

  const supabase = getSupabaseServerClient();
  const { data: current } = await supabase.from('bluedrop_leads').select('tags').eq('id', leadId).maybeSingle();
  const tags = Array.from(new Set([...(current?.tags ?? []), tag]));

  await supabase.from('bluedrop_leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase.from('bluedrop_lead_events').insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'tags', added: tag } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}

async function setFrancoPaused(leadId: string, paused: boolean) {
  if (!leadId) return;
  const supabase = getSupabaseServerClient();

  await supabase.from('bluedrop_leads').update({ franco_paused: paused, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase
    .from('bluedrop_lead_events')
    .insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'franco_paused', value: paused } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}

export async function pauseFranco(formData: FormData) {
  await setFrancoPaused(String(formData.get('leadId') ?? ''), true);
}

export async function resumeFranco(formData: FormData) {
  await setFrancoPaused(String(formData.get('leadId') ?? ''), false);
}

export async function removeTag(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '');
  const tag = String(formData.get('tag') ?? '');
  if (!leadId || !tag) return;

  const supabase = getSupabaseServerClient();
  const { data: current } = await supabase.from('bluedrop_leads').select('tags').eq('id', leadId).maybeSingle();
  const tags = (current?.tags ?? []).filter((existing: string) => existing !== tag);

  await supabase.from('bluedrop_leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase.from('bluedrop_lead_events').insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'tags', removed: tag } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}
