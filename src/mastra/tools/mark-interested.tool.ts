import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateLeadStage, updateLeadInterestTopic, logLeadEvent, getLeadByWhatsapp } from '../../server/lib/supabase-client.js';
import { setCustomField, findContactByWhatsapp } from '../../server/lib/zernio-client.js';
import type { LucyRequestContext } from '../request-context.js';

export const markInterestedTool = createTool({
  id: 'mark-interested',
  description:
    'Marca al lead como interesado cuando pregunta por temario, fecha, sede, cupo u otros detalles del taller para decidir, sin haber preguntado todavía por formas de pago.',
  inputSchema: z.object({
    topic: z.string().optional().describe('Tema puntual que despertó el interés (temario, fecha, sede, etc.).'),
  }),
  outputSchema: z.object({ updated: z.boolean() }),
  execute: async ({ topic }, context) => {
    const requestContext = context?.requestContext as { get: (key: keyof LucyRequestContext) => unknown } | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;
    const whatsappNumber = requestContext?.get('whatsappNumber') as string | undefined;

    if (!leadId) return { updated: false };

    const lead = await getLeadByWhatsapp(whatsappNumber ?? '').catch(() => null);
    const previousStage = lead?.stage ?? 'nuevo';
    if (previousStage === 'en_seguimiento_pago' || previousStage === 'pagado_inscrito') {
      return { updated: false };
    }

    await updateLeadStage(leadId, 'interesado');
    if (topic) await updateLeadInterestTopic(leadId, topic);
    await logLeadEvent(leadId, 'stage_changed', { from: previousStage, to: 'interesado', topic });

    if (whatsappNumber) {
      const contact = await findContactByWhatsapp(whatsappNumber).catch(() => null);
      if (contact) {
        await setCustomField(contact.id, 'lead_stage', 'interesado').catch((error) => {
          console.error('[mark-interested] No se pudo actualizar lead_stage en Zernio', error);
        });
      }
    }

    return { updated: true };
  },
});
