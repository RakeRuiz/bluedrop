import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { markHandoffToAsesor, logLeadEvent, getLeadByWhatsapp } from '../../server/lib/supabase-client.js';
import { addTag, findContactByWhatsapp } from '../../server/lib/zernio-client.js';
import { notifyAsesor } from '../../server/lib/telegram-client.js';
import { isWithinBusinessHours } from '../../server/lib/business-hours.js';
import type { FrancoRequestContext } from '../request-context.js';

export const handoffToAsesorTool = createTool({
  id: 'handoff-to-asesor',
  description:
    'Úsala cuando el flujo indique canalizar la conversación con un asesor humano (cotizaciones personalizadas, revisión técnica, disponibilidad de ruta, lagos, aguas residuales, limpieza de trampa, o cuando el cliente pida hablar con una persona).',
  inputSchema: z.object({
    motivo_canalizacion: z.string().describe('Motivo breve por el que se canaliza (ej. "visita presencial bomba dosificadora", "cliente pidió asesor").'),
    resumen: z.string().describe('Resumen de 1-2 frases de lo que necesita el cliente.'),
    preferencia_contacto: z.enum(['llamada', 'whatsapp']).optional(),
  }),
  outputSchema: z.object({ notified: z.boolean(), withinBusinessHours: z.boolean() }),
  execute: async ({ motivo_canalizacion, resumen, preferencia_contacto }, context) => {
    const requestContext = context?.requestContext as
      | { get: (key: keyof FrancoRequestContext) => unknown }
      | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;
    const whatsappNumber = requestContext?.get('whatsappNumber') as string | undefined;

    const withinBusinessHours = isWithinBusinessHours();

    if (!leadId || !whatsappNumber) return { notified: false, withinBusinessHours };

    const estado_solicitud = withinBusinessHours ? ('canalizada' as const) : ('registrada' as const);

    await markHandoffToAsesor(leadId, {
      motivo_canalizacion,
      estado_solicitud,
      ...(preferencia_contacto ? { preferencia_contacto } : {}),
    });
    await logLeadEvent(leadId, 'handoff_asesor', { motivo_canalizacion, resumen, withinBusinessHours });

    const lead = await getLeadByWhatsapp(whatsappNumber).catch(() => null);
    const contact = await findContactByWhatsapp(whatsappNumber).catch(() => null);
    if (contact) {
      await addTag(contact.id, 'requiere_asesor').catch((error) => {
        console.error('[handoff-to-asesor] No se pudo etiquetar el contacto en Zernio', error);
      });
    }

    const nombre = [lead?.nombre, lead?.apellido].filter(Boolean).join(' ') || 'Sin nombre aún';
    let notified = true;
    await notifyAsesor(
      `💬 Nuevo lead canalizado a un asesor\nNombre: ${nombre}\nWhatsApp: ${whatsappNumber}\nMotivo: ${motivo_canalizacion}\nResumen: ${resumen}\nDentro de horario: ${withinBusinessHours ? 'sí' : 'no'}`,
    ).catch((error) => {
      console.error('[handoff-to-asesor] No se pudo notificar al equipo por Telegram', error);
      notified = false;
    });

    return { notified, withinBusinessHours };
  },
});
