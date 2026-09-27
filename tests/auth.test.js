import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
process.env.NODE_ENV = "test";
process.env.TELEGRAM_BOT_TOKEN = "test-token-not-real";
process.env.TELEGRAM_BOT_USERNAME = "test_bot";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
test("Telegram verifies matching self-contact, browser secret and one-time code", async () => {
  const { app, close } = await createApp();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port,
    realFetch = global.fetch,
    sent = [];
  global.fetch = async (url, options) => {
    if (String(url).startsWith("https://api.telegram.org/")) {
      sent.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ ok: true, result: {} }), {
        headers: { "content-type": "application/json" },
      });
    }
    return realFetch(url, options);
  };
  const post = async (path, body, webhook = false) => {
    const r = await fetch(base + "/api" + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-izla-client": "web",
        ...(webhook
          ? { "x-telegram-bot-api-secret-token": "test-webhook-secret" }
          : {}),
      },
      body: JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie"),
    };
  };
  try {
    const phone = "+998" + String(Date.now()).slice(-9),
      tg = String(Date.now());
    const start = await post("/auth/start", {
      name: "Auth Test",
      phone,
      role: "client",
      consent: true,
    });
    assert.equal(start.status, 200);
    const message = { chat: { id: tg, type: "private" }, from: { id: tg } };
    assert.equal(
      (
        await post("/telegram/webhook", {
          message: { ...message, text: "/start " + start.body.id },
        })
      ).status,
      403,
    );
    await post(
      "/telegram/webhook",
      { message: { ...message, text: "/start " + start.body.id } },
      true,
    );
    const before = sent.length;
    await post(
      "/telegram/webhook",
      {
        message: {
          ...message,
          contact: { user_id: "someone-else", phone_number: phone },
        },
      },
      true,
    );
    assert.equal(sent.length, before);
    await post(
      "/telegram/webhook",
      {
        message: {
          ...message,
          contact: { user_id: tg, phone_number: "+998901111111" },
        },
      },
      true,
    );
    assert.ok(!sent.at(-1).text.startsWith("Код"));
    await post(
      "/telegram/webhook",
      {
        message: { ...message, contact: { user_id: tg, phone_number: phone } },
      },
      true,
    );
    const code = sent.at(-1).text.match(/\d{6}/)[0];
    assert.equal(
      (
        await post("/auth/verify", {
          id: start.body.id,
          secret: "f".repeat(64),
          code,
        })
      ).status,
      400,
    );
    const ok = await post("/auth/verify", { ...start.body, code });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.phone, phone);
    assert.ok(ok.cookie.includes("HttpOnly"));
    assert.equal(
      (await post("/auth/verify", { ...start.body, code })).status,
      400,
    );
  } finally {
    global.fetch = realFetch;
    await new Promise((r) => server.close(r));
    await close();
  }
});
