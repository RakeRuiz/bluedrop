const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

// Deduplicación en memoria: si Zernio reintenta el mismo evento fallido varias
// veces, o si varios clientes distintos truenan en la misma ventana de tiempo,
// esto evita saturar al developer con el mismo tipo de aviso repetido.
const lastAlertAt = new Map<string, number>();

function shouldAlert(context: string): boolean {
  const now = Date.now();
  for (const [key, expiresAt] of lastAlertAt) {
    if (expiresAt <= now) lastAlertAt.delete(key);
  }

  if (lastAlertAt.has(context)) return false;

  lastAlertAt.set(context, now + DEDUP_WINDOW_MS);
  return true;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Notifica al developer (no al cliente ni al equipo de Blue Drop) por Telegram
 * cuando algo falla procesando un mensaje de WhatsApp. Fire-and-forget: nunca
 * debe tirar el procesamiento del webhook. Si faltan las variables de entorno,
 * degrada a console.error (mismo patrón que dashboard/src/lib/dev-alerts.ts).
 */
export function reportAgentError(context: string, error: unknown, meta?: Record<string, unknown>): void {
  const message = errorMessage(error);
  console.error(`[dev-alert] ${context}:`, message, meta ?? '');

  if (!shouldAlert(context)) return;

  const botToken = process.env.DEV_ALERT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.DEV_ALERT_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn(
      '[dev-alert] DEV_ALERT_TELEGRAM_BOT_TOKEN o DEV_ALERT_TELEGRAM_CHAT_ID no configurados; no se envió el aviso.',
    );
    return;
  }

  const metaLines = meta
    ? Object.entries(meta)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    : '';

  const text = `🚨 Agente Blue Drop — error\nContexto: ${context}\n${metaLines ? metaLines + '\n' : ''}${message}`;

  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((body) => {
          console.error(`[dev-alert] Telegram sendMessage -> ${response.status}: ${body}`);
        });
      }
    })
    .catch((err) => {
      console.error('[dev-alert] No se pudo enviar el aviso a Telegram', err);
    });
}
