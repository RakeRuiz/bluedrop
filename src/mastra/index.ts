import 'dotenv/config';
import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { registerApiRoute } from '@mastra/core/server';
import { lucyAgent } from './agents/lucy.agent.js';
import { postgresStorage } from './storage.js';
import { verifyZernioSignature } from '../server/lib/verify-signature.js';
import { handleZernioWebhookEvent } from '../server/routes/webhook-zernio.js';

export const mastra = new Mastra({
  agents: { lucyAgent },
  storage: postgresStorage,
  logger: new PinoLogger({ name: 'lucy-mastra', level: 'info' }),
  server: {
    apiRoutes: [
      registerApiRoute('/webhooks/zernio', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const rawBody = await c.req.text();
          const signature = c.req.header('x-zernio-signature');
          const secret = process.env.ZERNIO_WEBHOOK_SECRET;

          if (!secret || !verifyZernioSignature(rawBody, signature, secret)) {
            return c.json({ error: 'invalid signature' }, 401);
          }

          let payload: unknown;
          try {
            payload = JSON.parse(rawBody);
          } catch {
            return c.json({ error: 'invalid json' }, 400);
          }

          // Responder de inmediato: Zernio tiene un timeout corto (~5s) y reintenta
          // el mismo evento si no contesta a tiempo. Procesar el mensaje (llamada al
          // modelo + envío por WhatsApp) puede tardar más que eso, así que se hace en
          // segundo plano después de confirmar la recepción, para no generar
          // respuestas duplicadas por reintentos.
          const mastraInstance = c.get('mastra');
          void handleZernioWebhookEvent(payload, mastraInstance).catch((error) => {
            mastraInstance?.getLogger()?.error('Error procesando webhook de Zernio', { error });
          });

          return c.json({ received: true });
        },
      }),
    ],
  },
});
