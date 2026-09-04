import { TERMINAL_ESTADOS, type EstadoSolicitud } from './lead-status';

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** true si ya pasó la ventana gratuita de 24h de WhatsApp desde el último mensaje del lead. */
export function needsTemplateMessage(estado: EstadoSolicitud, lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  if (TERMINAL_ESTADOS.includes(estado)) return false;
  return Date.now() - new Date(lastMessageAt).getTime() > WHATSAPP_WINDOW_MS;
}
