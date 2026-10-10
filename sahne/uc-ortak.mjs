/* 3B ORTAK — süreç maketi (surec3b.mjs) ve laboratuvar cihazlarının (lab3b.mjs) paylaştığı three.js parçaları:
 * tuval dokuları, yordamsal ortam ışığı, PBR malzeme paleti, parça kurucuları, maket kaidesi.
 * Renk dili sitenin paletidir: krem emaye gövde, lacivert boya, çelik, tek vurgu kırmızı (iplik ve şerit). */
import * as THREE from '../vendor/three-r184/three.module.min.js';

export { THREE };
export const TAU = Math.PI * 2;
export const kesir = (x) => x - Math.floor(x);
export const yumusak = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export const RENK = {
  emaye: 0xefe6d2, laci: 0x27325f, laciKoyu: 0x1a2147, celik: 0xd3d7de, celikKoyu: 0x8c93a1, kirmizi: 0xb8292b,
  pirinc: 0xb4967b, kaide: 0x121733, ahsap: 0xb98a58, lif: 0xf4f0e6, kraft: 0xc29a68,
};

export function tuval(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function dokuYap(c, tekrar = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (tekrar) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
/** Fabrika zemini: açık epoksi, karo, ince derz */
export function zeminDokusu() {
  const c = tuval(256), g = c.getContext('2d');
  g.fillStyle = '#e4ddcd'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `rgba(30, 36, 70, ${0.015 + 0.02 * ((i + 2 * j) % 3)})`; g.fillRect(i * 128, j * 128, 128, 128); }
  g.strokeStyle = 'rgba(30, 36, 70, .14)'; g.lineWidth = 2;
  for (const k of [0, 128, 256]) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); }
  return c;
}
/** 2/1 dimi kumaş, 48 × 48 hücre; kenar: tuvalin üstünde (v ≈ 0,9) kırmızı kenar ipliği */
export function kumasDokusu(cozgu, atki, kenar = true) {
  const N = 48, P = 4, c = tuval(N * P), g = c.getContext('2d');
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const ust = (((i - j) % 3) + 3) % 3 < 2;
    g.fillStyle = ust ? cozgu : atki; g.fillRect(i * P, j * P, P, P);
    g.fillStyle = ust ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.14)'; g.fillRect(i * P, j * P, ust ? 1 : P, ust ? P : 1);
  }
  if (kenar) { g.fillStyle = '#c9302f'; g.fillRect(0, N * P * 0.07, N * P, P * 2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, N * P * 0.07, N * P, 1); }
  return c;
}
/** Çelik yüzeyler için yordamsal ortam: soğuk tavan panelleri (fabrika/laboratuvar ışığı), lacivert oda */
export function ortamHaritasi(renderer) {
  const oda = new THREE.Scene();
  oda.add(new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ color: 0x1a2040, side: THREE.BackSide })));
  const panel = (en, boy, renk, guc, konum) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(en, boy), new THREE.MeshBasicMaterial({ color: new THREE.Color(renk).multiplyScalar(guc), side: THREE.DoubleSide }));
    p.position.set(...konum); p.lookAt(0, 0, 0); oda.add(p);
  };
  panel(12, 2, 0xf4f1ea, 3.0, [-4, 6.5, 4]); panel(12, 2, 0xf4f1ea, 2.4, [6, 6.5, -3]); panel(3, 8, 0xdfe6ff, 1.3, [12, 2, 6]);
  const pm = new THREE.PMREMGenerator(renderer);
  const doku = pm.fromScene(oda, 0.04).texture;
  pm.dispose();
  return doku;
}
/** Renderer + sahne + ışık kurulumu (WebGL yoksa null) */
export function renderKur(tuvalEl, { golgeBoyu = 2048 } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: tuvalEl, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  /* yazılımsal çizici (GPU yok: SwiftShader, llvmpipe, Microsoft Basic Render) 3B sahneyi saniyelerce kilitler: 2B yedeğe düş.
     ?webgl=1 zorlar (ekran görüntüsü araçları yazılımsal GPU'yla çalışır) */
  const gl = renderer.getContext(), bilgi = gl.getExtension('WEBGL_debug_renderer_info');
  const cizici = bilgi ? String(gl.getParameter(bilgi.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(cizici) && new URLSearchParams(location.search).get('webgl') !== '1') { renderer.dispose(); renderer.forceContextLoss(); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const sahne = new THREE.Scene();
  /* ortam haritası (PMREM) gerçek GPU'da bile ~2 s gölgelendirici derlemesi istiyordu (ANGLE/D3D11, 2026-10-10 ölçümü):
     yerine metaller düşük metallik + üç ışıkla okunur; ortamHaritasi() isteğe bağlı kaldı */
  sahne.add(new THREE.HemisphereLight(0xf4f0ea, 0x1a2147, 1.25));
  const dolgu = new THREE.DirectionalLight(0xdfe6ff, 0.55); dolgu.position.set(4, 3, 8); sahne.add(dolgu);
  const anahtar = new THREE.DirectionalLight(0xfff6ea, 2.3);
  anahtar.castShadow = true;
  anahtar.shadow.mapSize.set(golgeBoyu, golgeBoyu);
  anahtar.shadow.bias = -0.0006; anahtar.shadow.normalBias = 0.025;
  const kenarIsik = new THREE.DirectionalLight(0xffd8c0, 0.7);
  sahne.add(anahtar, anahtar.target, kenarIsik, kenarIsik.target);
  return { renderer, sahne, anahtar, kenarIsik };
}
/** Malzeme paleti */
export function malzemeler() {
  const std = (renk, roughness = 0.5, metalness = 0.05, ek = {}) => new THREE.MeshStandardMaterial({ color: renk, roughness, metalness, ...ek });
  return {
    std,
    emaye: std(RENK.emaye, 0.55), laci: std(RENK.laci, 0.5, 0.1), laciKoyu: std(RENK.laciKoyu, 0.6, 0.1),
    celik: std(RENK.celik, 0.34, 0.25), celikKoyu: std(RENK.celikKoyu, 0.42, 0.3), kirmizi: std(RENK.kirmizi, 0.45, 0.1),
    pirinc: std(RENK.pirinc, 0.38, 0.3), ahsap: std(RENK.ahsap, 0.8), lif: std(RENK.lif, 0.95), kraft: std(RENK.kraft, 0.85),
    siyah: std(0x14161f, 0.45, 0.15), kaide: std(RENK.kaide, 0.7),
    cam: std(0xbfd4ff, 0.08, 0.1, { transparent: true, opacity: 0.18, depthWrite: false }),
    isik: new THREE.MeshBasicMaterial({ color: 0xf4f6ff, toneMapped: false }),
    led: (renk) => new THREE.MeshBasicMaterial({ color: renk, toneMapped: false }),
  };
}
/** Parça kurucuları: ekle / kutu / silindir / merdane (z ekseni boyunca yatan silindir) */
export function kurucu(varsayilan) {
  const ekle = (geo, mat, x, y, z, ebeveyn = varsayilan, { golge = true, rx = 0, ry = 0, rz = 0 } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = golge; m.receiveShadow = true; ebeveyn.add(m); return m;
  };
  const kutu = (w, h, d, mat, x, y, z, eb, sec) => ekle(new THREE.BoxGeometry(w, h, d), mat, x, y, z, eb, sec);
  const silindir = (r1, r2, h, mat, x, y, z, eb, sec, seg = 28) => ekle(new THREE.CylinderGeometry(r1, r2, h, seg), mat, x, y, z, eb, sec);
  const merdane = (r, boy, mat, x, y, z = 0, eb = varsayilan, seg = 28) => ekle(new THREE.CylinderGeometry(r, r, boy, seg), mat, x, y, z, eb, { rx: Math.PI / 2 });
  return { ekle, kutu, silindir, merdane };
}
/** Maket kaidesi: lacivert gövde, pirinç kenar, epoksi zemin, iki kırmızı yürüme çizgisi */
export function kaideKur(ebeveyn, M, { x0, x1, z0, z1, cizgi = true }) {
  const { kutu, ekle } = kurucu(ebeveyn);
  const en = x1 - x0, der = z1 - z0, orta = (x0 + x1) / 2, oz = (z0 + z1) / 2;
  const zd = dokuYap(zeminDokusu(), true); zd.repeat.set(en / 1.5, der / 1.5);
  kutu(en, 0.4, der, M.kaide, orta, -0.2, oz, ebeveyn, { golge: false });
  kutu(en + 0.02, 0.05, der + 0.02, M.pirinc, orta, 0, oz, ebeveyn, { golge: false });
  ekle(new THREE.PlaneGeometry(en, der), M.std(0xffffff, 0.85, 0, { map: zd }), orta, 0.03, oz, ebeveyn, { golge: false, rx: -Math.PI / 2 });
  if (cizgi) for (const z of [z0 + 0.45, z1 - 0.45]) ekle(new THREE.PlaneGeometry(en - 0.6, 0.06), M.kirmizi, orta, 0.035, z, ebeveyn, { golge: false, rx: -Math.PI / 2 });
}
/** Gölgelendiricileri derle: tarayıcı paralel derlemeyi destekliyorsa (KHR_parallel_shader_compile) ana iş parçacığını
 *  kilitlemeden, desteklemiyorsa (ör. yazılımsal GPU) ilk karede eşzamanlı. three.js eklenti yokken konsola uyarı yazdığı için önce bakılır. */
export function derle(renderer, sahne, kamera) {
  if (!renderer.extensions.has('KHR_parallel_shader_compile')) return Promise.resolve();
  return renderer.compileAsync(sahne, kamera).catch(() => {});
}
