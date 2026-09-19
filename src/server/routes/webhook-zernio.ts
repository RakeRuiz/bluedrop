import type { Mastra } from '@mastra/core';
import { RequestContext } from '@mastra/core/request-context';
import { normalizeWhatsappNumber, threadIdForWhatsapp } from '../../mastra/memory/index.js';
import { ensureLead } from '../lib/lead-lifecycle.js';
import {
  logLeadEvent,
  touchLeadLastMessage,
  isFrancoGloballyEnabled,
  markLeadError,
  closeConversation,
} from '../lib/supabase-client.js';
import { sendInboxMessage } from '../lib/zernio-client.js';
import { reportAgentError } from '../lib/dev-alerts.js';
import type { FrancoRequestContext } from '../../mastra/request-context.js';

const FALLBACK_ERROR_MESSAGE =
  'Disculpa, tuvimos un problema técnico procesando tu mensaje. Ya avisamos a nuestro equipo y en breve un asesor te contactará directamente. 🙏';

/**
 * Forma confirmada con un mensaje real de WhatsApp (heredada de lucy-mastra,
 * 2026-08-30): { event: "message.received", message: { platform, direction, text,
 * conversationId, sender: { phoneNumber, name, ... } }, conversation: {...}, account: {...} }
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

// Llaves del working memory (ver src/mastra/memory/index.ts) — si el texto final
// del modelo es un JSON con alguna de estas llaves, es una fuga del borrador
// interno (el modelo falló al invocar la tool de memoria y la escribió como
// texto visible en su lugar) y nunca debe llegar al cliente tal cual.
const WORKING_MEMORY_TELLTALE_KEYS = [
  'flow_state',
  'ya_saludo',
  'cerrado_por_lenguaje_ofensivo',
  'recursos_ya_enviados',
  'ubicacion_merida',
];

function looksLikeInternalState(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return false;
    return WORKING_MEMORY_TELLTALE_KEYS.some((key) => key in (parsed as Record<string, unknown>));
  } catch {
    return false;
  }
}

// Detecta el patrón típico de dos oraciones "pegadas" sin espacio ni salto de
// línea entre ellas (ej. "...día!Fue un gusto..." o "...registrarlo?😊¿Me..."),
// que gpt-4.1-mini a veces produce dentro de un mismo paso (no es el mismo bug
// de duplicación entre pasos — extractFinalReplyText no lo detecta porque es
// una sola cadena). Divide el texto en esos puntos de unión, quita fragmentos
// que se repiten exactamente (sin distinguir mayúsculas/espacios), y vuelve a
// unir con un espacio normal. Solo actúa cuando hay signo de cierre/emoji
// pegado directo a una mayúscula/¡/¿ — texto ya bien formado (con espacio o
// salto de línea) no se toca.
function collapseGluedDuplicateText(text: string): string {
  const GLUE_PATTERN = /(?<=[.!?\p{Emoji_Presentation}\p{Extended_Pictographic}])(?=[A-ZÁÉÍÓÚÑ¡¿])/gu;
  const segments = text
    .split(GLUE_PATTERN)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length <= 1) return text;

  const seen = new Set<string>();
  const deduped = segments.filter((segment) => {
    const key = segment.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.join(' ');
}

/**
 * gpt-4.1-mini a veces escribe texto visible tanto en el paso donde llama a una
 * tool como en el paso final tras ver el resultado, y Mastra concatena ambos en
 * `response.text` — el cliente recibe el mismo mensaje repetido. En vez de
 * depender de que el modelo respete la instrucción de no hacerlo, nos quedamos
 * solo con el texto del ÚLTIMO paso no vacío y que no sea una fuga del working
 * memory. Si no queda ningún texto válido, devuelve null — el llamador debe
 * tratarlo como una falla real (nunca mandar el JSON ni quedarse callado).
 */
function extractFinalReplyText(response: { text: string; steps?: unknown }): string | null {
  const steps = Array.isArray(response.steps) ? (response.steps as Array<{ text?: unknown }>) : [];
  const stepTexts = steps
    .map((step) => (typeof step.text === 'string' ? step.text.trim() : ''))
    .filter((stepText) => stepText.length > 0 && !looksLikeInternalState(stepText));

  if (stepTexts.length > 0) return collapseGluedDuplicateText(stepTexts[stepTexts.length - 1]);

  const fallback = response.text?.trim();
  if (fallback && !looksLikeInternalState(fallback)) return collapseGluedDuplicateText(fallback);

  return null;
}

