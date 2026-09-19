import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { closeConversation } from '../../server/lib/supabase-client.js';
import type { FrancoRequestContext } from '../request-context.js';

export const closeConversationTool = createTool({
  id: 'close-conversation',
  description:
    'Úsala cuando la conversación llega a un cierre real: el cliente confirmó que no necesita nada más, se completó una canalización sin otra solicitud pendiente, o se activó el cierre por lenguaje ofensivo. Marca al lead como cerrado y pausa a Franco para ese cliente — un humano debe reactivarlo manualmente desde el dashboard si el cliente vuelve a escribir más tarde. Llámala en el mismo paso en que decides cerrar, justo antes o junto con tu mensaje de despedida.',
  inputSchema: z.object({}),
  outputSchema: z.object({ closed: z.boolean() }),
  execute: async (_args, context) => {
    const requestContext = context?.requestContext as
      | { get: (key: keyof FrancoRequestContext) => unknown }
      | undefined;
    const leadId = requestContext?.get('leadId') as string | undefined;

    if (!leadId) return { closed: false };

    await closeConversation(leadId);
    return { closed: true };
  },
});
