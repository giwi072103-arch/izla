import { configureTelegram } from "./telegram-setup.js";
import { createApp } from "./app.js";
const { app, close } = await createApp();
const server = app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log("IZLA listening on " + (process.env.PORT || 3000)),
);
void configureTelegram();
process.on("SIGTERM", () =>
  server.close(async () => {
    await close();
    process.exit(0);
  }),
);
