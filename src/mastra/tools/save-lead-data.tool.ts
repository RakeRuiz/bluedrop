import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateLeadFields, logLeadEvent } from '../../server/lib/supabase-client.js';
import { setCustomField, findContactByWhatsapp } from '../../server/lib/zernio-client.js';
import type { FrancoRequestContext } from '../request-context.js';

const inputSchema = z
  .object({
    nombre: z.string().optional().describe('Nombre de pila del cliente.'),
    apellido: z.string().optional().describe('Apellido del cliente.'),
    servicio_interes: z
      .string()
      .optional()
      .describe(
        'Producto o servicio de interés (ej. bomba_dosificadora, blue_drop_shock, limpieza_trampa, lagos, aguas_residuales, antiolores_mascotas, eliminador_tuberias, blue_poop, alguicida).',
      ),
    ubicacion_merida: z.enum(['si', 'no', 'sin_confirmar']).optional(),
    zona_merida: z.string().optional().describe('norte, poniente, centro, oriente, sur o sin_identificar.'),
    nombre_negocio: z.string().optional(),
    ubicacion_negocio: z.string().optional().describe('Dirección o enlace de Google Maps del negocio.'),
    informacion_trampa: z.string().optional().describe('Tamaño, capacidad u otros datos de la trampa de grasa.'),
    problematica_actual: z.string().optional(),
    tipo_necesidad: z.string().optional().describe('preventiva, correctiva, limpieza o sin_identificar.'),
    preferencia_contacto: z.enum(['llamada', 'whatsapp']).optional(),
  })
  .partial();

export const saveLeadDataTool = createTool({
  id: 'save-lead-data',
  description:
    'Guarda en el registro del lead cualquier dato nuevo que el cliente haya confirmado (nombre, apellido, servicio de interés, ubicación, negocio, información de la trampa, problemática, tipo de necesidad, preferencia de contacto). Llámala de inmediato cada vez que confirmes un dato, no esperes al final de la conversación.',
  inputSchema,
  outputSchema: z.object({ saved: z.boolean() }),
  execute: async (params, context) => {
    const requestContext = context?.requestContext as
      | { get: (key: keyof FrancoRequestContext) => unknown }
      | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;
    const whatsappNumber = requestContext?.get('whatsappNumber') as string | undefined;

    if (!leadId) return { saved: false };

    const fields = params as Record<string, unknown>;
    const cleanFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    if (Object.keys(cleanFields).length === 0) return { saved: false };

    await updateLeadFields(leadId, cleanFields);
    await logLeadEvent(leadId, 'manual_update', { fields: cleanFields });

    if (whatsappNumber) {
      const contact = await findContactByWhatsapp(whatsappNumber).catch(() => null);
      if (contact) {
        if (cleanFields.servicio_interes) {
          await setCustomField(contact.id, 'servicio_interes', String(cleanFields.servicio_interes)).catch((error) => {
            console.error('[save-lead-data] No se pudo actualizar servicio_interes en Zernio', error);
          });
        }
        if (cleanFields.zona_merida) {
          await setCustomField(contact.id, 'zona_merida', String(cleanFields.zona_merida)).catch((error) => {
            console.error('[save-lead-data] No se pudo actualizar zona_merida en Zernio', error);
          });
        }
      }
    }

    return { saved: true };
  },
});
