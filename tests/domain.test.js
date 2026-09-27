import test from "node:test";
import assert from "node:assert/strict";
import { transition, phone, canSeeOrder } from "../server/domain.js";
import { cipher, imageBuffer } from "../server/crypto.js";
const client = { id: "c", role: "client", verified: "manual" },
  worker = { id: "w", role: "worker", verified: "manual" };
test("Telegram phone normalization", () => {
  assert.equal(phone.parse("998 90 123 45 67"), "+998901234567");
  assert.equal(phone.safeParse("+123").success, false);
});
test("delivery cannot start before sender confirms and courier provides evidence", () => {
  const o = {
    client_id: "c",
    worker_id: "w",
    status: "assigned",
    category: "delivery",
    sender_confirmed: false,
  };
  assert.throws(() =>
    transition(o, worker, "start", {
      hasPhoto: true,
      description: "Box intact",
    }),
  );
  o.sender_confirmed = true;
  assert.throws(() =>
    transition(o, worker, "start", {
      hasPhoto: false,
      description: "Box intact",
    }),
  );
  assert.deepEqual(
    transition(o, worker, "start", {
      hasPhoto: true,
      description: "Box intact",
    }),
    { status: "in_progress" },
  );
  assert.throws(() =>
    transition(o, client, "start", {
      hasPhoto: true,
      description: "Box intact",
    }),
  );
});
test("unverified and self-acceptance blocked", () => {
  const o = { client_id: "c", status: "open" };
  assert.throws(() => transition(o, { ...worker, verified: "none" }, "accept"));
  assert.throws(() => transition(o, { ...client, role: "worker" }, "accept"));
  assert.throws(() =>
    transition({ ...o, status: "assigned" }, worker, "accept"),
  );
});
test("client alone confirms completion, no skipping steps", () => {
  const o = { client_id: "c", worker_id: "w", status: "in_progress" };
  assert.throws(() => transition(o, client, "confirm"));
  o.status = "awaiting_confirmation";
  assert.throws(() => transition(o, worker, "confirm"));
  assert.equal(transition(o, client, "confirm").status, "completed");
});
test("order privacy includes designated authenticated recipient only", () => {
  const o = {
    client_id: "c",
    worker_id: "w",
    recipient_phone: "+998901234567",
  };
  assert.ok(canSeeOrder(client, o));
  assert.ok(canSeeOrder({ id: "r", phone: "+998901234567" }, o));
  assert.ok(!canSeeOrder({ id: "stranger", phone: "+998901234568" }, o));
});
test("encrypted evidence detects tampering and does not expose plaintext", () => {
  const c = cipher("a".repeat(64)),
    raw = Buffer.from("private evidence"),
    encrypted = c.encrypt(raw);
  assert.equal(c.decrypt(encrypted).toString(), raw.toString());
  const b = Buffer.from(encrypted, "base64");
  b[15] ^= 1;
  assert.throws(() => c.decrypt(b.toString("base64")));
  assert.throws(() => imageBuffer("data:image/svg+xml;base64,AAA"));
});
