#!/usr/bin/env node
/* ÇEKİM — başsız Chrome ile sayfa görüntüsü (Chrome DevTools Protokolü, bağımlılık yok).
 *
 *   node araclar/cekim.mjs <adres> <çıktı-klasörü> [genişlik] [yükseklik] [adım, ...]
 *
 * Her adım: "#bolum" (öğeye kaydır), "y=1234" (piksel), "by=900" (göreli), "fare=x,y" (hover), "tik=x,y" (tıklama), "kare" (yerinde çek), "p=surec:0.5" (süreç izinin
 * %50'si), "js=<ifade>" (sayfada çalıştır), "bekle=800" (ms). Her kaydırma adımından
 * sonra bir PNG yazılır: <klasör>/<sıra>-<ad>.png. Konsol hataları sonda listelenir.
 * CEKIM_JS=0 ortam değişkeniyle sayfa JavaScript kapalı açılır; CEKIM_GPU=1 gerçek GPU (ANGLE/D3D11) dener; CEKIM_CPU=6 işlemciyi 6 kat yavaşlatır; CEKIM_YAZDIR=1 yazdırma ortamını taklit eder; CEKIM_AG=3g yavaş ağ.
 * Sunucu çalışıyor olmalı (python .claude/sunucu.py 4180).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [adres, klasor, gS = '1440', yS = '900', ...adimlar] = process.argv.slice(2);
if (!adres || !klasor) { console.error('kullanım: node araclar/cekim.mjs <adres> <klasör> [g] [y] [adım…]'); process.exit(2); }
const G = +gS, Y = +yS;
mkdirSync(klasor, { recursive: true });

const ADAY = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const chrome = ADAY.find(existsSync);
const port = 9300 + Math.floor(Math.random() * 400);
/* geçici profil sistem sürücüsüne değil, projenin bir üst klasörüne yazılır ve sonda silinir */
const profil = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.cekim-gecici', `profil-${port}`);
/* önceki çalışmalardan kalan (alt süreçler kilitlediği için silinemeyen) profilleri temizle */
const gecici = dirname(profil);
if (existsSync(gecici)) for (const ad of readdirSync(gecici)) if (ad.startsWith('profil-')) { try { rmSync(join(gecici, ad), { recursive: true, force: true }); } catch { /* hâlâ kilitli */ } }
mkdirSync(profil, { recursive: true });
const temizle = () => {
  surec.once('exit', () => { try { rmSync(profil, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 }); } catch (h) { /* sonraki çalışma siler */ } });
  try { surec.kill(); } catch { /* zaten kapalı */ }
};
process.on('uncaughtException', (h) => { console.error(h); temizle(); setTimeout(() => process.exit(1), 1000); });
const surec = spawn(chrome, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, '--hide-scrollbars', '--enable-webgl', '--ignore-gpu-blocklist', ...(process.env.CEKIM_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu-rasterization'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']), `--window-size=${G},${Y}`, 'about:blank'], { stdio: 'ignore' });

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
async function hedefBul() {
  for (let i = 0; i < 200; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const s = l.find((h) => h.type === 'page');
      if (s) return s.webSocketDebuggerUrl;
    } catch { /* henüz açılmadı */ }
    await bekle(150);
  }
  throw new Error('Chrome açılmadı');
}

