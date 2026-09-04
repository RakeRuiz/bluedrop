'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, ChevronsUpDown, BellRing, PauseCircle, Plus } from 'lucide-react';
import type { Lead } from '@/lib/supabase-server';
import { STAGE_LABELS, STAGE_BADGE_CLASSES } from '@/lib/lead-stage';
import { needsTemplateMessage } from '@/lib/needs-template';
import { addTagToMany } from '@/app/actions';
import { addTag } from '@/app/leads/[id]/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Etiquetas ya usadas antes, como botones para dar clic en vez de escribir. */
function ExistingTagChips({ tags, onPick }: { tags: string[]; onPick: (tag: string) => void }) {
  if (tags.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted-foreground">O elige una que ya usaste:</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onPick(tag)}
            className="rounded-full border border-input px-2.5 py-1 text-xs hover:bg-muted"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickAddTagDialog({ leadId, allTags }: { leadId: string; allTags: string[] }) {
  const [open, setOpen] = useState(false);

  async function submit(tag: string) {
    if (!tag.trim()) return;
    const formData = new FormData();
    formData.set('leadId', leadId);
    formData.set('tag', tag.trim());
    await addTag(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="rounded-full border border-dashed border-input p-0.5 text-muted-foreground hover:bg-muted" aria-label="Agregar etiqueta">
          <Plus className="size-3" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar etiqueta</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await submit(String(formData.get('tag') ?? ''));
          }}
          className="space-y-4"
        >
          <Input name="tag" placeholder="Nombre de la etiqueta (ej. VIP)" autoFocus />
          <ExistingTagChips tags={allTags} onPick={submit} />
          <DialogFooter>
            <Button type="submit">Agregar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SortField = 'name' | 'last_message_at';

export function LeadsTable({
  leads,
  allTags,
  baseParams,
  sort,
  dir,
}: {
  leads: Lead[];
  allTags: string[];
  baseParams: Record<string, string>;
  sort: SortField;
  dir: 'asc' | 'desc';
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  function sortHref(field: SortField) {
    const nextDir = sort === field && dir === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams(baseParams);
    params.set('sort', field);
    params.set('dir', nextDir);
    return `/?${params.toString()}`;
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />;
    return dir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(leads.map((l) => l.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submitBulkTag(tag: string) {
    if (!tag.trim()) return;
    const formData = new FormData();
    for (const id of selected) formData.append('leadId', id);
    formData.set('tag', tag.trim());
    await addTagToMany(formData);
    setSelected(new Set());
    setDialogOpen(false);
  }

  const allSelected = leads.length > 0 && selected.size === leads.length;

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tabular-nums">{selected.size} seleccionado(s)</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Limpiar
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Agregar etiqueta a los seleccionados
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar etiqueta a {selected.size} lead(s)</DialogTitle>
              </DialogHeader>
              <form
                action={async (formData) => {
                  await submitBulkTag(String(formData.get('tag') ?? ''));
                }}
                className="space-y-4"
              >
                <Input name="tag" placeholder="Nombre de la etiqueta (ej. VIP)" autoFocus />
                <ExistingTagChips tags={allTags} onPick={submitBulkTag} />
                <DialogFooter>
                  <Button type="submit">Agregar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleAll(checked === true)} aria-label="Seleccionar todos" />
            </TableHead>
            <TableHead>
              <Link href={sortHref('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                Nombre
                <SortIcon field="name" />
              </Link>
            </TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Etiquetas</TableHead>
            <TableHead>
              <Link href={sortHref('last_message_at')} className="inline-flex items-center gap-1 hover:text-foreground">
                Último mensaje
                <SortIcon field="last_message_at" />
              </Link>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const alertNeeded = needsTemplateMessage(lead.stage, lead.last_message_at);
            return (
              <TableRow key={lead.id} data-state={selected.has(lead.id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(lead.id)}
                    onCheckedChange={(checked) => toggleOne(lead.id, checked === true)}
                    aria-label={`Seleccionar ${lead.name ?? lead.whatsapp_number}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/leads/${lead.id}`} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
                    {lead.lucy_paused && (
                      <span title="Lucy pausada — un humano debe contestar">
                        <PauseCircle className="size-3.5 text-slate-500" />
                      </span>
                    )}
                    {lead.name ?? 'Sin nombre'}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{lead.whatsapp_number}</TableCell>
                <TableCell>
                  <Badge className={STAGE_BADGE_CLASSES[lead.stage]}>{STAGE_LABELS[lead.stage]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {(lead.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    <QuickAddTagDialog leadId={lead.id} allTags={allTags} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {formatDate(lead.last_message_at)}
                    {alertNeeded && (
                      <span title="Fuera de la ventana de 24h: solo se le puede escribir con una plantilla aprobada.">
                        <BellRing className="size-3.5 text-amber-600" />
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Todavía no hay leads que mostrar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
