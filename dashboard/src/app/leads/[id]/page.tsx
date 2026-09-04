import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BellRing, PauseCircle, PlayCircle, X } from 'lucide-react';
import { getSupabaseServerClient, type Lead, type LeadEvent } from '@/lib/supabase-server';
import { ESTADO_LABELS, ESTADO_BADGE_CLASSES } from '@/lib/lead-status';
import { needsTemplateMessage } from '@/lib/needs-template';
import { markCerrada, markConError, reopenEnCurso, addTag, removeTag, pauseFranco, resumeFranco } from './actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EVENT_LABELS: Record<LeadEvent['event_type'], string> = {
  message_in: 'Mensaje del cliente',
  message_out: 'Respuesta de Franco',
  resource_sent: 'Recurso enviado',
  handoff_asesor: 'Canalización a asesor',
  manual_update: 'Actualización',
};

const FIELD_LABELS: Record<string, string> = {
  nombre: 'nombre',
  apellido: 'apellido',
  servicio_interes: 'servicio de interés',
  ubicacion_merida: 'ubicación en Mérida',
  zona_merida: 'zona',
  nombre_negocio: 'negocio',
  ubicacion_negocio: 'ubicación del negocio',
  informacion_trampa: 'información de la trampa',
  problematica_actual: 'problemática',
  tipo_necesidad: 'tipo de necesidad',
  preferencia_contacto: 'preferencia de contacto',
};

/** Convierte el payload técnico de cada evento en una línea legible para el historial. */
function describeEvent(event: LeadEvent): string | null {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (event.event_type) {
    case 'message_in':
    case 'message_out':
      return typeof payload.text === 'string' ? payload.text : null;

    case 'resource_sent':
      return typeof payload.resourceKey === 'string' ? `Se envió: ${payload.resourceKey}` : null;

    case 'handoff_asesor': {
      const resumen = typeof payload.resumen === 'string' ? payload.resumen : null;
      const dentroHorario = payload.withinBusinessHours === false ? ' (fuera de horario)' : '';
      return resumen ? `${resumen}${dentroHorario}` : null;
    }

    case 'manual_update': {
      if (payload.field === 'tags') {
        if (typeof payload.added === 'string') return `Se agregó la etiqueta "${payload.added}"`;
        if (typeof payload.removed === 'string') return `Se quitó la etiqueta "${payload.removed}"`;
      }
      if (payload.field === 'franco_paused') {
        return payload.value ? 'Franco fue pausado para este lead' : 'Franco fue reactivado para este lead';
      }
      if (payload.field === 'estado_solicitud' && typeof payload.to === 'string') {
        const label = payload.to in ESTADO_LABELS ? ESTADO_LABELS[payload.to as keyof typeof ESTADO_LABELS] : payload.to;
        return `Ahora: ${label}`;
      }
      if (payload.fields && typeof payload.fields === 'object') {
        const fields = payload.fields as Record<string, unknown>;
        const parts = Object.entries(fields).map(([key, value]) => `${FIELD_LABELS[key] ?? key}: ${String(value)}`);
        return parts.length > 0 ? `Se guardó — ${parts.join(', ')}` : null;
      }
      return null;
    }

    default:
      return null;
  }
}

