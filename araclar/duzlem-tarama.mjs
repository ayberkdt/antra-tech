/* Aynı düzlem (z-fighting) taraması: 2,5B süreç hattındaki opak kutuların dünya sınır kutuları karşılaştırılır.
 * Kameraya bakan üç yüzden (üst +y, ön +z, sağ +x) biri iki parçada aynı konumdaysa (< 2 mm) ve öbür iki eksende
 * üst üste biniyorsa kaydırırken titrer. Gerçek GPU ile koşar (yazılımsalda 3B kurulmaz).
 * Yalnız farklı renkli parçalar ve > 1 dm² biniş sayılır: aynı renk köşe birleşimleri görünür titreme üretmez.
 * Kullanım: node araclar/duzlem-tarama.mjs   · çıkış 1 = aynı düzlem çifti var */
import { spawn } from 'node:child_process';
const bk = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9968;
const p = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=D:/Masaustu/WebSite/.cekim-gecici/profil-duzlem', '--use-angle=d3d11', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
let h; for (let i = 0; i < 100; i++) { try { h = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page'); if (h) break; } catch {} await bk(150); }
const ws = new WebSocket(h.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0; const b = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && b.has(m.id)) { b.get(m.id)(m); b.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; b.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
let sonuc = 1;
try {
  await cdp('Page.enable'); await cdp('Page.navigate', { url: 'http://127.0.0.1:4180/?olc=1&webgl=1#surec' }); await bk(3500);
  await ev(`document.getElementById('surec').scrollIntoView({ behavior: 'instant' })`);
  for (let k = 0; k < 60 && !(await ev('!!globalThis.__surecSahne')); k++) await bk(250);
  const r = await ev(`(() => {
    const { sahne, THREE } = globalThis.__surecSahne; sahne.updateMatrixWorld(true);
    const kutular = [];
    sahne.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.opacity < 1) return;
      /* yalnız kendi geometrisi: setFromObject alt nesneleri de katar (flanş, etiket) ve ebeveyni çocukla aynı sınırda gösterir */
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const k = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); if (k.isEmpty()) return;
      kutular.push({ k, renk: (m.color ? m.color.getHexString() : '') + (m.map ? '+doku' : ''), ad: (o.geometry.type || '') + ' ' + ['x', 'y', 'z'].map((e) => k.getCenter(new THREE.Vector3())[e].toFixed(2)).join(',') });
    });
    const ES = 0.002, cift = [];
    const ortus = (a, b, e) => Math.min(a.max[e], b.max[e]) - Math.max(a.min[e], b.min[e]);
    for (let i = 0; i < kutular.length; i++) for (let j = i + 1; j < kutular.length; j++) {
      if (kutular[i].renk === kutular[j].renk) continue;          /* aynı renk üst üste binerse titreme görünmez (köşe birleşimleri) */
      const A = kutular[i].k, B = kutular[j].k;
      for (const [e, d1, d2] of [['y', 'x', 'z'], ['z', 'x', 'y'], ['x', 'y', 'z']]) {
        if (Math.abs(A.max[e] - B.max[e]) < ES && ortus(A, B, d1) * ortus(A, B, d2) > 0.01 && ortus(A, B, d1) > 0.02 && ortus(A, B, d2) > 0.02) cift.push(e + ' ' + A.max[e].toFixed(3) + ' · ' + kutular[i].ad + ' ↔ ' + kutular[j].ad);
      }
    }
    return { sayi: kutular.length, cift };
  })()`);
  console.log(`${r.sayi} opak parça tarandı · aynı düzlem çifti ${r.cift.length}`);
  for (const c of r.cift.slice(0, 60)) console.log('  ' + c);
  sonuc = r.cift.length ? 1 : 0;
} catch (e) { console.log('HATA', e.message); }
process.exitCode = sonuc; ws.close(); p.kill();
