'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function getLucyGlobalEnabled(): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('app_settings').select('lucy_enabled').eq('id', true).maybeSingle();

    if (error) {
      console.error('[actions] No se pudo leer app_settings', error);
      return true;
    }
    return data?.lucy_enabled ?? true;
  } catch (error) {
    // No debe tronar el build/render (ej. si faltan las variables de entorno de
    // Supabase en el paso de build de Docker) — se asume Lucy activa por defecto.
    console.error('[actions] No se pudo leer el estado de Lucy', error);
    return true;
  }
}

export async function setLucyGlobalEnabled(formData: FormData) {
  const enabled = formData.get('enabled') === 'true';
  const supabase = getSupabaseServerClient();

  await supabase.from('app_settings').upsert({ id: true, lucy_enabled: enabled });

  revalidatePath('/', 'layout');
}

export async function addTagToMany(formData: FormData) {
  const leadIds = formData.getAll('leadId').map(String).filter(Boolean);
  const tag = String(formData.get('tag') ?? '').trim();
  if (leadIds.length === 0 || !tag) return;

  const supabase = getSupabaseServerClient();

  for (const leadId of leadIds) {
    const { data: current } = await supabase.from('leads').select('tags').eq('id', leadId).maybeSingle();
    const tags = Array.from(new Set([...(current?.tags ?? []), tag]));
    await supabase.from('leads').update({ tags, updated_at: new Date().toISOString() }).eq('id', leadId);
    await supabase
      .from('lead_events')
      .insert({ lead_id: leadId, event_type: 'manual_update', payload: { field: 'tags', added: tag, bulk: true } });
  }

  revalidatePath('/');
}