export default async function LeadDetailPage(props: PageProps<'/leads/[id]'>) {
  const { id } = await props.params;
  const supabase = getSupabaseServerClient();

  const { data: lead } = await supabase.from('bluedrop_leads').select('*').eq('id', id).maybeSingle();
  if (!lead) notFound();
  const typedLead = lead as Lead;

  const { data: allLeadsTags } = await supabase.from('bluedrop_leads').select('tags');
  const tagSet = new Set<string>();
  for (const row of allLeadsTags ?? []) {
    for (const tag of row.tags ?? []) tagSet.add(tag);
  }
  const currentTags = new Set(typedLead.tags ?? []);
  const suggestableTags = Array.from(tagSet)
    .filter((tag) => !currentTags.has(tag))
    .sort();

  const { data: events } = await supabase
    .from('bluedrop_lead_events')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  const alertNeeded = needsTemplateMessage(typedLead.estado_solicitud, typedLead.last_message_at);
  const leadName = [typedLead.nombre, typedLead.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre';

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" />
        Volver a leads
      </Link>

      <header className="mt-4 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{leadName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{typedLead.whatsapp_number}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={ESTADO_BADGE_CLASSES[typedLead.estado_solicitud]}>
            {ESTADO_LABELS[typedLead.estado_solicitud]}
          </Badge>
          {typedLead.franco_paused ? (
            <form action={resumeFranco}>
              <input type="hidden" name="leadId" value={typedLead.id} />
              <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <PlayCircle className="size-4" />
                Reactivar a Franco
              </Button>
            </form>
          ) : (
            <form action={pauseFranco}>
              <input type="hidden" name="leadId" value={typedLead.id} />
              <Button type="submit" size="sm" variant="destructive">
                <PauseCircle className="size-4" />
                Pausar a Franco
              </Button>
            </form>
          )}
        </div>
      </header>

      {typedLead.franco_paused && (
        <Alert className="mb-6 border-slate-300 bg-slate-100 text-slate-800">
          <PauseCircle className="size-4" />
          <AlertDescription>
            Franco está pausado para este lead — sus mensajes se siguen guardando aquí, pero ya no contesta
            automáticamente. Alguien del equipo debe darle seguimiento a mano.
          </AlertDescription>
        </Alert>
      )}

      {alertNeeded && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900">
          <BellRing className="size-4" />
          <AlertDescription>
            Pasaron más de 24h desde el último mensaje — WhatsApp ya no permite texto libre. Para volver a escribirle
            hay que usar una plantilla aprobada.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-4 p-4 text-sm">
        <div>
          <p className="text-muted-foreground">Primer contacto</p>
          <p className="text-foreground">{formatDate(typedLead.created_at)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Último mensaje</p>
          <p className="text-foreground">{formatDate(typedLead.last_message_at)}</p>
        </div>
      </Card>

      <Card className="mb-6 grid grid-cols-2 gap-4 p-4 text-sm">
        <div className="col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Servicio</p>
        </div>
        <div>
          <p className="text-muted-foreground">Servicio de interés</p>
          <p className="text-foreground">{typedLead.servicio_interes ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tipo de necesidad</p>
          <p className="text-foreground">{typedLead.tipo_necesidad ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Información de la trampa</p>
          <p className="text-foreground">{typedLead.informacion_trampa ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Problemática actual</p>
          <p className="text-foreground">{typedLead.problematica_actual ?? '—'}</p>
        </div>
      </Card>

      <Card className="mb-6 grid grid-cols-2 gap-4 p-4 text-sm">
        <div className="col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Ubicación</p>
        </div>
        <div>
          <p className="text-muted-foreground">¿En Mérida?</p>
          <p className="text-foreground">{typedLead.ubicacion_merida}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Zona</p>
          <p className="text-foreground">{typedLead.zona_merida ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Negocio</p>
          <p className="text-foreground">{typedLead.nombre_negocio ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Dirección / Maps</p>
          <p className="text-foreground">{typedLead.ubicacion_negocio ?? '—'}</p>
        </div>
      </Card>

      <Card className="mb-6 grid grid-cols-2 gap-4 p-4 text-sm">
        <div className="col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Canalización</p>
        </div>
        <div>
          <p className="text-muted-foreground">Requiere asesor</p>
          <p className="text-foreground">{typedLead.requiere_asesor ? 'Sí' : 'No'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Preferencia de contacto</p>
          <p className="text-foreground">{typedLead.preferencia_contacto ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Motivo de canalización</p>
          <p className="text-foreground">{typedLead.motivo_canalizacion ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Recursos enviados</p>
          <p className="text-foreground">{(typedLead.recurso_enviado ?? []).join(', ') || '—'}</p>
        </div>
      </Card>

      <section className="mb-6">
        <p className="mb-2 text-sm font-semibold text-foreground">Etiquetas</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(typedLead.tags ?? []).map((tag) => (
            <form key={tag} action={removeTag}>
              <input type="hidden" name="leadId" value={typedLead.id} />
              <input type="hidden" name="tag" value={tag} />
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                <button type="submit" aria-label={`Quitar etiqueta ${tag}`} className="rounded-full hover:bg-muted-foreground/20">
                  <X className="size-3" />
                </button>
              </Badge>
            </form>
          ))}
          {(typedLead.tags ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin etiquetas todavía.</p>}
        </div>
        <form action={addTag} className="mb-3 flex gap-2">
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Input name="tag" placeholder="Nueva etiqueta (ej. VIP, referido)" className="max-w-xs" />
          <Button type="submit" variant="outline">
            Agregar
          </Button>
        </form>
        {suggestableTags.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">O elige una que ya usaste:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestableTags.map((tag) => (
                <form key={tag} action={addTag}>
                  <input type="hidden" name="leadId" value={typedLead.id} />
                  <input type="hidden" name="tag" value={tag} />
                  <button type="submit" className="rounded-full border border-input px-2.5 py-1 text-xs hover:bg-muted">
                    {tag}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mb-8 flex flex-wrap gap-2">
        <form action={markCerrada}>
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700">Marcar cerrada</Button>
        </form>
        <form action={markConError}>
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Button variant="destructive">Marcar con error</Button>
        </form>
        <form action={reopenEnCurso}>
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Button variant="outline">Reabrir como en curso</Button>
        </form>
      </section>

      <h2 className="mb-3 text-sm font-semibold text-foreground">Historial</h2>
      <ol className="space-y-3 border-l border-border pl-4">
        {(events as LeadEvent[] | null)?.map((event) => {
          const detail = describeEvent(event);
          return (
            <li key={event.id}>
              <div className="text-xs text-muted-foreground">{formatDate(event.created_at)}</div>
              <div className="text-sm font-medium text-foreground">{EVENT_LABELS[event.event_type] ?? event.event_type}</div>
              {detail && <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>}
            </li>
          );
        })}
        {(!events || events.length === 0) && <li className="text-sm text-muted-foreground">Sin eventos registrados todavía.</li>}
      </ol>
    </main>
  );
}
