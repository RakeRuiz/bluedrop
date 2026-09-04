import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { RESOURCE_CATALOG, type ResourceKey } from '../resources/resource-catalog.js';
import { sendInboxAttachment } from '../../server/lib/zernio-client.js';
import { appendRecursoEnviado, logLeadEvent } from '../../server/lib/supabase-client.js';
import type { FrancoRequestContext } from '../request-context.js';

const resourceKeys = Object.keys(RESOURCE_CATALOG) as [ResourceKey, ...ResourceKey[]];

export const sendResourceTool = createTool({
  id: 'send-resource',
  description:
    'Envía un video, imagen o PDF autorizado por su clave (VIDEO_USO_BOMBA_DOSIFICADORA, VIDEO_ANTES_Y_DESPUES_TRAMPA, IMAGEN_USO_ANTIODORES_MASCOTAS, IMAGEN_USO_ELIMINADOR_TUBERIAS, PDF_COTIZACION_BOMBA). Si el recurso no está configurado todavía, responde not_configured — nunca inventes el archivo ni digas que lo enviaste.',
  inputSchema: z.object({
    resourceKey: z.enum(resourceKeys),
    caption: z.string().optional().describe('Texto breve opcional para acompañar el adjunto.'),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    reason: z.enum(['not_configured', 'send_failed']).optional(),
  }),
  execute: async ({ resourceKey, caption }, context) => {
    const requestContext = context?.requestContext as
      | { get: (key: keyof FrancoRequestContext) => unknown }
      | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;
    const conversationId = requestContext?.get('conversationId') as string | undefined;

    const resource = RESOURCE_CATALOG[resourceKey];
    if (!resource?.url) {
      return { sent: false, reason: 'not_configured' as const };
    }
    if (!conversationId) {
      return { sent: false, reason: 'send_failed' as const };
    }

    try {
      await sendInboxAttachment(conversationId, resource.url, resource.type, caption);
    } catch (error) {
      console.error('[send-resource] No se pudo enviar el adjunto vía Zernio', error);
      return { sent: false, reason: 'send_failed' as const };
    }

    if (leadId) {
      await appendRecursoEnviado(leadId, resourceKey).catch((error) => {
        console.error('[send-resource] No se pudo registrar recurso_enviado', error);
      });
      await logLeadEvent(leadId, 'resource_sent', { resourceKey }).catch((error) => {
        console.error('[send-resource] No se pudo registrar el evento resource_sent', error);
      });
    }

    return { sent: true };
  },
});
