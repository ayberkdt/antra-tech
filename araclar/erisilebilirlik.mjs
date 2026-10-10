/* axe-core erişilebilirlik denetimi: sayfa sona kadar kaydırılır (tembel sahneler kurulsun), axe CDP ile enjekte edilir.
 * Kullanım: node araclar/erisilebilirlik.mjs 1440x900 [adres]
 * axe-core yolu AXE_YOLU ile verilir (varsayılan: bu makinedeki 4.12.1 kopyası). Çıkış kodu 1 = ihlal var. */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [g, y] = (process.argv[2] || '1440x900').split('x').map(Number);
const url = process.argv[3] || 'http://127.0.0.1:4180/?az=1';
const port = 9960 + (g % 7);
const p = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=D:/Masaustu/WebSite/.cekim-gecici/profil-axe${g}`, '--use-angle=d3d11', `--window-size=${g},${y}`, 'about:blank'], { stdio: 'ignore' });
const bk = (ms) => new Promise((r) => setTimeout(r, ms));
let h; for (let i = 0; i < 100; i++) { try { h = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page'); if (h) break; } catch {} await bk(150); }
const ws = new WebSocket(h.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0; const b = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && b.has(m.id)) { b.get(m.id)(m); b.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; b.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  return r.result?.result?.value;
};
const bitir = () => { ws.close(); p.kill(); };
try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: g, height: y, deviceScaleFactor: 1, mobile: g < 700 });
  await cdp('Page.enable'); await cdp('Page.navigate', { url }); await bk(3000);
  /* tembel sahneler kurulsun: sona kadar kaydır, başa dön */
  const H = await ev('document.documentElement.scrollHeight');
  for (let s = 0; s < H; s += 700) { await ev(`scrollTo(0, ${s})`); await bk(120); }
  await ev('scrollTo(0,0)'); await bk(500);
  await ev(readFileSync(process.env.AXE_YOLU || 'D:/Masaustu/WebSite/hesap-defteri/node_modules/axe-core/axe.min.js', 'utf8'));
  const r = JSON.parse(await ev(`axe.run(document, { resultTypes: ['violations', 'incomplete'] }).then((r) => JSON.stringify({
    v: r.violations.map((v) => ({ id: v.id, etki: v.impact, n: v.nodes.length, ornek: v.nodes.slice(0, 4).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split(String.fromCharCode(10)).slice(1, 2).join('')) })),
    i: r.incomplete.map((v) => ({ id: v.id, n: v.nodes.length, ornek: v.nodes.slice(0, 2).map((x) => x.target.join(' ')) })),
  }))`));
  console.log(`${g}x${y} ${url}`);
  console.log('İHLAL', r.v.length);
  for (const v of r.v) console.log(` - ${v.id} [${v.etki}] ×${v.n}\n     ${v.ornek.join('\n     ')}`);
  console.log('BELİRSİZ', r.i.map((x) => `${x.id}×${x.n} (${x.ornek.join(' | ')})`).join('\n  '));
  process.exitCode = r.v.length ? 1 : 0;
} catch (h) { console.log('HATA', h.message); process.exitCode = 2; }
bitir();
