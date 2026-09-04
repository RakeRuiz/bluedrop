export const ESTADO_SOLICITUD_VALUES = ['en_curso', 'registrada', 'canalizada', 'cerrada', 'con_error'] as const;

export type EstadoSolicitud = (typeof ESTADO_SOLICITUD_VALUES)[number];

export function isEstadoSolicitud(value: string): value is EstadoSolicitud {
  return (ESTADO_SOLICITUD_VALUES as readonly string[]).includes(value);
}

export const UBICACION_MERIDA_VALUES = ['si', 'no', 'sin_confirmar'] as const;
export type UbicacionMerida = (typeof UBICACION_MERIDA_VALUES)[number];

export const TIPO_NECESIDAD_VALUES = ['preventiva', 'correctiva', 'limpieza', 'sin_identificar'] as const;
export type TipoNecesidad = (typeof TIPO_NECESIDAD_VALUES)[number];

export const PREFERENCIA_CONTACTO_VALUES = ['llamada', 'whatsapp'] as const;
export type PreferenciaContacto = (typeof PREFERENCIA_CONTACTO_VALUES)[number];

export const ZONA_MERIDA_VALUES = ['norte', 'poniente', 'centro', 'oriente', 'sur', 'sin_identificar'] as const;
export type ZonaMerida = (typeof ZONA_MERIDA_VALUES)[number];
