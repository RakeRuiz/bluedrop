import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { updateLeadName, logLeadEvent } from '../../server/lib/supabase-client.js';
import { updateContactName, findContactByWhatsapp } from '../../server/lib/zernio-client.js';
import type { LucyRequestContext } from '../request-context.js';

export const saveLeadNameTool = createTool({
  id: 'save-lead-name',
  description: 'Guarda el nombre de la persona con la que Lucy está conversando, en cuanto lo comparta.',
  inputSchema: z.object({
    name: z.string().describe('Nombre (o nombre y apellido) que dio la persona.'),
  }),
  outputSchema: z.object({ saved: z.boolean() }),
  execute: async ({ name }, context) => {
    const requestContext = context?.requestContext as { get: (key: keyof LucyRequestContext) => unknown } | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;

    if (!leadId) {
      return { saved: false };
    }

    await updateLeadName(leadId, name);
    await logLeadEvent(leadId, 'manual_update', { field: 'name', value: name });

    const whatsappNumber = requestContext?.get('whatsappNumber') as string | undefined;
    if (whatsappNumber) {
      const contact = await findContactByWhatsapp(whatsappNumber).catch(() => null);
      if (contact) {
        await updateContactName(contact.id, name).catch((error) => {
          console.error('[save-lead-name] No se pudo actualizar el nombre en Zernio', error);
        });
      }
    }

    return { saved: true };
  },
});
