import { Sparkles, MessageCircle, Flame, HandCoins, CheckCircle2, CircleSlash, type LucideIcon } from 'lucide-react';

export const LEAD_STAGES = [
  'nuevo',
  'contactado',
  'interesado',
  'en_seguimiento_pago',
  'pagado_inscrito',
  'perdido_sin_respuesta',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const STAGE_LABELS: Record<LeadStage, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  en_seguimiento_pago: 'En seguimiento de pago',
  pagado_inscrito: 'Pagado / inscrito',
  perdido_sin_respuesta: 'Perdido / sin respuesta',
};

export const STAGE_BADGE_CLASSES: Record<LeadStage, string> = {
  nuevo: 'bg-slate-500 text-white',
  contactado: 'bg-sky-500 text-white',
  interesado: 'bg-amber-500 text-white',
  en_seguimiento_pago: 'bg-brand text-brand-foreground',
  pagado_inscrito: 'bg-emerald-500 text-white',
  perdido_sin_respuesta: 'bg-red-500 text-white',
};

export const STAGE_ICONS: Record<LeadStage, LucideIcon> = {
  nuevo: Sparkles,
  contactado: MessageCircle,
  interesado: Flame,
  en_seguimiento_pago: HandCoins,
  pagado_inscrito: CheckCircle2,
  perdido_sin_respuesta: CircleSlash,
};

/** Etapas donde ya no aplica reactivar la conversación (no se marca "necesita plantilla"). */
export const TERMINAL_STAGES: readonly LeadStage[] = ['pagado_inscrito', 'perdido_sin_respuesta'];

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}
