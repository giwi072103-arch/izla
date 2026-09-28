export async function api(path, body) {
  let r;
  try { r = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-IZLA-Client": "web" },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  } catch (e) {
    window.dispatchEvent(new Event('izla-network-error'));
    throw new Error('Нет связи с сервером. После подключения проверьте статус действия перед повтором.');
  }
  if (r.status >= 500) window.dispatchEvent(new Event('izla-network-error'));
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Ошибка сети");
  return d;
}
