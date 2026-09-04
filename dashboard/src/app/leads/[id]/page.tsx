import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BellRing, PauseCircle, PlayCircle, X } from 'lucide-react';
import { getSupabaseServerClient, type Lead, type LeadEvent } from '@/lib/supabase-server';
import { STAGE_LABELS, STAGE_BADGE_CLASSES } from '@/lib/lead-stage';
import { needsTemplateMessage } from '@/lib/needs-template';
import { markPaid, markLost, reopenAsInterested, addTag, removeTag, pauseLucy, resumeLucy } from './actions';
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
  message_out: 'Respuesta de Lucy',
  stage_changed: 'Cambio de etapa',
  handoff_rene: 'Aviso al equipo',
  manual_update: 'Actualización',
};

/** Convierte el payload técnico de cada evento en una línea legible para el historial. */
function describeEvent(event: LeadEvent): string | null {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (event.event_type) {
    case 'message_in':
    case 'message_out':
      return typeof payload.text === 'string' ? payload.text : null;

    case 'stage_changed': {
      const to = typeof payload.to === 'string' ? payload.to : null;
      const label = to && to in STAGE_LABELS ? STAGE_LABELS[to as keyof typeof STAGE_LABELS] : to;
      const topic = typeof payload.topic === 'string' ? payload.topic : null;
      if (!label) return null;
      return topic ? `Ahora: ${label} — interés en: ${topic}` : `Ahora: ${label}`;
    }

    case 'handoff_rene':
      return typeof payload.resumen === 'string' ? payload.resumen : null;

    case 'manual_update': {
      if (payload.field === 'tags') {
        if (typeof payload.added === 'string') return `Se agregó la etiqueta "${payload.added}"`;
        if (typeof payload.removed === 'string') return `Se quitó la etiqueta "${payload.removed}"`;
      }
      if (payload.field === 'name' && typeof payload.value === 'string') {
        return `Se guardó el nombre: ${payload.value}`;
      }
      if (payload.field === 'lucy_paused') {
        return payload.value ? 'Lucy fue pausada para este lead' : 'Lucy fue reactivada para este lead';
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

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) notFound();
  const typedLead = lead as Lead;

  const { data: allLeadsTags } = await supabase.from('leads').select('tags');
  const tagSet = new Set<string>();
  for (const row of allLeadsTags ?? []) {
    for (const tag of row.tags ?? []) tagSet.add(tag);
  }
  const currentTags = new Set(typedLead.tags ?? []);
  const suggestableTags = Array.from(tagSet)
    .filter((tag) => !currentTags.has(tag))
    .sort();

  const { data: events } = await supabase
    .from('lead_events')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  const alertNeeded = needsTemplateMessage(typedLead.stage, typedLead.last_message_at);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" />
        Volver a leads
      </Link>

      <header className="mt-4 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{typedLead.name ?? 'Sin nombre'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{typedLead.whatsapp_number}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={STAGE_BADGE_CLASSES[typedLead.stage]}>
            {STAGE_LABELS[typedLead.stage]}
          </Badge>
          {typedLead.lucy_paused ? (
            <form action={resumeLucy}>
              <input type="hidden" name="leadId" value={typedLead.id} />
              <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <PlayCircle className="size-4" />
                Reactivar a Lucy
              </Button>
            </form>
          ) : (
            <form action={pauseLucy}>
              <input type="hidden" name="leadId" value={typedLead.id} />
              <Button type="submit" size="sm" variant="destructive">
                <PauseCircle className="size-4" />
                Pausar a Lucy
              </Button>
            </form>
          )}
        </div>
      </header>

      {typedLead.lucy_paused && (
        <Alert className="mb-6 border-slate-300 bg-slate-100 text-slate-800">
          <PauseCircle className="size-4" />
          <AlertDescription>
            Lucy está pausada para este lead — sus mensajes se siguen guardando aquí, pero ella ya no contesta
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
        <div className="col-span-2">
          <p className="text-muted-foreground">Último interés</p>
          <p className="text-foreground">{typedLead.last_interest_topic ?? '—'}</p>
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
        <form action={markPaid}>
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700">Marcar pagado / inscrito</Button>
        </form>
        <form action={markLost}>
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Button variant="destructive">Marcar perdido / sin respuesta</Button>
        </form>
        <form action={reopenAsInterested}>
          <input type="hidden" name="leadId" value={typedLead.id} />
          <Button variant="outline">Reabrir como interesado</Button>
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
