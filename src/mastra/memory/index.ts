import { Memory } from '@mastra/memory';
import { z } from 'zod';
import { postgresStorage } from '../storage.js';

// Borrador de conversación de Franco: solo evita que vuelva a preguntar datos
// ya respondidos dentro del mismo hilo de WhatsApp. El registro real y visible
// para el equipo humano vive en la tabla `leads` de Supabase (ver save-lead-data
// tool) — este working memory NUNCA sustituye eso.
const workingMemorySchema = z.object({
  flow_state: z
    .enum(['INICIO', 'TRAMPAS', 'LAGOS', 'AGUAS_RESIDUALES', 'HOGAR', 'ASESOR', 'COTIZACION_BOMBA', 'CIERRE'])
    .optional(),
  ya_saludo: z.boolean().optional(),
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  servicio_interes: z.string().optional(),
  ubicacion_merida: z.enum(['si', 'no', 'sin_confirmar']).optional(),
  zona_merida: z.string().optional(),
  nombre_negocio: z.string().optional(),
  ubicacion_negocio: z.string().optional(),
  informacion_trampa: z.string().optional(),
  problematica_actual: z.string().optional(),
  tipo_necesidad: z.string().optional(),
  preferencia_contacto: z.string().optional(),
  recursos_ya_enviados: z.array(z.string()).optional(),
  cerrado_por_lenguaje_ofensivo: z.boolean().optional(),
});

export const francoMemory = new Memory({
  storage: postgresStorage,
  options: {
    lastMessages: 20,
    workingMemory: {
      enabled: true,
      scope: 'thread',
      schema: workingMemorySchema,
    },
  },
});

export function normalizeWhatsappNumber(rawNumber: string): string {
  return rawNumber.replace(/[^\d+]/g, '');
}

export function threadIdForWhatsapp(whatsappNumber: string): string {
  return `wa:${normalizeWhatsappNumber(whatsappNumber)}`;
}
