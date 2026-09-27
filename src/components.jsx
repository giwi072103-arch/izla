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
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (!mapsPromise)
    mapsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
      s.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
      s.onerror = () => {
        mapsPromise = null;
        reject(new Error("Maps unavailable"));
      };
      document.head.append(s);
    });
  return mapsPromise;
}
export function DeliveryMap({ apiKey, order, location, onPoint }) {
  const T = useT(),
    ref = useRef(),
    [eta, setEta] = useState(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
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
            order.status === "assigned"
              ? order.pickup_lat != null
                ? [order.pickup_lat, order.pickup_lon]
                : order.pickup + ", " + order.city
              : order.dest_lat != null
                ? [order.dest_lat, order.dest_lon]
                : order.destination + ", " + order.city;
          const route = new y.multiRouter.MultiRoute(
            {
              referencePoints: [start, end],
              params: { routingMode: "auto", results: 1 },
            },
            { boundsAutoApply: true },
          );
          map.geoObjects.add(route);
          route.model.events.add("requestsuccess", () => {
            const r = route.getActiveRoute();
            if (r)
              setEta(
                r.properties.get("durationInTraffic")?.text ||
                  r.properties.get("duration")?.text,
              );
          });
          route.model.events.add("requestfail", () => setFailed(true));
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
      .catch(() => setFailed(true));
    return () => {
      dead = true;
      map?.destroy();
    };
  }, [apiKey, order?.id, order?.status, location?.updated_at]);
  return (
    <div className="map-wrap">
      {apiKey && !failed ? (
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
      {eta && (
        <div className="eta">
          <Navigation size={16} />
          {T("Примерно", "Taxminan", "About")} {eta}
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
