// Configure Telegram inside the service: credentials never leave Railway.
export async function configureTelegram() {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret, APP_ORIGIN: origin } = process.env;
  if (!token || !secret || !origin?.startsWith('https://')) {
    console.log('Telegram setup skipped: configuration incomplete');
    return;
  }
  async function call(method, body) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(`Telegram ${method} rejected (${response.status})`);
    return data.result;
  }
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const bot = await call('getMe', {});
      process.env.TELEGRAM_BOT_USERNAME = bot.username;
      const url = new URL('/api/telegram/webhook', origin).href;
      await call('setWebhook', { url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: false });
      const info = await call('getWebhookInfo', {});
      if (info.url !== url) throw new Error('Telegram webhook URL mismatch');
      console.log(`Telegram webhook configured and verified for @${bot.username}`);
      return;
    } catch {
      // Never log fetch exceptions: they can contain the bot token in the URL.
      console.error(`Telegram setup failed (attempt ${attempt}/5); check bot token and APP_ORIGIN`);
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, attempt * 5000));
    }
  }
}
