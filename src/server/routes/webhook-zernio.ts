import type { Mastra } from '@mastra/core';
import { RequestContext } from '@mastra/core/request-context';
import { normalizeWhatsappNumber, threadIdForWhatsapp } from '../../mastra/memory/index.js';
import { ensureLead, markContactedIfNeeded } from '../lib/lead-lifecycle.js';
import { logLeadEvent, touchLeadLastMessage, isLucyGloballyEnabled } from '../lib/supabase-client.js';
import { sendInboxMessage } from '../lib/zernio-client.js';
import type { LucyRequestContext } from '../../mastra/request-context.js';

/**
 * Forma confirmada con un mensaje real de WhatsApp (2026-08-30):
 * { event: "message.received", message: { platform, direction, text, conversationId,
 *   sender: { phoneNumber, name, ... } }, conversation: {...}, account: {...} }
 * Se mantienen rutas alternativas como respaldo por si Zernio cambia el payload
 * para otras plataformas o versiones futuras.
 */
function pickFirst(source: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

interface ExtractedMessage {
  whatsappNumber: string;
  text: string;
  conversationId: string;
  senderName?: string;
}

function extractIncomingWhatsappMessage(payload: unknown): ExtractedMessage | null {
  const platform = pickFirst(payload, ['message.platform', 'platform']);
  if (platform && platform !== 'whatsapp') return null;

  const direction = pickFirst(payload, ['message.direction']);
  if (direction && direction !== 'incoming') return null;

  const whatsappNumber = pickFirst(payload, [
    'message.sender.phoneNumber',
    'message.sender.platformIdentifier',
    'message.from',
    'message.sender.phone',
    'contact.platformIdentifier',
    'sender.platformIdentifier',
    'sender.phone',
  ]);

  const text = pickFirst(payload, ['message.text', 'message.message', 'message.body', 'text']);

  const conversationId = pickFirst(payload, ['message.conversationId', 'conversationId']);
  const senderName = pickFirst(payload, ['message.sender.name', 'sender.name']);

  if (typeof whatsappNumber !== 'string' || typeof text !== 'string' || typeof conversationId !== 'string') {
    return null;
  }

  return {
    whatsappNumber: normalizeWhatsappNumber(whatsappNumber),
    text,
    conversationId,
    senderName: typeof senderName === 'string' ? senderName : undefined,
  };
}

// Deduplicación en memoria: Zernio puede reintentar el mismo evento (mismo `id`)
// si no le respondimos a tiempo. Como corremos un solo proceso Node, un registro
// en memoria basta — no hace falta persistirlo en Supabase.
const PROCESSED_EVENT_TTL_MS = 10 * 60 * 1000;
const processedEventIds = new Map<string, number>();

function alreadyProcessed(eventId: string | undefined): boolean {
  const now = Date.now();
  for (const [id, expiresAt] of processedEventIds) {
    if (expiresAt <= now) processedEventIds.delete(id);
  }

  if (!eventId) return false;
  if (processedEventIds.has(eventId)) return true;

  processedEventIds.set(eventId, now + PROCESSED_EVENT_TTL_MS);
  return false;
}

export async function handleZernioWebhookEvent(payload: unknown, mastra: Mastra): Promise<void> {
  const event = pickFirst(payload, ['event']);
  if (event !== 'message.received') return;

  const eventId = pickFirst(payload, ['id']);
  if (alreadyProcessed(typeof eventId === 'string' ? eventId : undefined)) {
    console.warn('[webhook-zernio] Evento ya procesado, se ignora el reintento', { eventId });
    return;
  }

  const extracted = extractIncomingWhatsappMessage(payload);
  if (!extracted) {
    console.warn('[webhook-zernio] No se pudo extraer remitente/texto/conversationId. Payload crudo:', JSON.stringify(payload));
    return;
  }

  const { whatsappNumber, text, conversationId, senderName } = extracted;

  const lead = await ensureLead(whatsappNumber);
  await touchLeadLastMessage(lead.id);
  await logLeadEvent(lead.id, 'message_in', { text });

  if (lead.lucy_paused) {
    // Un humano ya está atendiendo esta conversación: se guarda el mensaje
    // pero Lucy no genera ninguna respuesta automática.
    return;
  }

  if (!(await isLucyGloballyEnabled())) {
    // Interruptor general apagado desde el dashboard: se guarda el mensaje
    // en todos los leads, pero nadie recibe respuesta automática.
    return;
  }

  const requestContext = new RequestContext<LucyRequestContext>();
  requestContext.set('leadId', lead.id);
  requestContext.set('whatsappNumber', whatsappNumber);

  const promptText =
    !lead.name && senderName
      ? `[Nota interna, no visible para el cliente: su nombre de perfil de WhatsApp es "${senderName}". Si te parece un nombre real de persona, guárdalo con la tool save_lead_name sin preguntar. Si parece un apodo, nombre de negocio, emoji o algo que no sea un nombre de persona, no lo uses y pregúntale su nombre con naturalidad.]\n\n${text}`
      : text;

  const lucy = mastra.getAgent('lucyAgent');
  const response = await lucy.generate(promptText, {
    memory: { resource: whatsappNumber, thread: threadIdForWhatsapp(whatsappNumber) },
    requestContext,
  });

  const replyText = response.text;
  if (replyText) {
    await sendInboxMessage(conversationId, replyText);
    await logLeadEvent(lead.id, 'message_out', { text: replyText });
  }

  await markContactedIfNeeded(lead);
}
