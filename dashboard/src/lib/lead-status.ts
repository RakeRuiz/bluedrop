import { Sparkles, Clock, HandCoins, CheckCircle2, CircleSlash, type LucideIcon } from 'lucide-react';

export const ESTADO_SOLICITUD_VALUES = ['en_curso', 'registrada', 'canalizada', 'cerrada', 'con_error'] as const;

export type EstadoSolicitud = (typeof ESTADO_SOLICITUD_VALUES)[number];

export const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  en_curso: 'En curso',
  registrada: 'Registrada (fuera de horario)',
  canalizada: 'Canalizada a asesor',
  cerrada: 'Cerrada',
  con_error: 'Con error',
};

export const ESTADO_BADGE_CLASSES: Record<EstadoSolicitud, string> = {
  en_curso: 'bg-slate-500 text-white',
  registrada: 'bg-amber-500 text-white',
  canalizada: 'bg-brand text-brand-foreground',
  cerrada: 'bg-emerald-500 text-white',
  con_error: 'bg-red-500 text-white',
};

export const ESTADO_ICONS: Record<EstadoSolicitud, LucideIcon> = {
  en_curso: Sparkles,
  registrada: Clock,
  canalizada: HandCoins,
  cerrada: CheckCircle2,
  con_error: CircleSlash,
};

/** Estados donde ya no aplica reactivar la conversación (no se marca "necesita plantilla"). */
export const TERMINAL_ESTADOS: readonly EstadoSolicitud[] = ['cerrada'];

export function isEstadoSolicitud(value: string): value is EstadoSolicitud {
  return (ESTADO_SOLICITUD_VALUES as readonly string[]).includes(value);
}
