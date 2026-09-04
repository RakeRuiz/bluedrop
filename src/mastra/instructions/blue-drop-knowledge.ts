import { YOUTUBE_TRAMPA, PUNTOS_VENTA_MERIDA, ENLACES_COMPRA } from '../resources/external-links.js';

// Base de conocimiento de Blue Drop. Es una función (no un string estático)
// para que el enlace de compra del Alguicida (y cualquier otro dato pendiente
// del cliente) se refleje en tiempo real según la variable de entorno, en vez
// de dejar que el modelo tenga que razonar sobre un placeholder entre corchetes.
export function buildBlueDropKnowledge(): string {
  const alguicidaLink = process.env.LINK_COMPRA_ALGUICIDA;

  return `
## Datos de la empresa
- Nombre legal: CyC Consultores y Comercializadores del Sureste. División comercial: Blue Drop.
- Actividades: tratamiento de trampas de grasa, tratamiento de lagos, tratamiento de aguas residuales, productos Blue Drop para el hogar. Fabricación en Mérida, Yucatán.
- Domicilio: Calle 28-B #294 x 19 y 17-B, Col. Brisas de Chuburná, Fracc. Vista Alegre, C.P. 97203, Mérida, Yucatán.
- Correo: bluedrop@cycdelsureste.com — Teléfono: 999 357 7687.
- Sitios: cycdelsureste.mx (empresa) / blue-drop.mx (mostrado en cotizaciones). Red social: BlueDrop en Facebook.
- Horario de atención: Lunes a viernes 9:00–14:00 y 15:30–17:30 h. Sábado 9:00–14:00 h.

## Tratamiento continuo con bomba dosificadora (preventivo, cobertura Mérida)
Instalación de bomba dosificadora en comodato que aplica Blue Drop de forma controlada y continua. Incluye: personalización del producto según la operación del negocio, refuerzo mensual con desengrasantes biodegradables y potencializadores, visitas semanales de validación y relleno. La bomba dosifica 20 litros de Blue Drop a la semana, trabaja de lunes a domingo, se instala lo más cerca posible de la trampa.

Efecto: previene solidificación de grasa, rompe tensión superficial de aceites/grasas, mantiene flujo constante, reduce taponamientos y malos olores (neutraliza gases sulfurosos), reduce presencia de cucarachas, prolonga vida útil de la trampa.

Responsabilidad compartida: el cliente hace limpieza inicial antes de instalar, retira semanalmente la capa superficial de grasa y realiza limpiezas mayores periódicas (con mantenimiento constante, cada 3–6 meses aprox., varía según la operación).

Precio normal: $2,500.00 MXN + IVA. Promoción vigente: 10% de descuento los primeros 3 meses → $2,250.00 MXN + IVA (sin factura, se maneja solo el monto sin IVA). No modificar estos montos ni crear condiciones adicionales.

Cotización autorizada (PDF_COTIZACION_BOMBA): precio unitario base $2,500.00 MXN + IVA, pago de contado (transferencia o efectivo), entrega 1–2 días hábiles tras confirmación por escrito, volúmenes mayores requieren acuerdo previo, entrega libre a bordo en Mérida, cancelaciones con 48 h de anticipación por escrito, vigencia hasta el 5 de octubre de 2026. Al cotizar: comparte primero el PDF, después el mensaje de promoción por separado (nunca digas que la promo está dentro del PDF si se envió aparte).

## BlueDrop Shock (correctivo)
Producto concentrado para trampas con problema activo: acumulación importante de grasa, saponificación/grasa endurecida, malos olores, flujo lento, riesgo de obstrucción. Modifica la consistencia de la grasa para facilitar su retiro — NO sustituye la limpieza mecánica, solo prepara el sistema.

### Fuera de Mérida (venta directa, bidón de 20 L)
Tabla de dosificación autorizada:
| Tamaño | Capacidad aprox. | Dosis inicial | Mantenimiento semanal |
|---|---|---|---|
| Mini | 30–80 L | 1–2 L | 0.5–1 L |
| Chica | 80–150 L | 2–4 L | 1–2 L |
| Mediana | 150–300 L | 6–8 L | 3–4 L |
| Grande | 300–600 L | 10–12 L | 5–6 L |
| XL | 600–1,200 L | 15–20 L | 7.5–10 L |
| Industrial | 1,200–3,000 L | 20–30 L | 10–15 L |
| Muy industrial | 3,000–6,000 L | 35–50 L | 17.5–25 L |
Mantenimiento semanal ≈ 50% de la dosis inicial. Sin conocer la capacidad, NO recomendar dosis — debe confirmarla el equipo técnico.

Aplicación: agitar, aplicar la dosis completa en la trampa (20–30% en registros aguas abajo si hay acumulación ahí), evitar diluir salvo necesidad, el negocio puede seguir operando, esperar ~48 h, luego extraer (pipa/manual), después usar como mantenimiento semanal (50% de la dosis inicial). Puede enviarse fuera de Mérida (transporte se cotiza aparte). No hay precio fijo autorizado para el bidón de 20 L — consultar en la plataforma de compra. Enlace de compra: ver ENLACES_COMPRA.blueDropShock más abajo.

### Presencial en Mérida (SHOCK_MERIDA)
Solo para restaurantes. Aplicación de 5 litros directamente en la trampa, aplicación incluida, sujeto a disponibilidad de ruta. Zonas: norte, poniente, centro, oriente, sur de Mérida. Precio: $500.00 MXN + IVA. Fecha/hora las coordina y confirma el equipo — Franco nunca confirma una visita por su cuenta.

## Limpieza de trampa de grasa (Mérida)
Sin información autorizada de precio, método, cobertura ni tiempos. Única acción permitida: pedir nombre y apellido, registrar el interés, canalizar directo con un asesor.

## Tratamiento de lagos / aguas residuales
Sin información técnica o comercial para diagnosticar o cotizar. Pedir nombre y apellido, preguntar preferencia de seguimiento (llamada/WhatsApp), canalizar con un asesor.

## Productos Blue Drop para el hogar (venta directa, sin canalización automática)
Precios no definidos en esta base — consultar en la plataforma de compra.

### Antiolores de Mascotas
Aromatizante en spray que neutraliza malos olores de mascotas (ej. orina). Uso: 3–5 disparos por área, aplicación directa, puede usarse diario. Presentación: spray 470 ml. Aromas: Gardenia, Madera, Lavanda.
Puntos de venta en Mérida: Centro Veterinario Salud Animal, Veterinaria CannaPets, Abarrotes Carmita (ver PUNTOS_VENTA_MERIDA). Enlaces de compra: ver ENLACES_COMPRA.antioloresMascotas.

### Eliminador de Olores para Tuberías
Controla/elimina malos olores en inodoros, mingitorios y lavamanos. Uso: aplicar 25 ml directo en el punto, esperar 10–15 min, continuar uso habitual.
Puntos de venta en Mérida: Tlapalería Andrea, Papelería El Reino del Saber, Abarrotes Carmita. Enlaces de compra: ver ENLACES_COMPRA.eliminadorTuberias.

### Blue Poop
Neutralizador de olores de baño (no es solo un ambientador) — se aplica ANTES de usar el sanitario, unas atomizaciones sobre el agua de la taza, forma una barrera que controla el olor desde su origen. Presentación: spray/atomizador, práctico para transportar. Aromas: Cedro, Bergamota.
Punto de venta en Mérida: Abarrotes Carmita. Enlaces de compra: ver ENLACES_COMPRA.bluePoop.

### Alguicida
Alguicida líquido concentrado de amplio espectro para piscinas residenciales y comerciales — controla y elimina algas verdes, previene algas negras. No hace espuma, compatible con cloro y otros químicos, no altera el pH, uso profesional.
Dosis de mantenimiento/prevención: 200 ml por cada 10,000 L de agua, cada 15 días. Tratamiento de choque: 400 ml por cada 10,000 L cuando hay presencia visible de algas (repetir hasta eliminarla, luego volver a dosis de mantenimiento).
Aplicación: ajustar pH entre 7.2 y 7.6, encender la bomba de recirculación, distribuir el producto en todo el perímetro de la piscina, dejar recircular al menos 4 horas (cepillar antes en tratamiento de choque, excepto para algas negras), aplicar en horas de poco uso.
Precauciones: no aplicar con personas dentro de la piscina, no mezclar directo con otros químicos en el mismo recipiente, usar guantes y lentes, mantener fuera del alcance de niños/mascotas, esperar al menos 30 minutos después de aplicar y antes de usar la piscina, verificando que el producto se haya distribuido correctamente.
Presentación: 1 litro (1,000 ml). Venta únicamente en línea, nunca ofrecer tiendas físicas.
Enlace de compra: ${alguicidaLink ? alguicidaLink : 'PENDIENTE DE CONFIRMAR — el cliente todavía no ha dado este enlace. No lo inventes; si preguntan, di que se está confirmando con el equipo.'}

## Puntos de venta físicos en Mérida (Google Maps)
${Object.values(PUNTOS_VENTA_MERIDA)
  .map((p) => `- ${p.producto}: ${p.maps}`)
  .join('\n')}
No afirmar que hay inventario disponible — recomendar verificar directamente en el establecimiento.

## Enlaces de compra autorizados
- Eliminador de Olores para Tuberías: TikTok Shop ${ENLACES_COMPRA.eliminadorTuberias.tiktok} · Mercado Libre ${ENLACES_COMPRA.eliminadorTuberias.mercadoLibre} · Walmart ${ENLACES_COMPRA.eliminadorTuberias.walmart}
- Antiolores de Mascotas: TikTok Shop ${ENLACES_COMPRA.antioloresMascotas.tiktok} · Mercado Libre ${ENLACES_COMPRA.antioloresMascotas.mercadoLibre} · Walmart ${ENLACES_COMPRA.antioloresMascotas.walmart}
- Blue Poop: TikTok Shop ${ENLACES_COMPRA.bluePoop.tiktok} · Mercado Libre ${ENLACES_COMPRA.bluePoop.mercadoLibre} · Walmart ${ENLACES_COMPRA.bluePoop.walmart}
- BlueDrop Shock: TikTok Shop ${ENLACES_COMPRA.blueDropShock.tiktok} · Mercado Libre ${ENLACES_COMPRA.blueDropShock.mercadoLibre}
- Alguicida: ${alguicidaLink ? alguicidaLink : 'pendiente de confirmar (ver arriba).'}
Los precios en plataformas externas pueden cambiar — comparte el enlace, no afirmes un precio no autorizado aquí.

## Videos autorizados de trampas de grasa
${YOUTUBE_TRAMPA.map((v) => `- ${v.label}: ${v.url}`).join('\n')}
No enviar el mismo video repetidamente en la misma conversación.

## Preguntas frecuentes
- Bomba dosificadora vs. BlueDrop Shock: la bomba es preventiva y continua; Shock es correctivo para una trampa que ya tiene un problema activo.
- BlueDrop Shock no sustituye la limpieza de la trampa, solo la facilita.
- La bomba dosificadora se entrega en comodato, no se vende.
- La bomba dosifica 20 L de Blue Drop a la semana; hay visitas semanales de validación y relleno.
- Con mantenimiento constante, las limpiezas mayores pueden espaciarse cada 3–6 meses aprox.
- Precio de la bomba: $2,500 MXN + IVA normal, $2,250 MXN + IVA en promoción los primeros 3 meses.
- Fuera de Mérida: se ofrece BlueDrop Shock; el transporte se cotiza aparte.
- Sin conocer la capacidad de la trampa, la dosis la debe confirmar el equipo técnico.
- El servicio Shock presencial es solo para restaurantes de Mérida y depende de disponibilidad de ruta ($500 MXN + IVA, incluye 5 L de producto).
- Limpieza de trampa: se registra nombre/apellido y se canaliza con un asesor.
- Blue Poop no es solo un ambientador: neutraliza el olor desde su origen, aplicado antes de usar el sanitario.
- Alguicida: controla algas verdes y ayuda a prevenir algas negras; mantenimiento 200 ml/10,000 L cada 15 días, choque 400 ml/10,000 L; esperar 30 min antes de usar la piscina; no aplicar con gente dentro; no mezclar directo con otros químicos.
- Blue Drop sí ofrece tratamiento de lagos y aguas residuales, pero siempre canalizado con un asesor.
`;
}
