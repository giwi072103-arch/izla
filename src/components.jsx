import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ArrowRight,
  MapPin,
  Navigation,
  X,
  LoaderCircle,
} from "lucide-react";
import { useT } from "./i18n";
export function Button({ busy, children, ...props }) {
  return (
    <button {...props} disabled={props.disabled || busy}>
      {busy ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function CameraCapture({
  value,
  onChange,
  label,
  facing = "environment",
}) {
  const T = useT(),
    video = useRef(),
    stream = useRef(),
    [active, setActive] = useState(false),
    [err, setErr] = useState("");
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActive(false);
  };
  useEffect(
    () => () => stream.current?.getTracks().forEach((t) => t.stop()),
    [],
  );
  useEffect(() => {
    if (active && video.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => {});
    }
  }, [active]);
  async function start() {
    setErr("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          T(
            "Камера доступна через HTTPS.",
            "Kamera HTTPS orqali ishlaydi.",
            "Camera requires HTTPS.",
          ),
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      setActive(true);
    } catch (e) {
      setErr(
        T(
          "Не удалось открыть камеру. Разрешите доступ в настройках браузера.",
          "Kameraga ruxsat bering.",
          "Allow camera access in browser settings.",
        ),
      );
    }
  }
  function capture() {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas"),
      scale = Math.min(1, 1280 / v.videoWidth);
    c.width = v.videoWidth * scale;
    c.height = v.videoHeight * scale;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    onChange(c.toDataURL("image/jpeg", 0.82));
    stop();
  }
  return (
    <div className="capture">
      <div className="small muted">{label}</div>
      {active ? (
        <>
          <video ref={video} autoPlay playsInline muted />
          <div className="row">
            <button type="button" className="primary" onClick={capture}>
              <Camera size={18} />
              {T("Снять", "Suratga olish", "Capture")}
            </button>
            <button type="button" className="ghost" onClick={stop}>
              {T("Отмена", "Bekor qilish", "Cancel")}
            </button>
          </div>
        </>
      ) : value ? (
        <div className="photo-preview">
          <img src={value} alt={label} />
          <button type="button" onClick={start} className="secondary">
            <Camera size={16} />
            {T("Переснять", "Qayta olish", "Retake")}
          </button>
        </div>
      ) : (
        <button type="button" className="capture-button" onClick={start}>
          <Camera />
          <span>{T("Сделать фото", "Suratga olish", "Take a photo")}</span>
        </button>
      )}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
export function SlideAction({ label, disabled, onConfirm, busy }) {
  const [v, set] = useState(0),
    T = useT();
  function confirm() {
    if (v >= 95 && !disabled && !busy) onConfirm();
    set(0);
  }
  return (
    <div className={"slide " + (disabled ? "disabled" : "")}>
      <span>{busy ? T("Подождите…", "Kuting…", "Please wait…") : label}</span>
      <ArrowRight size={19} />
      <input
        aria-label={label}
        type="range"
        min="0"
        max="100"
        value={v}
        disabled={disabled || busy}
        onChange={(e) => set(Number(e.target.value))}
        onPointerUp={confirm}
        onKeyUp={(e) => {
          if (["ArrowRight", "End", "Enter", " "].includes(e.key)) confirm();
        }}
      />
    </div>
  );
}
let mapsPromise;
function loadMaps(key) {
  if (!mapsPromise) mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => fail(), 20000);
    function fail() { clearTimeout(timer); script.remove(); mapsPromise = null; reject(new Error("Maps unavailable")); }
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) return fail();
      window.ymaps.ready(() => { clearTimeout(timer); resolve(window.ymaps); });
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return mapsPromise;
}
async function addressResults(apiKey, geocoderKey, query, count = 1) {
  if (geocoderKey) {
    const params = new URLSearchParams({ apikey: geocoderKey, format: "json", lang: "ru_RU", results: String(count), geocode: Array.isArray(query) ? `${query[1]},${query[0]}` : query });
    const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Geocoder unavailable");
    const data = await response.json();
    return (data.response?.GeoObjectCollection?.featureMember || []).map(({ GeoObject: item }) => {
      const [lon, lat] = item.Point.pos.split(" ").map(Number);
      return { address: item.metaDataProperty.GeocoderMetaData.text, coords: [lat, lon] };
    });
  }
  const y = await loadMaps(apiKey), result = await y.geocode(query, { results: count }), items = [];
  result.geoObjects.each(item => items.push({ address: item.getAddressLine(), coords: item.geometry.getCoordinates() }));
  return items;
}
export function AddressPicker({ apiKey, geocoderKey, suggestKey, value, city, selectedPoint, onSelect }) {
  const T = useT(), ref = useRef(), mapRef = useRef(), marker = useRef(),
    latest = useRef(onSelect), sequence = useRef(0), alive = useRef(true),
    [message, setMessage] = useState(""), [busy, setBusy] = useState(false),
    [suggestions, setSuggestions] = useState([]), [suggestStatus, setSuggestStatus] = useState(""),
    suggestSequence = useRef(0), selecting = useRef(false);
  latest.current = onSelect;
  useEffect(() => {
    const request = ++suggestSequence.current;
    setSuggestions([]); setSuggestStatus("");
    if (!apiKey || selectedPoint || value.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (selecting.current) return;
      setSuggestStatus("loading");
      try {
        let items;
        if (suggestKey) {
          const params = new URLSearchParams({ apikey: suggestKey, text: `Узбекистан, ${city}, ${value.trim()}`, results: "5", types: "geo", print_address: "1", lang: "ru" });
          const response = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params}`, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error("Suggestions unavailable");
          const data = await response.json();
          items = (data.results || []).map(item => ({ address: item.address?.formatted_address || [item.subtitle?.text, item.title?.text].filter(Boolean).join(", "), coords: null }));
        } else {
          items = await addressResults(apiKey, geocoderKey, `Узбекистан, ${city}, ${value.trim()}`, 5);
        }
        if (cancelled || request !== suggestSequence.current || selecting.current) return;
        items = items.filter((item, i, all) => item.address && all.findIndex(x => x.address === item.address) === i);
        setSuggestions(items); setSuggestStatus(items.length ? "" : "empty");
      } catch { if (!cancelled && request === suggestSequence.current) setSuggestStatus("error"); }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [apiKey, geocoderKey, suggestKey, value, city, selectedPoint?.lat, selectedPoint?.lon]);
  async function choose(coords, knownAddress) {
    const request = ++sequence.current;
    selecting.current = true; suggestSequence.current++;
    setSuggestions([]); setSuggestStatus("");
    setBusy(true); setMessage("");
    try {
      if (!coords) {
        const matches = await addressResults(apiKey, geocoderKey, knownAddress);
        if (!matches.length) throw new Error("Address not found");
        coords = matches[0].coords;
      }
      const y = await loadMaps(apiKey);
      if (!alive.current || request !== sequence.current) return;
      if (marker.current) mapRef.current.geoObjects.remove(marker.current);
      marker.current = new y.Placemark(coords, {}, { draggable: true });
      mapRef.current.geoObjects.add(marker.current);
      marker.current.events.add("dragend", () => choose(marker.current.geometry.getCoordinates()));
      mapRef.current.setCenter(coords, 16);
      if (knownAddress) {
        latest.current({ lat: coords[0], lon: coords[1] }, knownAddress);
        return;
      }
      // Store the selected coordinates even if reverse geocoding fails.
      latest.current({ lat: coords[0], lon: coords[1] }, "");
      const result = await addressResults(apiKey, geocoderKey, coords);
      if (!alive.current || request !== sequence.current) return;
      const address = result[0]?.address || "";
      latest.current({ lat: coords[0], lon: coords[1] }, address);
      if (!address) setMessage(T("Точка выбрана. Укажите улицу и дом вручную.", "Nuqta tanlandi. Manzilni kiriting.", "Point selected. Enter the address manually."));
    } catch {
      if (alive.current && request === sequence.current) setMessage(T("Не удалось определить адрес. Введите его вручную.", "Manzilni qo‘lda kiriting.", "Could not resolve address. Enter it manually."));
    } finally { if (request === sequence.current) { selecting.current = false; if (alive.current) setBusy(false); } }
  }
  useEffect(() => {
    alive.current = true;
    if (!apiKey) return;
    let dead = false;
    loadMaps(apiKey).then(y => {
      if (dead) return;
      mapRef.current = new y.Map(ref.current, { center: [39.768, 64.455], zoom: 12, controls: ["zoomControl"] });
      mapRef.current.events.add("click", e => choose(e.get("coords")));
    }).catch(() => { if (!dead) setMessage(T("Карта не загрузилась. Проверьте подключение и ключ API.", "Xarita yuklanmadi.", "Map failed to load. Check connectivity and API key.")); });
    return () => { dead = true; alive.current = false; sequence.current++; mapRef.current?.destroy(); mapRef.current = null; marker.current = null; };
  }, [apiKey]);
  async function search() {
    setBusy(true); setMessage("");
    try {
      const result = await addressResults(apiKey, geocoderKey, `Узбекистан, ${city}, ${value}`), item = result[0];
      if (!alive.current) return;
      if (!item) throw new Error();
      await choose(item.coords, item.address);
    } catch { if (alive.current) setMessage(T("Адрес не найден. Выберите точку на карте.", "Manzil topilmadi.", "Address not found. Select a point on the map.")); }
    finally { if (alive.current) setBusy(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setMessage(T("Геолокация недоступна", "Geolokatsiya mavjud emas", "Location unavailable")); return; }
    setBusy(true); setMessage("");
    navigator.geolocation.getCurrentPosition(p => { if (alive.current) choose([p.coords.latitude, p.coords.longitude]); }, () => {
      if (alive.current) { setBusy(false); setMessage(T("Разрешите геолокацию или выберите точку на карте.", "Geolokatsiyaga ruxsat bering yoki nuqtani tanlang.", "Allow location access or select a point on the map.")); }
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }
  if (!apiKey) return <p className="notice">{T("Выбор на карте появится после подключения Яндекс Карт. Пока введите адрес вручную.", "Xarita ulanguncha manzilni qo‘lda kiriting.", "Enter the address manually until Yandex Maps is connected.")}</p>;
  return <div className="form-stack">
    {suggestions.length > 0 && <ul className="address-suggestions" aria-label={T("Подходящие адреса", "Mos manzillar", "Matching addresses")}>
      {suggestions.map(item => <li key={item.address}><button type="button" disabled={busy} onClick={() => choose(item.coords, item.address)}><MapPin size={18}/><span>{item.address}</span><ArrowRight size={16}/></button></li>)}
    </ul>}
    {suggestStatus && <small role="status">{suggestStatus === "loading" ? T("Ищем адреса…", "Manzillar qidirilmoqda…", "Searching addresses…") : suggestStatus === "empty" ? T("Ничего не найдено. Уточните город и улицу.", "Topilmadi. Shahar va ko‘chani aniqlashtiring.", "No matches. Refine the city and street.") : T("Подсказки Яндекса недоступны. Можно ввести адрес вручную.", "Yandex tavsiyalari mavjud emas. Manzilni qo‘lda kiriting.", "Yandex suggestions unavailable. Enter the address manually.")}</small>}
    <div className="row"><Button type="button" className="secondary" busy={busy} onClick={locate}><Navigation size={16}/>{T("Моё местоположение", "Mening joylashuvim", "My location")}</Button>
    <Button type="button" className="ghost" disabled={busy || value.trim().length < 3} onClick={search}>{T("Найти адрес", "Manzilni topish", "Find address")}</Button></div>
    <div ref={ref} className="map" aria-label={T("Выберите адрес на карте", "Manzilni xaritada tanlang", "Select address on map")} />
    <small>{T("Нажмите на карту или перетащите метку. Проверьте улицу и номер дома.", "Xaritani bosing yoki belgini suring. Manzilni tekshiring.", "Tap the map or drag the marker. Check the street and house number.")}</small>
    {message && <p role="status" className="notice">{message}</p>}
  </div>;
}
export function DeliveryMap({ apiKey, order, location, onPoint }) {
  const T = useT(),
    ref = useRef(),
    [eta, setEta] = useState(null),
    [distance, setDistance] = useState(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setEta(null); setDistance(null); setFailed(false);
    if (!apiKey) return;
    let map,
      dead = false;
    loadMaps(apiKey)
      .then((y) => {
        if (dead) return;
        map = new y.Map(ref.current, {
          center: [39.768, 64.455],
          zoom: 12,
          controls: ["zoomControl"],
        });
        if (onPoint)
          map.events.add("click", (e) => {
            const [lat, lon] = e.get("coords");
            map.geoObjects.removeAll();
            map.geoObjects.add(new y.Placemark([lat, lon]));
            onPoint({ lat, lon });
          });
        if (order) {
          const start = location
            ? [location.lat, location.lon]
            : order.pickup_lat != null
              ? [order.pickup_lat, order.pickup_lon]
              : order.pickup + ", " + order.city;
          const end =
            order.status === "assigned" && location
              ? order.pickup_lat != null
                ? [order.pickup_lat, order.pickup_lon]
                : order.pickup + ", " + order.city
              : order.dest_lat != null
                ? [order.dest_lat, order.dest_lon]
                : order.destination + ", " + order.city;
          const route = new y.multiRouter.MultiRoute(
            {
              referencePoints: [start, end],
              params: { routingMode: "auto", results: 1, avoidTrafficJams: true },
            },
            { boundsAutoApply: true },
          );
          map.geoObjects.add(route);
          route.model.events.add("requestsuccess", () => {
            const r = route.getActiveRoute();
            if (dead) return;
            if (r) {
              setDistance(r.properties.get("distance")?.text || null);
              setEta(
                r.properties.get("durationInTraffic")?.text ||
                  r.properties.get("duration")?.text,
              );
            } else { setEta(null); setDistance(null); setFailed(true); }
          });
          route.model.events.add("requestfail", () => { if (!dead) { setEta(null); setDistance(null); setFailed(true); } });
          if (location)
            map.geoObjects.add(
              new y.Placemark(
                [location.lat, location.lon],
                { iconCaption: T("Курьер", "Kuryer", "Courier") },
                { preset: "islands#greenCircleDotIcon" },
              ),
            );
        }
      })
      .catch(() => { if (!dead) setFailed(true); });
    return () => {
      dead = true;
      map?.destroy();
    };
  }, [apiKey, order?.id, order?.status, order?.pickup, order?.destination, order?.city, order?.pickup_lat, order?.pickup_lon, order?.dest_lat, order?.dest_lon, location?.updated_at]);
  return (
    <div className="map-wrap">
      {apiKey ? (
        <div ref={ref} className="map" />
      ) : (
        <div className="map-empty">
          <div className="map-icon">
            <MapPin size={32} />
          </div>
          <strong>
            {T("Ваш маршрут", "Sizning yo‘nalishingiz", "Your route")}
          </strong>
          <span>
            {order
              ? `${order.pickup} → ${order.destination}`
              : T(
                  "Отметьте адреса в форме",
                  "Manzillarni kiriting",
                  "Enter addresses in the form",
                )}
          </span>
          <small>
            {T(
              "Карта и расчёт времени появятся после подключения Яндекс Карт.",
              "Yandex xaritasi ulangach vaqt hisoblanadi.",
              "Map and ETA become available when Yandex Maps is connected.",
            )}
          </small>
        </div>
      )}
      {failed && <p role="status" className="notice">{T("Маршрут недоступен. Проверьте адреса и подключение карты.", "Yo‘nalish mavjud emas. Manzillarni tekshiring.", "Route unavailable. Check addresses and map connection.")}</p>}
      {eta && (
        <div className="eta">
          <Navigation size={16} />
          {distance} · {T("Примерно", "Taxminan", "About")} {eta}
        </div>
      )}
    </div>
  );
}
export function Empty({ icon: Icon = Check, title, children }) {
  return (
    <div className="empty">
      <Icon size={32} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
