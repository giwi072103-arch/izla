const lang = (navigator.language || 'ru').slice(0,2);
const words = lang === 'uz' ? ['Aloqa uzildi','Internetni tekshiring. Avtomatik qayta ulanamiz.','Qayta urinish','Ulanmoqda…','Hali aloqa yo‘q.'] : lang === 'en' ? ['Connection paused','Check your internet. We’ll automatically try again.','Try again','Connecting…','Still unable to connect.'] : ['Связь взяла паузу','Проверьте интернет. Мы автоматически попробуем подключиться снова.','Попробовать снова','Подключаемся…','Пока не удалось подключиться.'];
document.documentElement.lang = ['ru','uz','en'].includes(lang) ? lang : 'ru';
document.getElementById('title').textContent=words[0];document.getElementById('body').textContent=words[1];
const button=document.getElementById('retry'),status=document.getElementById('status');button.textContent=words[2];
async function retry(){if(button.disabled)return;button.disabled=true;status.textContent=words[3];try{const r=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(7000)});if(r.ok&&(await r.json()).status==='ok'){location.reload();return;}}catch{}button.disabled=false;status.textContent=words[4];}
button.addEventListener('click',retry);window.addEventListener('online',retry);setInterval(()=>{if(!document.hidden)retry();},10000);
