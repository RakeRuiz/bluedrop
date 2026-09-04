import Link from 'next/link';
import { Download } from 'lucide-react';
import { getSupabaseServerClient, type Lead } from '@/lib/supabase-server';
import { ESTADO_SOLICITUD_VALUES, ESTADO_LABELS, ESTADO_ICONS, isEstadoSolicitud, type EstadoSolicitud } from '@/lib/lead-status';
import { LeadsTable } from '@/components/leads-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const SORT_FIELDS = ['nombre', 'last_message_at'] as const;
type SortField = (typeof SORT_FIELDS)[number];

function isSortField(value: string): value is SortField {
  return (SORT_FIELDS as readonly string[]).includes(value);
}

export default async function DashboardPage(props: PageProps<'/'>) {
  const searchParams = await props.searchParams;
  const estadoParam = typeof searchParams.estado === 'string' ? searchParams.estado : undefined;
  const activeEstado = estadoParam && isEstadoSolicitud(estadoParam) ? estadoParam : undefined;
  const activeTag = typeof searchParams.tag === 'string' ? searchParams.tag : undefined;
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  const sortParam = typeof searchParams.sort === 'string' ? searchParams.sort : undefined;
  const sort: SortField = sortParam && isSortField(sortParam) ? sortParam : 'last_message_at';
  const dir: 'asc' | 'desc' = searchParams.dir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(typeof searchParams.page === 'string' ? searchParams.page : '1') || 1);

  const supabase = getSupabaseServerClient();

  const { data: allLeads, error: countError } = await supabase.from('bluedrop_leads').select('id, estado_solicitud, tags');

  const counts = Object.fromEntries(ESTADO_SOLICITUD_VALUES.map((estado) => [estado, 0])) as Record<
    EstadoSolicitud,
    number
  >;
  const tagSet = new Set<string>();
  for (const lead of allLeads ?? []) {
    const estado = lead.estado_solicitud as EstadoSolicitud;
    if (estado in counts) counts[estado] += 1;
    for (const tag of lead.tags ?? []) tagSet.add(tag);
  }
  const total = allLeads?.length ?? 0;
  const allTags = Array.from(tagSet).sort();

  let query = supabase
    .from('bluedrop_leads')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: dir === 'asc', nullsFirst: false });

  if (activeEstado) query = query.eq('estado_solicitud', activeEstado);
  if (activeTag) query = query.contains('tags', [activeTag]);
  if (q)
    query = query.or(
      `nombre.ilike.%${q}%,apellido.ilike.%${q}%,whatsapp_number.ilike.%${q}%,servicio_interes.ilike.%${q}%`,
    );

  const from = (page - 1) * PAGE_SIZE;
  const { data: leads, error: leadsError, count: filteredCount } = await query.range(from, from + PAGE_SIZE - 1);

  const resultCount = filteredCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));

  const baseParams: Record<string, string> = {};
  if (activeEstado) baseParams.estado = activeEstado;
  if (activeTag) baseParams.tag = activeTag;
  if (q) baseParams.q = q;

  const exportParams = new URLSearchParams(baseParams);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(baseParams);
    params.set('sort', sort);
    params.set('dir', dir);
    params.set('page', String(targetPage));
    return `/?${params.toString()}`;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads de Blue Drop</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seguimiento de conversaciones de Franco por WhatsApp.</p>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/export?${exportParams.toString()}`}>
            <Download className="size-4" />
            Descargar CSV
          </a>
        </Button>
      </div>

      {(countError || leadsError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>No se pudo leer Supabase: {countError?.message ?? leadsError?.message}</AlertDescription>
        </Alert>
      )}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-center transition ${
            !activeEstado ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card hover:border-brand/40'
          }`}
        >
          <div className="text-2xl font-semibold">{total}</div>
          <div className="text-xs">Todos</div>
        </Link>
        {ESTADO_SOLICITUD_VALUES.map((estado) => {
          const Icon = ESTADO_ICONS[estado];
          const pct = total > 0 ? Math.round((counts[estado] / total) * 100) : 0;
          const active = activeEstado === estado;
          return (
            <Link
              key={estado}
              href={`/?estado=${estado}`}
              className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-center transition ${
                active ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card hover:border-brand/40'
              }`}
            >
              <Icon className="size-4 opacity-80" />
              <div className="text-2xl font-semibold">{counts[estado]}</div>
              <div className="text-xs">{ESTADO_LABELS[estado]}</div>
              <div className={`h-1 w-full rounded-full ${active ? 'bg-brand-foreground/30' : 'bg-muted'}`}>
                <div
                  className={`h-1 rounded-full ${active ? 'bg-brand-foreground' : 'bg-brand'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </section>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/">
        {activeEstado && <input type="hidden" name="estado" value={activeEstado} />}
        <Input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, WhatsApp o servicio..."
          className="w-full max-w-sm"
        />
        {allTags.length > 0 && (
          <select
            name="tag"
            defaultValue={activeTag ?? ''}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todas las etiquetas</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
        <Button type="submit">Buscar</Button>
        {(activeEstado || activeTag || q) && (
          <Button asChild variant="ghost">
            <Link href="/">Limpiar</Link>
          </Button>
        )}
      </form>

      <Card className="overflow-x-auto p-0">
        <LeadsTable leads={(leads as Lead[] | null) ?? []} allTags={allTags} baseParams={baseParams} sort={sort} dir={dir} />
        <div className="flex items-center justify-between gap-4 border-t px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{resultCount}</span> resultado(s)
          </p>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
                Anterior
              </Link>
            </Button>
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              Página {page} de {pageCount}
            </span>
            <Button asChild variant="outline" size="sm" disabled={page >= pageCount}>
              <Link href={pageHref(Math.min(pageCount, page + 1))} aria-disabled={page >= pageCount}>
                Siguiente
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
