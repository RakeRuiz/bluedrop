import { getSupabaseServerClient, type Lead } from '@/lib/supabase-server';
import { isLeadStage, STAGE_LABELS } from '@/lib/lead-stage';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage') ?? undefined;
  const tag = searchParams.get('tag') ?? undefined;
  const q = searchParams.get('q')?.trim() ?? undefined;

  const supabase = getSupabaseServerClient();
  let query = supabase.from('leads').select('*').order('last_message_at', { ascending: false, nullsFirst: false });

  if (stage && isLeadStage(stage)) query = query.eq('stage', stage);
  if (tag) query = query.contains('tags', [tag]);
  if (q) query = query.or(`name.ilike.%${q}%,whatsapp_number.ilike.%${q}%,last_interest_topic.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return new Response(`No se pudo generar el CSV: ${error.message}`, { status: 500 });
  }

  const rows = (data as Lead[] | null) ?? [];
  const header = ['Nombre', 'WhatsApp', 'Etapa', 'Etiquetas', 'Interés', 'Último mensaje', 'Creado'];
  const lines = [header.join(',')];

  for (const lead of rows) {
    lines.push(
      [
        csvEscape(lead.name ?? ''),
        csvEscape(lead.whatsapp_number),
        csvEscape(STAGE_LABELS[lead.stage]),
        csvEscape((lead.tags ?? []).join('; ')),
        csvEscape(lead.last_interest_topic ?? ''),
        csvEscape(lead.last_message_at ?? ''),
        csvEscape(lead.created_at),
      ].join(','),
    );
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
