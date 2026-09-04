import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateLeadStage, logLeadEvent, getLeadByWhatsapp } from '../../server/lib/supabase-client.js';
import { setCustomField, addTag, findContactByWhatsapp } from '../../server/lib/zernio-client.js';
import { notifyRene } from '../../server/lib/telegram-client.js';
import type { LucyRequestContext } from '../request-context.js';

export const handoffToReneTool = createTool({
  id: 'handoff-to-rene',
  description:
    'Úsala cuando la persona pregunta formas de pago, cómo apartar su lugar, transferencia, OXXO o Mercado Pago. Avisa a René para que dé seguimiento al pago.',
  inputSchema: z.object({
    resumen: z.string().describe('Resumen breve (1-2 frases) de qué quiere pagar/apartar la persona.'),
  }),
  outputSchema: z.object({ notified: z.boolean() }),
  execute: async ({ resumen }, context) => {
    const requestContext = context?.requestContext as { get: (key: keyof LucyRequestContext) => unknown } | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;
    const whatsappNumber = requestContext?.get('whatsappNumber') as string | undefined;

    if (!leadId || !whatsappNumber) return { notified: false };

    const lead = await getLeadByWhatsapp(whatsappNumber).catch(() => null);
    const previousStage = lead?.stage ?? 'nuevo';

    await updateLeadStage(leadId, 'en_seguimiento_pago');
    await logLeadEvent(leadId, 'stage_changed', { from: previousStage, to: 'en_seguimiento_pago' });
    await logLeadEvent(leadId, 'handoff_rene', { resumen });

    const contact = await findContactByWhatsapp(whatsappNumber).catch(() => null);
    if (contact) {
      await addTag(contact.id, 'en_seguimiento_rene').catch((error) => {
        console.error('[handoff-to-rene] No se pudo etiquetar el contacto en Zernio', error);
      });
      await setCustomField(contact.id, 'lead_stage', 'en_seguimiento_pago').catch((error) => {
        console.error('[handoff-to-rene] No se pudo actualizar lead_stage en Zernio', error);
      });
    }

    const nombre = lead?.name ?? 'Sin nombre aún';
    await notifyRene(
      `💬 Nuevo lead listo para pago\nNombre: ${nombre}\nWhatsApp: ${whatsappNumber}\nResumen: ${resumen}`,
    ).catch((error) => {
      console.error('[handoff-to-rene] No se pudo notificar a René por Telegram', error);
    });

    return { notified: true };
  },
});
