// Run on your trusted machine or the Railway service after setting environment variables.
const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, APP_ORIGIN } = process.env;
if (
  !TELEGRAM_BOT_TOKEN ||
  !TELEGRAM_WEBHOOK_SECRET ||
  !APP_ORIGIN?.startsWith("https://")
)
  throw new Error(
    "Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and HTTPS APP_ORIGIN",
  );
const res = await fetch(
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: APP_ORIGIN + "/api/telegram/webhook",
      secret_token: TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    }),
  },
);
const data = await res.json();
if (!data.ok) throw new Error("Telegram rejected webhook configuration");
console.log("Telegram webhook configured successfully");
