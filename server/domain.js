import { z } from "zod";
export const categories = [
  "delivery",
  "repair",
  "cleaning",
  "beauty",
  "education",
  "digital",
  "auto",
  "other",
];
export const phone = z
  .string()
  .transform((v) => "+" + v.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\+998\d{9}$/));
export const text = (min = 1, max = 2000) =>
  z.string().trim().min(min).max(max);
export const coord = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export const orderSchema = z
  .object({
    category: z.enum(categories),
    title: text(5, 120),
    description: text(15, 4000),
    budget: z.coerce.number().int().min(1000).max(100000000),
    city: text(2, 80),
    pickup: text(5, 300),
    destination: z.string().trim().max(300).default(""),
    contents: z.string().trim().max(1000).default(""),
    recipient_phone: z.string().default(""),
    pickupPoint: coord.optional(),
    destPoint: coord.optional(),
    photo: z.string().max(4500000),
    legal: z.literal(true),
  })
  .superRefine((o, c) => {
    if (
      o.category === "delivery" &&
      (o.destination.length < 5 ||
        o.contents.length < 5 ||
        !phone.safeParse(o.recipient_phone).success)
    )
      c.addIssue({
        code: "custom",
        message: "Заполните маршрут, содержимое и номер получателя",
      });
  });
export function error(status, message) {
  return Object.assign(new Error(message), { status });
}
export function canSeeOrder(user, o) {
  return (
    user &&
    (user.role === "admin" ||
      o.client_id === user.id ||
      o.worker_id === user.id ||
      (o.recipient_phone && o.recipient_phone === user.phone))
  );
}
export function assertVerified(user) {
  if (user.banned) throw error(403, "Аккаунт заблокирован");
  if (!["manual", "myid"].includes(user.verified))
    throw error(403, "Сначала пройдите проверку личности");
}
export function transition(
  o,
  u,
  action,
  { hasPhoto = false, description = "" } = {},
) {
  const worker = o.worker_id === u.id,
    client = o.client_id === u.id;
  if (action === "accept") {
    assertVerified(u);
    if (u.role !== "worker" || o.status !== "open" || o.client_id === u.id)
      throw error(409, "Заказ уже занят или недоступен");
    return { status: "assigned", worker_id: u.id };
  }
  if (action === "handover" && client && o.status === "assigned")
    return { sender_confirmed: true };
  if (action === "start" && worker && o.status === "assigned") {
    if (!hasPhoto || description.trim().length < 5)
      throw error(400, "Добавьте фото и описание");
    if (o.category === "delivery" && !o.sender_confirmed)
      throw error(409, "Отправитель ещё не подтвердил передачу");
    return { status: "in_progress" };
  }
  if (action === "finish" && worker && o.status === "in_progress") {
    if (!hasPhoto || description.trim().length < 5)
      throw error(400, "Добавьте фото результата и описание");
    return { status: "awaiting_confirmation" };
  }
  if (action === "confirm" && client && o.status === "awaiting_confirmation")
    return { status: "completed" };
  if (action === "cancel" && client && o.status === "open")
    return { status: "cancelled" };
  throw error(409, "Действие недоступно для текущего статуса");
}
