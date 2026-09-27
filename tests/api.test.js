import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app.js";
import { hash } from "../server/crypto.js";
process.env.NODE_ENV = "test";
const jpeg =
  "data:image/jpeg;base64," +
  Buffer.concat([
    Buffer.from([255, 216]),
    Buffer.alloc(200),
    Buffer.from([255, 217]),
  ]).toString("base64");
test("complete order flow, evidence authorization, dispute and review permissions", async () => {
  const { app, db, close } = await createApp(),
    server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const call = async (path, body, cookie) => {
    if(process.env.CI) console.log("API", path);
    const r = await fetch(base + "/api" + path, {
      signal: AbortSignal.timeout(10000),
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IZLA-Client": "web",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await r.json().catch(() => null);
    return {
      status: r.status,
      json,
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    assert.equal((await call("/health")).status, 200);
    assert.equal((await call("/admin")).status, 401);
    const c = await call("/dev/login", { role: "client" }),
      w = await call("/dev/login", { role: "worker" }),
      a = await call("/dev/login", { role: "admin" });
    assert.equal(c.status, 200);
    assert.equal(w.status, 200);
    assert.equal((await call("/admin", undefined, c.cookie)).status, 403);
    const payload = {
      category: "delivery",
      title: "Deliver a box",
      description: "A closed box of books. Keep dry.",
      budget: 25000,
      city: "Бухара",
      pickup: "Address number one",
      destination: "Address number two",
      contents: "Three books",
      recipient_phone: "+998901234567",
      photo: jpeg,
      legal: true,
    };
    assert.equal(
      (await call("/orders", { ...payload, photo: "" }, c.cookie)).status,
      400,
    );
    if (process.env.DATABASE_URL) {
      assert.equal(db.totalCount, db.idleCount, 'Invalid image must not leak a checked-out PostgreSQL connection');
    }
    const created = await call("/orders", payload, c.cookie);
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const id = created.json.id;
    assert.equal(
      (await call("/orders/" + id, undefined, w.cookie)).status,
      403,
    );
    const accept = await call(
      "/orders/" + id + "/actions",
      { action: "accept" },
      w.cookie,
    );
    assert.equal(accept.status, 200, JSON.stringify(accept.json));
    assert.equal(
      (await call("/orders/" + id + "/actions", { action: "accept" }, w.cookie))
        .status,
      409,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "start", photo: jpeg, description: "Books intact" },
          w.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "handover" },
          c.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "start", description: "Books intact" },
          w.cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "start", photo: jpeg, description: "Books intact" },
          w.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/location",
          { lat: 39.7, lon: 64.4, accuracy: 12 },
          c.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/location",
          { lat: 39.7, lon: 64.4, accuracy: 12 },
          w.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/messages",
          { body: "Collected the parcel" },
          w.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/review",
          { rating: 5, body: "Good service" },
          c.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "finish", photo: jpeg, description: "Delivered intact" },
          w.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "confirm" },
          w.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/actions",
          { action: "confirm" },
          c.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/review",
          { rating: 5, body: "Good service" },
          c.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/review",
          { rating: 5, body: "Duplicate review" },
          c.cookie,
        )
      ).status,
      409,
    );
    const detail = await call("/orders/" + id, undefined, c.cookie);
    assert.equal(detail.json.evidence.length, 3);
    assert.equal(detail.json.location, undefined);
    assert.equal(detail.json.messages.length, 1);
    assert.equal(
      (await fetch(base + "/api/evidence/" + detail.json.evidence[0].id))
        .status,
      401,
    );
    const stranger = randomUUID();
    await db.query(
      "INSERT INTO users(id,phone,telegram_id,name,role) VALUES($1,$2,$3,$4,$5)",
      [
        stranger,
        "+998" + String(Date.now()).slice(-9),
        stranger,
        "Stranger",
        "client",
      ],
    );
    const st = randomUUID();
    await db.query(
      "INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,$3)",
      [hash(st), stranger, new Date(Date.now() + 60000)],
    );
    assert.equal(
      (
        await fetch(base + "/api/evidence/" + detail.json.evidence[0].id, {
          headers: { cookie: "izla_session=" + st },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/orders/" + id + "/dispute",
          { reason: "The parcel was damaged after arrival" },
          c.cookie,
        )
      ).status,
      200,
    );
    const dashboard = await call("/admin", undefined, a.cookie),
      dis = dashboard.json.disputes.find((d) => d.order_id === id);
    assert.equal(
      (
        await call(
          "/admin/disputes/" + dis.id,
          {
            status: "completed",
            resolution: "Evidence reviewed and both parties contacted.",
          },
          a.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/admin/disputes/" + dis.id,
          {
            status: "completed",
            resolution: "Duplicate decision should not be accepted.",
          },
          a.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          "/kyc",
          { photos: [jpeg, jpeg, jpeg, jpeg, jpeg], consent: true },
          c.cookie,
        )
      ).status,
      503,
    );
    const csrf = await fetch(base + "/api/auth/logout", {
      signal: AbortSignal.timeout(10000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IZLA-Client": "web",
        Origin: "https://evil.invalid",
        Cookie: c.cookie,
      },
      body: "{}",
    });
    assert.equal(csrf.status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await close();
  }
});
