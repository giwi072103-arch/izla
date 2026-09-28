import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, ArrowRight, Compass } from 'lucide-react';
import { useT } from './i18n';
export function LostScene({ missing = false }) {
  if (missing) return <div className="lost-world" aria-hidden="true"><div className="lost-halo"/><span className="lost-orbit"/><span className="lost-spark spark-a"/><span className="lost-spark spark-b"/><span className="lost-spark spark-c"/><div className="lost-numbers"><span className="lost-four">4</span><div className="lost-zero"><div className="lost-lens"><Compass size={66} strokeWidth={1.3}/></div></div><span className="lost-four last">4</span></div><span className="lost-ground"/><span className="lost-path"/></div>;
  return <div className="signal-scene" aria-hidden="true"><span className="signal-ring ring-one"/><span className="signal-ring ring-two"/><span className="signal-satellite satellite-one"/><span className="signal-satellite satellite-two"/><div className="signal-core">{missing ? <Compass size={54} strokeWidth={1.4}/> : <WifiOff size={54} strokeWidth={1.4}/>}</div><span className="signal-floor"/></div>;
}
export function NotFound({ onHome }) {
  const T = useT();
  return <section className="connection-card not-found"><LostScene missing/><span className="eyebrow">404 / IZLA</span><h1>{T('Кажется, мы свернули не туда', 'Bu sahifa topilmadi', 'Looks like a wrong turn')}</h1><p>{T('Этой страницы нет. Вернёмся туда, где можно найти помощь?', 'Bosh sahifaga qaytamizmi?', 'This page does not exist. Let’s return to the services.')}</p><button className="primary" onClick={onHome}>{T('На главную', 'Bosh sahifaga', 'Go home')}<ArrowRight size={18}/></button></section>;
}
export default function ConnectionStatus() {
  const T = useT(), dialog = useRef(), pending = useRef(false), [lost,setLost] = useState(!navigator.onLine), [checking,setChecking] = useState(false);
  useEffect(() => {
    const down = () => setLost(true);
    async function check() {
      if (pending.current) return;
      pending.current = true; setChecking(true);
      try {
        const r = await fetch('/api/health', {cache:'no-store',signal:AbortSignal.timeout(7000)});
        if (r.ok && (await r.json()).status === 'ok') setLost(false);
      } catch {} finally { pending.current=false; setChecking(false); }
    }
    const retry = () => check();
    window.addEventListener('offline',down); window.addEventListener('izla-network-error',down);
    window.addEventListener('online',retry); window.addEventListener('izla-retry',retry);
    const timer = setInterval(() => { if(lost && !document.hidden) check(); },10000);
    if (lost) check();
    return () => { clearInterval(timer); window.removeEventListener('offline',down); window.removeEventListener('izla-network-error',down); window.removeEventListener('online',retry); window.removeEventListener('izla-retry',retry); };
  },[lost]);
  useEffect(() => {
    if(lost && !dialog.current.open) dialog.current.showModal();
    if(!lost && dialog.current.open) dialog.current.close();
  },[lost]);
  return <dialog ref={dialog} className="connection-dialog" onCancel={e=>e.preventDefault()} aria-labelledby="connection-title"><section className="connection-card"><LostScene/><span className="eyebrow">IZLA / {T('НА СВЯЗИ', 'ALOQA', 'CONNECTION')}</span><h1 id="connection-title">{T('Связь взяла паузу', 'Aloqa uzildi', 'Connection paused')}</h1><p>{T('Не удаётся связаться с IZLA. Проверьте интернет — мы автоматически попробуем снова. Открытая форма остаётся на месте.', 'Internetni tekshiring. Avtomatik qayta ulanamiz, ochiq shakl saqlanadi.', 'Cannot reach IZLA. Check your connection. We’ll retry automatically and keep this form open.')}</p><button className="primary" disabled={checking} onClick={()=>window.dispatchEvent(new Event('izla-retry'))}><RefreshCw size={18} className={checking?'spin':''}/>{checking ? T('Подключаемся…','Ulanmoqda…','Connecting…') : T('Попробовать снова','Qayta urinish','Try again')}</button><small role="status">{T('После подключения проверьте статус последнего действия.', 'Ulangach oxirgi amal holatini tekshiring.', 'After reconnecting, check the status of your last action.')}</small></section></dialog>;
}