const ws = new WebSocket(await hedefBul());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let no = 0;
const bekleyen = new Map();
const hatalar = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && bekleyen.has(m.id)) { bekleyen.get(m.id)(m); bekleyen.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') hatalar.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) hatalar.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') hatalar.push(`[log] ${m.params.entry.text} ${m.params.entry.url || ''}`);
});
const cdp = (method, params = {}) => new Promise((r) => { const id = ++no; bekleyen.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const deger = async (ifade) => (await cdp('Runtime.evaluate', { expression: ifade, awaitPromise: true, returnByValue: true })).result?.result?.value;

await cdp('Runtime.enable'); await cdp('Log.enable'); await cdp('Page.enable');
if (process.env.CEKIM_CPU) await cdp('Emulation.setCPUThrottlingRate', { rate: +process.env.CEKIM_CPU });   /* CPU yavaşlatma (ör. 6) */
await cdp('Emulation.setDeviceMetricsOverride', { width: G, height: Y, deviceScaleFactor: 1, mobile: G < 700 });
if (G < 700) await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
if (process.env.CEKIM_AG === '3g') {   /* yavaş 3G: 400 ms gecikme, ~400 kbit/s */
  await cdp('Network.enable');
  await cdp('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 50000 });
}
if (process.env.CEKIM_YAZDIR === '1') await cdp('Emulation.setEmulatedMedia', { media: 'print' });   /* yazdırma görünümü */
if (process.env.CEKIM_JS === '0') await cdp('Emulation.setScriptExecutionDisabled', { value: true });   /* JS kapalı sınaması */
await cdp('Page.navigate', { url: adres });
await bekle(+(process.env.CEKIM_ILK || 2500));

let sira = 0;
async function cek(ad) {
  await bekle(350);
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  const dosya = join(klasor, `${String(++sira).padStart(2, '0')}-${ad.replace(/[^a-z0-9ğüşıöç=._-]+/gi, '_')}.png`);
  writeFileSync(dosya, Buffer.from(r.result.data, 'base64'));
  console.log(dosya);
}
if (!adimlar.length) await cek('ilk');
for (const a of adimlar) {
  if (a.startsWith('bekle=')) { await bekle(+a.slice(6)); continue; }
  if (a === 'kare') { await cek('kare'); continue; }          /* kaydırmadan, olduğu yerde çek */
  if (a.startsWith('js=')) { console.log('js →', JSON.stringify(await deger(a.slice(3)))); continue; }
  if (a.startsWith('tus=')) {         /* tus=Tab*6 · tus=ArrowRight · tus=Enter → tuş(lar)a bas, çek */
    const [ad, kez = '1'] = a.slice(4).split('*');
    const kod = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[ad] ?? 0;
    for (let i = 0; i < +kez; i++) {
      /* Enter/Boşluk düğmeyi ancak text alanıyla etkinleştirir (yoksa keypress üretilmez) */
      const metinAl = ad === 'Enter' ? String.fromCharCode(13) : ad === ' ' ? ' ' : undefined;
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: ad, code: ad === ' ' ? 'Space' : ad, windowsVirtualKeyCode: kod, ...(metinAl ? { text: metinAl, unmodifiedText: metinAl } : {}) });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: ad, code: ad === ' ' ? 'Space' : ad, windowsVirtualKeyCode: kod });
    }
    await bekle(300);
    await cek(a.replace('*', 'x'));
    continue;
  }
  if (a.startsWith('tikjs=')) {       /* tikjs=<[x,y] döndüren ifade> → koordinatı sayfadan oku ve hemen tıkla */
    const [x, y] = await deger(a.slice(6));
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    await bekle(200);
    continue;
  }
  if (a.startsWith('tik=')) {         /* tik=x,y → gerçek fare tıklaması (basma + bırakma) */
    const [x, y] = a.slice(4).split(',').map(Number);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    await bekle(300);
    continue;
  }
  if (a.startsWith('fare=')) {        /* imleci (x,y)'ye götür, hover durumunu çek */
    const [x, y] = a.slice(5).split(',').map(Number);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 6, y: y - 6 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await bekle(500);
    await cek(a);
    continue;
  }
  if (a.startsWith('#')) await deger(`document.querySelector(${JSON.stringify(a)}).scrollIntoView({behavior:'instant'}); scrollBy(0, 1); scrollBy(0, -1)`);
  else if (a.startsWith('y=')) await deger(`scrollTo({top:${+a.slice(2)},behavior:'instant'})`);
  else if (a.startsWith('by=')) await deger(`scrollBy({top:${+a.slice(3)},behavior:'instant'})`);   /* by=900 → göreli kaydır */
  else if (a.startsWith('p=')) {
    const [sec, oran] = a.slice(2).split(':');
    await deger(`(() => { const iz = document.querySelector('#${sec}-iz') || document.querySelector('#${sec}'); const r = iz.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * ${+oran}, behavior: 'instant' }); })()`);
    await bekle(900);
  }
  await cek(a);
}
if (hatalar.length) { console.log('\nKONSOL:'); for (const h of [...new Set(hatalar)]) console.log('  ' + h); }
ws.close(); temizle();
