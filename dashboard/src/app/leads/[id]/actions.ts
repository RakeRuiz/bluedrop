'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { LeadStage } from '@/lib/lead-stage';

async function setStage(leadId: string, stage: LeadStage, reason: string) {
  if (!leadId) return;
  const supabase = getSupabaseServerClient();

  const { data: current } = await supabase.from('leads').select('stage').eq('id', leadId).maybeSingle();

  await supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase
    .from('lead_events')
    .insert({ lead_id: leadId, event_type: 'stage_changed', payload: { from: current?.stage ?? null, to: stage, reason } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}

export async function markPaid(formData: FormData) {
  await setStage(String(formData.get('leadId') ?? ''), 'pagado_inscrito', 'manual_dashboard');
}

export async function markLost(formData: FormData) {
  await setStage(String(formData.get('leadId') ?? ''), 'perdido_sin_respuesta', 'manual_dashboard');
}

export async function reopenAsInterested(formData: FormData) {
  await setStage(String(formData.get('leadId') ?? ''), 'interesado', 'manual_dashboard');
}

export async function addTag(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '');
  const tag = String(formData.get('tag') ?? '').trim();
  if (!leadId || !tag) return;

  const supabase = getSupabaseServerClient();
  const { data: current } = await supabase.from('leads').select('tags').eq('id', leadId).maybeSingle();
  const tags = Array.from(new Set([...(current?.tags ?? []), tag]));

  await supabase.from('leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase.from('lead_events').insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'tags', added: tag } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}

async function setLucyPaused(leadId: string, paused: boolean) {
  if (!leadId) return;
  const supabase = getSupabaseServerClient();

  await supabase.from('leads').update({ lucy_paused: paused, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase
    .from('lead_events')
    .insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'lucy_paused', value: paused } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}

export async function pauseLucy(formData: FormData) {
  await setLucyPaused(String(formData.get('leadId') ?? ''), true);
}

export async function resumeLucy(formData: FormData) {
  await setLucyPaused(String(formData.get('leadId') ?? ''), false);
}

export async function removeTag(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '');
  const tag = String(formData.get('tag') ?? '');
  if (!leadId || !tag) return;

  const supabase = getSupabaseServerClient();
  const { data: current } = await supabase.from('leads').select('tags').eq('id', leadId).maybeSingle();
  const tags = (current?.tags ?? []).filter((existing: string) => existing !== tag);

  await supabase.from('leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', leadId);
  await supabase.from('lead_events').insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'tags', removed: tag } });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/');
}
