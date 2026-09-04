export async function notifyRene(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_RENE_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_RENE_CHAT_ID no configurados; no se envió el aviso.', {
      text,
    });
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Telegram sendMessage -> ${response.status}: ${body}`);
  }
}