// gpt-4.1-mini no siempre llama a `close_conversation` aunque el mensaje que
// manda sea claramente una despedida de cierre (confirmado en pruebas: mismo
// prompt, misma conversación, un intento sí llama la tool y otro no). Como
// respaldo, revisamos los pasos de la respuesta por evidencia de que el
// modelo SÍ decidió cerrar — ya sea que la tool se haya llamado, o que haya
// guardado `conversacion_cerrada: true` vía `updateWorkingMemory` (esta tool
// interna acepta tanto `{memory: {...}}` como los campos sueltos, y ambas
// formas se han visto en pruebas reales) — y forzamos el cierre en código,
// sin depender de que la tool se haya ejecutado.
function shouldForceCloseConversation(response: { steps?: unknown }): boolean {
  const steps = Array.isArray(response.steps)
    ? (response.steps as Array<{ toolCalls?: unknown }>)
    : [];

  for (const step of steps) {
    const toolCalls = Array.isArray(step.toolCalls)
      ? (step.toolCalls as Array<{ payload?: { toolName?: string; args?: unknown } }>)
      : [];

    for (const call of toolCalls) {
      const toolName = call.payload?.toolName;
      if (toolName === 'closeConversationTool' || toolName === 'close-conversation') return true;

      if (toolName === 'updateWorkingMemory') {
        const args = call.payload?.args as
          | { memory?: { conversacion_cerrada?: boolean }; conversacion_cerrada?: boolean }
          | undefined;
        if (args?.memory?.conversacion_cerrada === true || args?.conversacion_cerrada === true) return true;
      }
    }
  }

  return false;
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

// Si dos mensajes del mismo número llegan casi juntos (un cliente escribiendo
// rápido, o un reintento de red), se procesan uno tras otro, nunca en paralelo
// — procesarlos a la vez generaría dos respuestas independientes de Franco
// para el mismo hilo, duplicando envíos y arriesgando el límite de mensajes
// de WhatsApp por destinatario.
const leadProcessingQueue = new Map<string, Promise<void>>();

function runSerially(key: string, task: () => Promise<void>): Promise<void> {
  const previous = leadProcessingQueue.get(key) ?? Promise.resolve();
  const current = previous.then(task, task);
  current.finally(() => {
    if (leadProcessingQueue.get(key) === current) leadProcessingQueue.delete(key);
  });
  return current;
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

  await runSerially(whatsappNumber, async () => {
    const lead = await ensureLead(whatsappNumber);
    await touchLeadLastMessage(lead.id);
    await logLeadEvent(lead.id, 'message_in', { text });

    if (lead.franco_paused) {
      // Un humano ya está atendiendo esta conversación: se guarda el mensaje
      // pero Franco no genera ninguna respuesta automática.
      return;
    }

    if (!(await isFrancoGloballyEnabled())) {
      // Interruptor general apagado desde el dashboard: se guarda el mensaje
      // en todos los leads, pero nadie recibe respuesta automática.
      return;
    }

    const requestContext = new RequestContext<FrancoRequestContext>();
    requestContext.set('leadId', lead.id);
    requestContext.set('whatsappNumber', whatsappNumber);
    requestContext.set('conversationId', conversationId);

    const promptText =
      !lead.nombre && senderName
        ? `[Nota interna, no visible para el cliente: su nombre de perfil de WhatsApp es "${senderName}". Si te parece un nombre real de persona, guárdalo con la tool save_lead_data (campo nombre) sin preguntar. Si parece un apodo, nombre de negocio, emoji o algo que no sea un nombre de persona, no lo uses y pregúntale su nombre con naturalidad cuando el flujo lo requiera.]\n\n${text}`
        : text;

    try {
      const franco = mastra.getAgent('francoAgent');
      const response = await franco.generate(promptText, {
        memory: { resource: whatsappNumber, thread: threadIdForWhatsapp(whatsappNumber) },
        requestContext,
      });

      if (shouldForceCloseConversation(response)) {
        await closeConversation(lead.id).catch((closeError) => {
          console.error('[webhook-zernio] No se pudo forzar el cierre de la conversación', closeError);
        });
      }

      const replyText = extractFinalReplyText(response);
      if (replyText === null) {
        throw new Error('El modelo no generó una respuesta de texto válida (posible fuga de estado interno).');
      }
      if (replyText) {
        await sendInboxMessage(conversationId, replyText);
        await logLeadEvent(lead.id, 'message_out', { text: replyText });
      }
    } catch (error) {
      // Algo falló generando o mandando la respuesta de Franco para este cliente
      // en particular. Se pausa SOLO este lead (un humano debe reactivarlo desde
      // el dashboard tras resolver el problema) — el resto de la operación sigue
      // normal para todos los demás leads.
      console.error('[webhook-zernio] Error generando o enviando la respuesta de Franco', error);

      await markLeadError(lead.id, error).catch((markError) => {
        console.error('[webhook-zernio] No se pudo marcar el lead con error', markError);
      });

      await sendInboxMessage(conversationId, FALLBACK_ERROR_MESSAGE).catch((sendError) => {
        console.error('[webhook-zernio] No se pudo enviar el mensaje de disculpa al cliente', sendError);
      });

      reportAgentError('webhook-zernio-generate-or-send', error, { leadId: lead.id, whatsappNumber });
    }
  });
}
