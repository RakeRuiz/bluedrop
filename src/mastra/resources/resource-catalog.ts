// Catálogo de recursos multimedia (video/imagen/documento) que Franco puede
// enviar por WhatsApp vía Zernio. Cada clave corresponde a un identificador
// entre corchetes usado en franco-flow.ts / blue-drop-knowledge.ts. La URL
// sale de un bucket público de Supabase Storage — mientras la variable de
// entorno esté vacía, el recurso se considera "no configurado" y send-resource
// debe decirlo sin inventar nada (nunca se cae de vuelta a un placeholder).

export type ResourceType = 'video' | 'image' | 'document';

export interface ResourceEntry {
  type: ResourceType;
  url?: string;
  description: string;
}

export const RESOURCE_CATALOG = {
  VIDEO_USO_BOMBA_DOSIFICADORA: {
    type: 'video',
    url: process.env.MEDIA_URL_VIDEO_USO_BOMBA_DOSIFICADORA,
    description: 'Video de uso de la bomba dosificadora',
  },
  VIDEO_ANTES_Y_DESPUES_TRAMPA: {
    type: 'video',
    url: process.env.MEDIA_URL_VIDEO_ANTES_Y_DESPUES_TRAMPA,
    description: 'Video de antes y después del tratamiento de trampa de grasa',
  },
  IMAGEN_USO_ANTIODORES_MASCOTAS: {
    type: 'image',
    url: process.env.MEDIA_URL_IMAGEN_USO_ANTIODORES_MASCOTAS,
    description: 'Imagen de cómo usar el Antiolores de Mascotas',
  },
  IMAGEN_USO_ELIMINADOR_TUBERIAS: {
    type: 'image',
    url: process.env.MEDIA_URL_IMAGEN_USO_ELIMINADOR_TUBERIAS,
    description: 'Imagen de instrucciones del Eliminador de Olores para Tuberías',
  },
  PDF_COTIZACION_BOMBA: {
    type: 'document',
    url: process.env.MEDIA_URL_PDF_COTIZACION_BOMBA,
    description: 'PDF de cotización del tratamiento con bomba dosificadora',
  },
} as const satisfies Record<string, ResourceEntry>;

export type ResourceKey = keyof typeof RESOURCE_CATALOG;

export function getResource(key: ResourceKey): ResourceEntry {
  return RESOURCE_CATALOG[key];
}

export function isResourceConfigured(key: ResourceKey): boolean {
  return Boolean(RESOURCE_CATALOG[key]?.url);
}
