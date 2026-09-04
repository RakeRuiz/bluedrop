export const LEAD_STAGES = [
  'nuevo',
  'contactado',
  'interesado',
  'en_seguimiento_pago',
  'pagado_inscrito',
  'perdido_sin_respuesta',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}
