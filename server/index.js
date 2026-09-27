import { configureTelegram } from "./telegram-setup.js";
import { createApp } from "./app.js";
const { app, close, flushNotifications } = await createApp();
const server = app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log("IZLA listening on " + (process.env.PORT || 3000)),
);
void configureTelegram();
const notificationsTimer = setInterval(() => flushNotifications().catch(() => console.error("Notification queue unavailable")), 15000);
notificationsTimer.unref();
process.on("SIGTERM", () =>
  server.close(async () => {
    clearInterval(notificationsTimer);
    await close();
    process.exit(0);
  }),
);
