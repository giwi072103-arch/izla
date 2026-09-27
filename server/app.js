import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { randomUUID, randomInt } from "node:crypto";
import { z } from "zod";
import pg from "pg";
import { resolve } from "node:path";
import { database } from "./db.js";
import {
  categories,
  phone,
  text,
  coord,
  orderSchema,
  error,
  canSeeOrder,
  assertVerified,
  transition,
} from "./domain.js";
import { hash, token, cipher, imageBuffer } from "./crypto.js";
export async function createApp() {
  const db = await database(),
    app = express(),
    prod = process.env.NODE_ENV === "production";
  const crypt = cipher(
    process.env.DATA_ENCRYPTION_KEY || (!prod ? "0".repeat(64) : ""),
  );
  const kycEnabled =
    process.env.MANUAL_KYC_ENABLED === "true" && !!process.env.KYC_DATABASE_URL;
  const kyc = kycEnabled
    ? new pg.Pool({ connectionString: process.env.KYC_DATABASE_URL, max: 3 })
    : null;
  if (kyc)
    await kyc.query(
      `CREATE TABLE IF NOT EXISTS submissions(id uuid PRIMARY KEY,user_id uuid NOT NULL,encrypted text NOT NULL,sha256 text NOT NULL,status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now())`,
    );
  const query = (s, p = []) => db.query(s, p),
    one = async (s, p = []) => (await query(s, p)).rows[0];
  const audit = async (actor, order, action, details = {}, client = db) =>
    client.query(
      "INSERT INTO audit(id,actor,order_id,action,details) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), actor, order, action, JSON.stringify(details)],
    );
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://api-maps.yandex.ru",
            "https://*.maps.yandex.net",
            "https://yastatic.net",
            "https://*.yandex.ru",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.maps.yandex.net",
            "https://*.yandex.ru",
            "https://*.yandex.net",
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "https://*.yandex.ru", "https://*.yandex.net"],
          workerSrc: ["'self'", "blob:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: "22mb" }), cookieParser());
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.path !== "/telegram/webhook"
    ) {
      const origin = req.get("origin");
      const expected =
        process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
      if (origin && origin !== expected)
        return res.status(403).json({ error: "Недопустимый источник запроса" });
      if (req.get("x-izla-client") !== "web")
        return res
          .status(403)
          .json({ error: "Отсутствует заголовок приложения" });
    }
    next();
  });
  app.use("/api", async (req, res, next) => {
    try {
      if (req.cookies.izla_session)
        req.user = await one(
          "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>now()",
          [hash(req.cookies.izla_session)],
        );
      if (req.user?.banned) req.user = null;
      next();
    } catch (e) {
      next(e);
    }
  });
  const auth = (req, res, next) =>
    req.user ? next() : next(error(401, "Войдите в аккаунт"));
  const admin = (req, res, next) =>
    req.user?.role === "admin"
      ? next()
      : next(error(403, "Только администратор"));
  const verified = (req, res, next) => {
    try {
      assertVerified(req.user);
      next();
    } catch (e) {
      next(e);
    }
  };
  const authLimit = rateLimit({ windowMs: 15 * 60000, limit: 15 });
  const issueSession = async (res, u) => {
    const t = token();
    await query(
      "INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,$3)",
      [hash(t), u.id, new Date(Date.now() + 7 * 86400000)],
    );
    res.cookie("izla_session", t, {
      httpOnly: true,
      secure: prod,
      sameSite: "lax",
      maxAge: 7 * 86400000,
      path: "/",
    });
  };
  const telegram = async (method, body) => {
    const r = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      },
    );
    const d = await r.json();
    if (!d.ok) throw error(502, "Telegram временно недоступен");
    return d.result;
  };
  app.get("/api/health", async (req, res) => {
    await query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  });
  app.get("/api/config", (req, res) =>
    res.json({
      telegram: !!(
        process.env.TELEGRAM_BOT_TOKEN &&
        process.env.TELEGRAM_BOT_USERNAME &&
        process.env.TELEGRAM_WEBHOOK_SECRET
      ),
      manualKyc: kycEnabled,
      myid: false,
      yandexKey: process.env.YANDEX_MAPS_KEY || "",
      development: !prod,
      legalVersion: "2026-09-26",
    }),
  );
  app.get("/api/me", (req, res) => res.json({ user: req.user || null }));
  app.post("/api/auth/start", authLimit, async (req, res) => {
    if (
      !process.env.TELEGRAM_BOT_TOKEN ||
      !process.env.TELEGRAM_BOT_USERNAME ||
      !process.env.TELEGRAM_WEBHOOK_SECRET
    )
      throw error(503, "Вход откроется после подключения Telegram-бота");
    const v = z
      .object({
        phone,
        name: text(2, 80),
        role: z.enum(["client", "worker"]),
        consent: z.literal(true),
      })
      .parse(req.body);
    const id = token().slice(0, 40),
      secret = token();
    await query(
      "INSERT INTO auth_challenges(id,phone,name,role,browser_secret,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        v.phone,
        v.name,
        v.role,
        hash(secret),
        new Date(Date.now() + 10 * 60000),
      ],
    );
    res.json({
      id,
      secret,
      url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${id}`,
    });
  });
  app.post("/api/telegram/webhook", async (req, res) => {
    if (
      !process.env.TELEGRAM_WEBHOOK_SECRET ||
      req.get("x-telegram-bot-api-secret-token") !==
        process.env.TELEGRAM_WEBHOOK_SECRET
    )
      throw error(403, "Forbidden");
    const m = req.body.message;
    if (!m || m.chat?.type !== "private" || !m.from)
      return res.json({ ok: true });
    if (m.text?.startsWith("/start ")) {
      const id = m.text.slice(7).trim();
      const ch = await one(
        "SELECT * FROM auth_challenges WHERE id=$1 AND expires_at>now() AND consumed=false",
        [id],
      );
      if (ch) {
        await query(
          "UPDATE auth_challenges SET telegram_id=$1 WHERE id=$2 AND (telegram_id IS NULL OR telegram_id=$1)",
          [String(m.from.id), id],
        );
        await telegram("sendMessage", {
          chat_id: m.chat.id,
          text: "IZLA: подтвердите номер кнопкой ниже. Он должен совпадать с номером в приложении.",
          reply_markup: {
            keyboard: [
              [{ text: "Поделиться моим номером", request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      }
    }
    if (m.contact) {
      if (String(m.contact.user_id) !== String(m.from.id))
        return res.json({ ok: true });
      const p = phone.safeParse(m.contact.phone_number);
      const ch = await one(
        "SELECT * FROM auth_challenges WHERE telegram_id=$1 AND expires_at>now() AND consumed=false ORDER BY expires_at DESC LIMIT 1",
        [String(m.from.id)],
      );
      if (ch && p.success && p.data === ch.phone) {
        const code = String(randomInt(100000, 1000000));
        await query(
          "UPDATE auth_challenges SET code_hash=$1 WHERE id=$2 AND attempts<5",
          [hash(ch.id + code), ch.id],
        );
        await telegram("sendMessage", {
          chat_id: m.chat.id,
          text: `Код IZLA: ${code}. Введите его только в приложении. Никому не сообщайте код.`,
          reply_markup: { remove_keyboard: true },
        });
      } else
        await telegram("sendMessage", {
          chat_id: m.chat.id,
          text: "Номер не совпадает. Начните вход заново с номером вашего Telegram.",
        });
    }
    res.json({ ok: true });
  });
  app.post("/api/auth/verify", authLimit, async (req, res) => {
    const v = z
      .object({
        id: text(40, 40),
        secret: text(64, 64),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(req.body);
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      const ch = (
        await c.query("SELECT * FROM auth_challenges WHERE id=$1 FOR UPDATE", [
          v.id,
        ])
      ).rows[0];
      if (
        !ch ||
        ch.consumed ||
        new Date(ch.expires_at) < new Date() ||
        ch.attempts >= 5 ||
        ch.browser_secret !== hash(v.secret)
      )
        throw error(400, "Код истёк или запрос недействителен");
      if (ch.code_hash !== hash(ch.id + v.code)) {
        await c.query(
          "UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1",
          [ch.id],
        );
        await c.query("COMMIT");
        throw error(400, "Неверный код");
      }
      await c.query("UPDATE auth_challenges SET consumed=true WHERE id=$1", [
        ch.id,
      ]);
      let u = (
        await c.query("SELECT * FROM users WHERE phone=$1 OR telegram_id=$2", [
          ch.phone,
          ch.telegram_id,
        ])
      ).rows[0];
      if (u && (u.phone !== ch.phone || u.telegram_id !== ch.telegram_id))
        throw error(409, "Привязка номера изменилась. Обратитесь в поддержку");
      if (!u) {
        const role = (process.env.ADMIN_TELEGRAM_IDS || "")
          .split(",")
          .includes(ch.telegram_id)
          ? "admin"
          : ch.role;
        u = (
          await c.query(
            "INSERT INTO users(id,phone,telegram_id,name,role) VALUES($1,$2,$3,$4,$5) RETURNING *",
            [randomUUID(), ch.phone, ch.telegram_id, ch.name, role],
          )
        ).rows[0];
      }
      if (u.banned) throw error(403, "Аккаунт заблокирован");
      await c.query("COMMIT");
      await issueSession(res, u);
      res.json({ user: u });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
  app.post("/api/auth/logout", auth, async (req, res) => {
    await query("DELETE FROM sessions WHERE token=$1", [
      hash(req.cookies.izla_session),
    ]);
    res.clearCookie("izla_session", { path: "/" }).json({ ok: true });
  });
  // Explicitly local-only test accounts. This route is never registered in production.
  if (!prod)
    app.post("/api/dev/login", async (req, res) => {
      const role = z.enum(["client", "worker", "admin"]).parse(req.body.role),
        p = {
          client: "+998900000001",
          worker: "+998900000002",
          admin: "+998900000003",
        }[role];
      let u = await one("SELECT * FROM users WHERE phone=$1", [p]);
      if (!u)
        u = await one(
          "INSERT INTO users(id,phone,telegram_id,name,role,verified) VALUES($1,$2,$3,$4,$5,'manual') RETURNING *",
          [randomUUID(), p, p, "Тест · " + role, role],
        );
      await issueSession(res, u);
      res.json({ user: u });
    });
  app.get("/api/listings", async (req, res) => {
    const list = (
      await query(
        `SELECT l.*,u.name,u.verified FROM listings l JOIN users u ON u.id=l.user_id WHERE l.active=true AND u.banned=false ORDER BY l.created_at DESC LIMIT 100`,
      )
    ).rows;
    const ratings = (
      await query(
        "SELECT worker_id,AVG(rating) AS rating,COUNT(*) AS review_count FROM reviews GROUP BY worker_id",
      )
    ).rows;
    res.json(
      list.map((l) => ({
        ...l,
        ...ratings.find((r) => r.worker_id === l.user_id),
      })),
    );
  });
  app.post("/api/listings", auth, verified, async (req, res) => {
    if (req.user.role !== "worker") throw error(403, "Только исполнители");
    const v = z
      .object({
        category: z.enum(categories),
        title: text(5, 120),
        description: text(20, 4000),
        city: text(2, 80),
        price: z.coerce.number().int().min(0).max(100000000),
      })
      .parse(req.body);
    const id = randomUUID();
    await query(
      "INSERT INTO listings(id,user_id,category,title,description,city,price) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [id, req.user.id, v.category, v.title, v.description, v.city, v.price],
    );
    await audit(req.user.id, null, "listing.created", { id });
    res.json({ id });
  });
  app.get("/api/listings/:id/comments", async (req, res) =>
    res.json(
      (
        await query(
          "SELECT c.*,u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.listing_id=$1 ORDER BY c.created_at ASC LIMIT 100",
          [z.uuid().parse(req.params.id)],
        )
      ).rows,
    ),
  );
  app.post("/api/listings/:id/comments", auth, async (req, res) => {
    await query(
      "INSERT INTO comments(id,listing_id,user_id,body) VALUES($1,$2,$3,$4)",
      [
        randomUUID(),
        z.uuid().parse(req.params.id),
        req.user.id,
        text(2, 1000).parse(req.body.body),
      ],
    );
    res.json({ ok: true });
  });
  app.get("/api/workers/:id/reviews", async (req, res) =>
    res.json(
      (
        await query(
          "SELECT r.*,u.name FROM reviews r JOIN users u ON u.id=r.author_id WHERE r.worker_id=$1 ORDER BY r.created_at DESC LIMIT 100",
          [z.uuid().parse(req.params.id)],
        )
      ).rows,
    ),
  );
  const saveEvidence = async (client, user, order, kind, photo) => {
    const b = imageBuffer(photo),
      id = randomUUID();
    await client.query(
      "INSERT INTO evidence(id,user_id,order_id,kind,encrypted,sha256) VALUES($1,$2,$3,$4,$5,$6)",
      [id, user, order, kind, crypt.encrypt(b), hash(b)],
    );
    return id;
  };
  app.post("/api/orders", auth, verified, async (req, res) => {
    if (req.user.role !== "client") throw error(403, "Заявки создаёт клиент");
    const v = orderSchema.parse(req.body),
      id = randomUUID();
    imageBuffer(v.photo);
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "INSERT INTO orders(id,client_id,category,title,description,budget,city,pickup,destination,contents,recipient_phone,pickup_lat,pickup_lon,dest_lat,dest_lon) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
        [
          id,
          req.user.id,
          v.category,
          v.title,
          v.description,
          v.budget,
          v.city,
          v.pickup,
          v.destination,
          v.contents,
          v.recipient_phone ? phone.parse(v.recipient_phone) : "",
          v.pickupPoint?.lat ?? null,
          v.pickupPoint?.lon ?? null,
          v.destPoint?.lat ?? null,
          v.destPoint?.lon ?? null,
        ],
      );
      await saveEvidence(c, req.user.id, id, "client_before", v.photo);
      await audit(req.user.id, id, "order.created", {}, c);
      await c.query("COMMIT");
      res.json({ id });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
  app.get("/api/orders", auth, async (req, res) => {
    const rows = (
      await query(
        "SELECT * FROM orders WHERE client_id=$1 OR worker_id=$1 OR recipient_phone=$2 OR $3='admin' OR ($3='worker' AND status='open') ORDER BY created_at DESC LIMIT 200",
        [req.user.id, req.user.phone, req.user.role],
      )
    ).rows;
    res.json(
      rows
        .filter(
          (o) =>
            canSeeOrder(req.user, o) ||
            (req.user.role === "worker" && o.status === "open"),
        )
        .map((o) =>
          canSeeOrder(req.user, o)
            ? o
            : {
                id: o.id,
                title: o.title,
                category: o.category,
                description: o.description,
                budget: o.budget,
                city: o.city,
                status: o.status,
                created_at: o.created_at,
              },
        ),
    );
  });
  const getOrder = async (req) => {
    const o = await one("SELECT * FROM orders WHERE id=$1", [
      z.uuid().parse(req.params.id),
    ]);
    if (!o) throw error(404, "Заказ не найден");
    if (!canSeeOrder(req.user, o)) throw error(403, "Нет доступа к заказу");
    return o;
  };
  app.get("/api/orders/:id", auth, async (req, res) => {
    const order = await getOrder(req);
    const evidence = (
      await query(
        "SELECT id,kind,sha256,user_id,created_at FROM evidence WHERE order_id=$1 ORDER BY created_at",
        [order.id],
      )
    ).rows;
    const messages = (
      await query(
        "SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.user_id WHERE m.order_id=$1 ORDER BY m.created_at LIMIT 300",
        [order.id],
      )
    ).rows;
    const events = (
      await query(
        "SELECT id,action,details,created_at FROM audit WHERE order_id=$1 ORDER BY created_at",
        [order.id],
      )
    ).rows;
    const location = await one("SELECT * FROM locations WHERE order_id=$1", [
      order.id,
    ]);
    res.json({ order, evidence, messages, events, location });
  });
  app.post("/api/orders/:id/actions", auth, verified, async (req, res) => {
    const action = z
        .enum(["accept", "handover", "start", "finish", "confirm", "cancel"])
        .parse(req.body.action),
      id = z.uuid().parse(req.params.id),
      c = await db.connect();
    try {
      await c.query("BEGIN");
      const o = (
        await c.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!o) throw error(404, "Заказ не найден");
      const patch = transition(o, req.user, action, {
        hasPhoto: !!req.body.photo,
        description: req.body.description || "",
      });
      if (["start", "finish"].includes(action))
        await saveEvidence(
          c,
          req.user.id,
          id,
          action === "start" ? "worker_before" : "worker_after",
          req.body.photo,
        );
      const entries = Object.entries(patch);
      await c.query(
        `UPDATE orders SET ${entries.map(([k], i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${entries.length + 1}`,
        [...entries.map(([, v]) => v), id],
      );
      await audit(
        req.user.id,
        id,
        `order.${action}`,
        { description: String(req.body.description || "").slice(0, 1000) },
        c,
      );
      if (["confirm", "cancel"].includes(action))
        await c.query("DELETE FROM locations WHERE order_id=$1", [id]);
      await c.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
  app.get("/api/evidence/:id", auth, async (req, res) => {
    const e = await one("SELECT * FROM evidence WHERE id=$1", [
      z.uuid().parse(req.params.id),
    ]);
    if (!e) throw error(404, "Фото не найдено");
    const o = await one("SELECT * FROM orders WHERE id=$1", [e.order_id]);
    if (!canSeeOrder(req.user, o)) throw error(403, "Нет доступа");
    if (req.user.role === "admin")
      await audit(req.user.id, o.id, "evidence.viewed", { evidence: e.id });
    res.type("image/jpeg").send(crypt.decrypt(e.encrypted));
  });
  app.post("/api/orders/:id/messages", auth, async (req, res) => {
    const o = await getOrder(req);
    await query(
      "INSERT INTO messages(id,order_id,user_id,body) VALUES($1,$2,$3,$4)",
      [randomUUID(), o.id, req.user.id, text(1, 2000).parse(req.body.body)],
    );
    res.json({ ok: true });
  });
  app.post("/api/orders/:id/location", auth, async (req, res) => {
    const o = await getOrder(req);
    if (
      o.worker_id !== req.user.id ||
      !["assigned", "in_progress"].includes(o.status)
    )
      throw error(403, "Отслеживание доступно только в активном заказе");
    const v = coord
      .extend({ accuracy: z.number().min(0).max(10000) })
      .parse(req.body);
    await query(
      "INSERT INTO locations(order_id,lat,lon,accuracy) VALUES($1,$2,$3,$4) ON CONFLICT(order_id) DO UPDATE SET lat=$2,lon=$3,accuracy=$4,updated_at=now()",
      [o.id, v.lat, v.lon, v.accuracy],
    );
    res.json({ ok: true });
  });
  app.post("/api/orders/:id/dispute", auth, async (req, res) => {
    const o = await getOrder(req);
    if (
      ![
        "assigned",
        "in_progress",
        "awaiting_confirmation",
        "completed",
      ].includes(o.status)
    )
      throw error(409, "Спор недоступен");
    const reason = text(10, 3000).parse(req.body.reason),
      c = await db.connect();
    try {
      await c.query("BEGIN");
      const upd = await c.query(
        "UPDATE orders SET status='disputed',updated_at=now() WHERE id=$1 AND status=$2 RETURNING id",
        [o.id, o.status],
      );
      if (!upd.rowCount) throw error(409, "Статус уже изменился");
      await c.query(
        "INSERT INTO disputes(id,order_id,user_id,reason) VALUES($1,$2,$3,$4)",
        [randomUUID(), o.id, req.user.id, reason],
      );
      await audit(req.user.id, o.id, "dispute.opened", { reason }, c);
      await c.query("DELETE FROM locations WHERE order_id=$1", [o.id]);
      await c.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
  app.post("/api/orders/:id/review", auth, async (req, res) => {
    const o = await getOrder(req);
    if (o.client_id !== req.user.id || o.status !== "completed")
      throw error(403, "Отзыв доступен после завершения");
    const v = z
      .object({
        rating: z.coerce.number().int().min(1).max(5),
        body: text(5, 2000),
      })
      .parse(req.body);
    await query(
      "INSERT INTO reviews(id,order_id,author_id,worker_id,rating,body) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), o.id, req.user.id, o.worker_id, v.rating, v.body],
    );
    res.json({ ok: true });
  });
  app.post("/api/kyc", auth, async (req, res) => {
    if (!kyc) throw error(503, "Проверка документов ещё не подключена");
    if (
      req.user.verified === "pending" ||
      ["manual", "myid"].includes(req.user.verified)
    )
      throw error(409, "Заявка уже отправлена");
    const v = z
      .object({
        consent: z.literal(true),
        photos: z.array(z.string().max(4500000)).length(5),
      })
      .parse(req.body);
    v.photos.forEach(imageBuffer);
    const b = Buffer.from(JSON.stringify(v.photos)),
      id = randomUUID();
    await kyc.query(
      "INSERT INTO submissions(id,user_id,encrypted,sha256) VALUES($1,$2,$3,$4)",
      [id, req.user.id, crypt.encrypt(b), hash(b)],
    );
    await query("UPDATE users SET verified='pending' WHERE id=$1", [
      req.user.id,
    ]);
    await audit(req.user.id, null, "kyc.submitted", {
      id,
      consentVersion: "2026-09-26",
    });
    res.json({ ok: true });
  });
  app.get("/api/admin", auth, admin, async (req, res) => {
    const users = (
      await query(
        "SELECT id,name,phone,role,verified,banned,created_at FROM users ORDER BY created_at DESC LIMIT 200",
      )
    ).rows;
    const orders = (
      await query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200")
    ).rows;
    const disputes = (
      await query("SELECT * FROM disputes ORDER BY created_at DESC LIMIT 100")
    ).rows;
    const logs = (
      await query("SELECT * FROM audit ORDER BY created_at DESC LIMIT 200")
    ).rows;
    const submissions = kyc
      ? (
          await kyc.query(
            "SELECT id,user_id,status,created_at FROM submissions WHERE status='pending'",
          )
        ).rows
      : [];
    const listings = (
      await query("SELECT * FROM listings ORDER BY created_at DESC LIMIT 200")
    ).rows;
    res.json({ users, orders, disputes, logs, submissions, listings });
  });
  app.post("/api/admin/users/:id/ban", auth, admin, async (req, res) => {
    const id = z.uuid().parse(req.params.id),
      v = z
        .object({ banned: z.boolean(), reason: text(10, 1000) })
        .parse(req.body);
    const target = await one("SELECT * FROM users WHERE id=$1", [id]);
    if (!target || target.role === "admin")
      throw error(403, "Нельзя изменить этот аккаунт");
    await query("UPDATE users SET banned=$1 WHERE id=$2", [v.banned, id]);
    await query("DELETE FROM sessions WHERE user_id=$1", [id]);
    await audit(req.user.id, null, "user.ban", { target: id, ...v });
    res.json({ ok: true });
  });
  app.post("/api/admin/listings/:id/hide", auth, admin, async (req, res) => {
    const id = z.uuid().parse(req.params.id),
      reason = text(10, 1000).parse(req.body.reason);
    await query("UPDATE listings SET active=false WHERE id=$1", [id]);
    await audit(req.user.id, null, "listing.hidden", { id, reason });
    res.json({ ok: true });
  });
  app.get("/api/admin/kyc/:id", auth, admin, async (req, res) => {
    if (!kyc) throw error(503, "KYC отключена");
    const id = z.uuid().parse(req.params.id),
      s = (await kyc.query("SELECT * FROM submissions WHERE id=$1", [id]))
        .rows[0];
    if (!s) throw error(404, "Не найдено");
    await audit(req.user.id, null, "kyc.viewed", { id });
    res.json({ photos: JSON.parse(crypt.decrypt(s.encrypted).toString()) });
  });
  app.post("/api/admin/kyc/:id", auth, admin, async (req, res) => {
    if (!kyc) throw error(503, "KYC отключена");
    const id = z.uuid().parse(req.params.id),
      v = z
        .object({ approved: z.boolean(), reason: text(10, 1000) })
        .parse(req.body);
    const s = (
      await kyc.query(
        "UPDATE submissions SET status=$1 WHERE id=$2 AND status='pending' RETURNING *",
        [v.approved ? "approved" : "rejected", id],
      )
    ).rows[0];
    if (!s) throw error(409, "Уже рассмотрено");
    await query("UPDATE users SET verified=$1 WHERE id=$2", [
      v.approved ? "manual" : "rejected",
      s.user_id,
    ]);
    await audit(req.user.id, null, "kyc.reviewed", { id, ...v });
    res.json({ ok: true });
  });
  app.post("/api/admin/disputes/:id", auth, admin, async (req, res) => {
    const id = z.uuid().parse(req.params.id),
      v = z
        .object({
          status: z.enum(["completed", "cancelled"]),
          resolution: text(20, 3000),
        })
        .parse(req.body),
      c = await db.connect();
    try {
      await c.query("BEGIN");
      const d = (
        await c.query(
          "UPDATE disputes SET status='resolved',resolution=$1 WHERE id=$2 AND status='open' RETURNING *",
          [v.resolution, id],
        )
      ).rows[0];
      if (!d) throw error(409, "Спор уже закрыт");
      await c.query(
        "UPDATE orders SET status=$1,updated_at=now() WHERE id=$2",
        [v.status, d.order_id],
      );
      await audit(req.user.id, d.order_id, "dispute.resolved", v, c);
      await c.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
  app.get("/api/admin/orders/:id/export", auth, admin, async (req, res) => {
    const o = await getOrder(req),
      events = (
        await query(
          "SELECT * FROM audit WHERE order_id=$1 ORDER BY created_at",
          [o.id],
        )
      ).rows,
      evidence = (
        await query(
          "SELECT id,kind,sha256,created_at FROM evidence WHERE order_id=$1",
          [o.id],
        )
      ).rows,
      messages = (
        await query(
          "SELECT * FROM messages WHERE order_id=$1 ORDER BY created_at",
          [o.id],
        )
      ).rows;
    await audit(req.user.id, o.id, "case.exported");
    res
      .set(
        "Content-Disposition",
        `attachment; filename="izla-case-${o.id}.json"`,
      )
      .json({ exportedAt: new Date(), order: o, events, evidence, messages });
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "Не найдено" }));
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
  app.use((e, req, res, next) => {
    if (e instanceof z.ZodError)
      return res.status(400).json({
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (e.code === "23505")
      return res.status(409).json({ error: "Такая запись уже существует" });
    if (!e.status) console.error("Request failed", prod ? e.code || e.name : e);
    res.status(e.status || 500).json({
      error: e.status ? e.message : "Ошибка сервера. Повторите позже",
    });
  });
  return {
    app,
    db,
    close: async () => {
      await db.end();
      if (kyc) await kyc.end();
    },
  };
}
