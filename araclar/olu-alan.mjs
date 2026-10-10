/* Ölü alan denetimi: her bölümde içerik kutuları sol/sağ yarıya ayrılır; bir yarı doluyken öbür yarının boş kaldığı
 * dikey bantlar ("tek taraflı boşluk") ölçülür. Bir bölümde ESIK px'ten uzun tek taraflı boşluk varsa düşer.
 * Bölüm iç boşluğu (padding) sayılmaz: yalnız ilk içerik kutusunun üstü ile son içerik kutusunun altı arası taranır.
 * Kullanım: node araclar/olu-alan.mjs [adres] (varsayılan http://127.0.0.1:4180/?az=1) · genişlikler 1440 ve 1024. */
import { spawn } from 'node:child_process';
const ADRES = process.argv[2] || 'http://127.0.0.1:4180/?az=1';
const ESIK = 220;
const bk = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9966;
const p = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=D:/Masaustu/WebSite/.cekim-gecici/profil-olu', '--use-angle=d3d11', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
let h; for (let i = 0; i < 100; i++) { try { h = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page'); if (h) break; } catch {} await bk(150); }
const ws = new WebSocket(h.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0; const b = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && b.has(m.id)) { b.get(m.id)(m); b.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; b.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };

const OLC = `(() => {
  const gorunur = (e) => { const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const icerik = (e) => /^(IMG|CANVAS|SVG|VIDEO|BUTTON|INPUT|TEXTAREA|SELECT|svg)$/.test(e.tagName) || [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
  const sonuc = [];
  /* kahraman hariç: zemini dokuma tezgâhı tuvali (aria-hidden), 1100 px altında künye gizli — sağ yarı boş değil, kumaş */
  for (const sec of document.querySelectorAll('main > section:not(#giris)')) {
    const kap = sec.querySelector('.kap') || sec, kr = kap.getBoundingClientRect(), orta = kr.left + kr.width / 2;
    /* kutu değil mürekkep: metin için satır kutuları (Range), görsel öğeler için kendi kutusu — blok başlığın tam genişlik kutusu sağ yarıyı "dolu" göstermesin */
    const kutular = [];
    const tw = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    for (let t; (t = tw.nextNode()); ) {
      const e = t.parentElement; if (!t.textContent.trim() || !e || !gorunur(e) || e.closest('[aria-hidden="true"]')) continue;
      const rg = document.createRange(); rg.selectNodeContents(t); kutular.push(...[...rg.getClientRects()]);
    }
    for (const e of sec.querySelectorAll('img, canvas, video, input, textarea, select, button, svg:not([aria-hidden="true"] svg)')) {
      if (gorunur(e) && !(e.closest('[aria-hidden="true"]') && e.tagName !== 'CANVAS')) kutular.push(e.getBoundingClientRect());
    }
    kutular.splice(0, kutular.length, ...kutular.filter((r) => r.width > 2 && r.height > 2));
    if (!kutular.length) continue;
    const ust = Math.min(...kutular.map((r) => r.top)), alt = Math.max(...kutular.map((r) => r.bottom));
    const yari = (sol) => kutular.filter((r) => (sol ? Math.min(r.right, orta) - Math.max(r.left, kr.left) : Math.min(r.right, kr.right) - Math.max(r.left, orta)) > 40).map((r) => [r.top, r.bottom]).sort((a, c) => a[0] - c[0]);
    const bosluklar = (ar) => { const g = []; let y = ust; for (const [a, c] of ar) { if (a > y) g.push([y, a]); y = Math.max(y, c); } if (alt > y) g.push([y, alt]); return g; };
    const dolu = (ar, a, c) => ar.reduce((t, [x, z]) => t + Math.max(0, Math.min(z, c) - Math.max(x, a)), 0);
    const S = yari(true), R = yari(false); let enUzun = 0, nerede = '';
    for (const [ad, ar, obur] of [['sol', S, R], ['sağ', R, S]]) for (const [a, c] of bosluklar(ar)) {
      const boy = c - a; if (dolu(obur, a, c) >= 0.6 * boy && boy > enUzun) { enUzun = boy; nerede = ad + ' ' + Math.round(a + scrollY) + '–' + Math.round(c + scrollY); }
    }
    sonuc.push([sec.id || sec.className, Math.round(enUzun), nerede]);
  }
  return sonuc;
})()`;
let dusen = 0;
try {
  for (const g of [1440, 1024]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: g, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.enable'); await cdp('Page.navigate', { url: ADRES }); await bk(3000);
    const H = await ev('document.documentElement.scrollHeight');
    for (let s = 0; s < H; s += 600) { await ev(`scrollTo(0, ${s})`); await bk(80); }
    await ev('scrollTo(0, 0)'); await bk(600);
    for (const [ad, boy, yer] of await ev(OLC)) {
      const kotu = boy > ESIK; if (kotu) dusen++;
      console.log(`${kotu ? '✗' : '✓'} ${g}px ${ad.padEnd(12)} en uzun tek taraflı boşluk ${String(boy).padStart(4)} px ${yer}`);
    }
  }
} catch (e) { console.log('HATA', e.message); dusen++; }
console.log(dusen ? `${dusen} bölümde ${ESIK} px üstü tek taraflı boşluk` : `ölü alan yok (eşik ${ESIK} px)`);
process.exitCode = dusen ? 1 : 0;
ws.close(); p.kill();
