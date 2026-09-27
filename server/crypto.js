import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { error } from "./domain.js";
export const hash = (s) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export function imageBuffer(data) {
  if (typeof data !== "string" || !data.startsWith("data:image/jpeg;base64,"))
    throw error(400, "Нужно фото JPEG с камеры");
  const b = Buffer.from(data.split(",")[1], "base64");
  if (
    b.length < 100 ||
    b.length > 3000000 ||
    b[0] !== 255 ||
    b[1] !== 216 ||
    b[b.length - 2] !== 255 ||
    b[b.length - 1] !== 217
  )
    throw error(400, "Некорректное фото, максимум 3 МБ");
  return b;
}
export function cipher(key) {
  if (!key || !/^\w{64}$/.test(key) || Buffer.from(key, "hex").length !== 32)
    throw new Error("DATA_ENCRYPTION_KEY must be 64 hex characters");
  const k = Buffer.from(key, "hex");
  return {
    encrypt(b) {
      const iv = randomBytes(12),
        c = createCipheriv("aes-256-gcm", k, iv);
      return Buffer.concat([
        iv,
        c.update(b),
        c.final(),
        c.getAuthTag(),
      ]).toString("base64");
    },
    decrypt(v) {
      const b = Buffer.from(v, "base64"),
        d = createDecipheriv("aes-256-gcm", k, b.subarray(0, 12));
      d.setAuthTag(b.subarray(-16));
      return Buffer.concat([d.update(b.subarray(12, -16)), d.final()]);
    },
  };
}
