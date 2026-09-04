import { getSupabaseServerClient, type Lead } from '@/lib/supabase-server';
import { isEstadoSolicitud, ESTADO_LABELS } from '@/lib/lead-status';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') ?? undefined;
  const tag = searchParams.get('tag') ?? undefined;
  const q = searchParams.get('q')?.trim() ?? undefined;

  const supabase = getSupabaseServerClient();
  let query = supabase.from('bluedrop_leads').select('*').order('last_message_at', { ascending: false, nullsFirst: false });

  if (estado && isEstadoSolicitud(estado)) query = query.eq('estado_solicitud', estado);
  if (tag) query = query.contains('tags', [tag]);
  if (q) query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,whatsapp_number.ilike.%${q}%,servicio_interes.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return new Response(`No se pudo generar el CSV: ${error.message}`, { status: 500 });
  }

  const rows = (data as Lead[] | null) ?? [];
  const header = [
    'Nombre',
    'Apellido',
    'WhatsApp',
    'Servicio de interés',
    'Ubicación Mérida',
    'Zona',
    'Negocio',
    'Estado',
    'Requiere asesor',
    'Etiquetas',
    'Último mensaje',
    'Creado',
  ];
  const lines = [header.join(',')];

  for (const lead of rows) {
    lines.push(
      [
        csvEscape(lead.nombre ?? ''),
        csvEscape(lead.apellido ?? ''),
        csvEscape(lead.whatsapp_number),
        csvEscape(lead.servicio_interes ?? ''),
        csvEscape(lead.ubicacion_merida),
        csvEscape(lead.zona_merida ?? ''),
        csvEscape(lead.nombre_negocio ?? ''),
        csvEscape(ESTADO_LABELS[lead.estado_solicitud]),
        csvEscape(lead.requiere_asesor ? 'Sí' : 'No'),
        csvEscape((lead.tags ?? []).join('; ')),
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
