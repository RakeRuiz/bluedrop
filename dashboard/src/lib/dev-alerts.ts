const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

// Deduplicación en memoria: page.tsx es force-dynamic y puede ejecutarse en
// cada carga; sin esto, un Supabase caído generaría un mensaje de Telegram
// por cada visita. Al ser un Map en memoria de proceso, no es una
// deduplicación perfectamente global si hay varias instancias/workers, pero
// es suficiente para evitar saturar al developer de avisos.
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
 * Notifica al developer (no al cliente) por Telegram cuando algo falla en el
 * dashboard, ej. una consulta a Supabase. Fire-and-forget: nunca debe tirar
 * el render de la página. Si faltan las variables de entorno, degrada a
 * console.error (mismo patrón que notifyAsesor en el agente).
 */
export function reportDashboardError(context: string, error: unknown): void {
  const message = errorMessage(error);
  console.error(`[dev-alert] ${context}:`, message);

  if (!shouldAlert(context)) return;

  const botToken = process.env.DEV_ALERT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.DEV_ALERT_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn(
      '[dev-alert] DEV_ALERT_TELEGRAM_BOT_TOKEN o DEV_ALERT_TELEGRAM_CHAT_ID no configurados; no se envió el aviso.',
    );
    return;
  }

  const text = `🚨 Dashboard Blue Drop — error\nContexto: ${context}\n${message}`;

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
