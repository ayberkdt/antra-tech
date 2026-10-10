/* SÜREÇ 3B — "Entegre süreç" bölümünün 2.5B üretim hattı maketi: elyaf balyasından sevkiyata (three.js).
 *
 * Görünüm: ORTOGRAFİK kamera; yapı gerçekten üç boyutlu (ışık, gölge, PBR malzeme), izdüşüm perspektifsiz:
 * hat, kaide üzerinde bir maket gibi sağ önden görünür. Kamera kaydırma ilerlemesiyle hat boyunca kayar
 * (yapışkan bölüm; kaydırma kaçırılmaz), τ = 120 ms yumuşatma. Makineler kendi ritmiyle çalışır.
 *
 * İstasyonlar (x = 6 · i): 01 palet üstünde çemberli balyalar + balya açıcı (çivili bant) · 02 tarak makinesi + şerit kovası +
 * ring iplik makinesi · 03 bobin cağlığı + delikli plaka + çözgü makinesi · 04 hava jetli tezgâh (ön yan gövde maket kesiti gibi
 * alçak: gücü çerçeveleri, tarak ve atkı görünür) · 05 boya teknesi + fular + ramöz · 06 kesim masası + laboratuvar (çekme cihazı,
 * Martindale, monitör) · 07 eğimli ışıklı muayene makinesi · 08 top sarma, palet, tır.
 * Zemin düzlemi y = 0,11 (kaide grubu 0,08 yukarıda); gövdeler pahlı, ayaklar zemine oturur.
 * Kırmızı iplik: ring makinesindeki kırmızı masuradan çıkar, makinelere bağlı iplik gözlerinden geçerek tezgâha ulaşır;
 * dokumadan sonra kumaşın kırmızı kenar ipliği (kumaş şeridi ham çıkar, boya teknesinden lacivert çıkar).
 * Her istasyonun üstünde Antra Tech kontrol mührü (HTML katmanı, dünyadan ekrana izdüşümle konumlanır).
 *
 * Sınırlar: temsilîdir — makine oranları ve hızlar ölçekli değildir. WebGL yoksa null döner; site.mjs 2B yedeği yükler.
 * Başarım: durağan parçaların matrisleri dondurulur; tekrarlı parçalar örneklemeli (InstancedMesh); kamera dururken
 * 30 kare/sn, kayarken her kare; tuval ekranda değilse ya da sekme gizliyse döngü durur. Piksel oranı ≤ 2 (dar ekranda 1,5).
 */
import { THREE, TAU, kesir, yumusak, tuval, dokuYap, kumasDokusu, renderKur, malzemeler, kurucu, kaideKur, derle } from './uc-ortak.mjs';
import { ADIM, ilerlemeHesapla, adimBagla } from './surec-ortak.mjs';
import { metin } from '../ceviri.mjs';

export const ARA = 6;                               /* istasyonlar arası dünya birimi */

/** İlerleme (0–1) → kameranın baktığı dünya x'i (istasyon merkezleri arasında doğrusal). */
export const kameraX = (p) => p * (ADIM - 1) * ARA;

/** Akan iplik: kırmızı zemin, aralıklı açık büküm izi (kayınca akış okunur) */
/** Levent / top sargısı: ince çözgü çizgileri */
function sargiDokusu(zemin, cizgi) {
  const c = tuval(64), g = c.getContext('2d');
  g.fillStyle = zemin; g.fillRect(0, 0, 64, 64);
  g.fillStyle = cizgi; for (let y = 0; y < 64; y += 3) g.fillRect(0, y, 64, 1);
  return c;
}
/** Laboratuvar ekranı: kuvvet–uzama eğrisi */
function ekranDokusu() {
  const c = tuval(256, 160), g = c.getContext('2d');
  g.fillStyle = '#0d1430'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = 'rgba(160, 180, 230, .25)'; g.lineWidth = 1;
  for (let x = 20; x < 256; x += 30) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 150); g.stroke(); }
  for (let y = 20; y < 160; y += 26) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.stroke(); }
  g.strokeStyle = '#ff5b5d'; g.lineWidth = 4; g.beginPath(); g.moveTo(16, 146);
  for (let k = 0; k <= 60; k++) { const e = k / 60, f = e < 0.86 ? 1.15 * (1 - Math.exp(-2.4 * e / 0.86)) * (0.55 + 0.45 * e / 0.86) : Math.max(0, 1 - (e - 0.86) * 12); g.lineTo(16 + e * 220, 146 - Math.min(1, f) * 120); }
  g.stroke();
  g.fillStyle = '#e8eefc'; g.font = '700 18px "JetBrains Mono", monospace'; g.fillText('F 1180 N', 150, 34);
  return c;
}
/** Zemin numarası: istasyon bölgesine boyanmış "01"… */
function numaraDokusu(n) {
  const c = tuval(256, 128), g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(184, 41, 43, .55)'; g.lineWidth = 4; g.setLineDash([16, 10]); g.strokeRect(6, 6, 244, 116);
  g.fillStyle = 'rgba(21, 27, 56, .72)'; g.font = '700 74px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n).padStart(2, '0'), 128, 68);
  return c;
}
/** Sıkıştırılmış lif balyası: krem zemin, kısa açık-koyu lif çizgileri (tohumlu, tekrarlanabilir) */
function lifDokusu() {
  const c = tuval(128), g = c.getContext('2d');
  g.fillStyle = '#efe9db'; g.fillRect(0, 0, 128, 128);
  let t = 11; const rnd = () => { t = (t * 16807) % 2147483647; return t / 2147483647; };
  for (let k = 0; k < 420; k++) { const x = rnd() * 128, y = rnd() * 128, l = 3 + rnd() * 7, a = (rnd() - 0.5) * 0.9; g.strokeStyle = rnd() < 0.5 ? 'rgba(170,150,115,.28)' : 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return c;
}
/** Çivili besleme bandı: lacivert bant, sıra sıra çelik çiviler (kayınca bant akar) */
function civiDokusu() {
  const c = tuval(64), g = c.getContext('2d');
  g.fillStyle = '#25305f'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
  g.fillStyle = '#c9ced8'; for (let y = 6; y < 64; y += 16) for (let x = 4; x < 64; x += 8) g.fillRect(x + ((y / 16) % 2) * 4, y, 2, 4);
  return c;
}
/** Kumanda panosu ekranı: lacivert zemin, durum çubukları, yeşil "çalışıyor" */
function panoDokusu() {
  const c = tuval(128, 64), g = c.getContext('2d');
  g.fillStyle = '#0d1430'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#58c26b'; g.fillRect(8, 8, 26, 10);
  g.fillStyle = 'rgba(200,215,255,.55)'; for (let k = 0; k < 3; k++) g.fillRect(8, 26 + k * 10, 60 + ((k * 37) % 40), 4);
  g.strokeStyle = '#ff5b5d'; g.lineWidth = 3; g.beginPath(); g.moveTo(80, 52); g.lineTo(92, 40); g.lineTo(104, 46); g.lineTo(120, 24); g.stroke();
  return c;
}
/** Delikli kılavuz plakası: çelik, ızgara deliği (alfa) */
function delikliDokusu() {
  const c = tuval(256, 160), g = c.getContext('2d');
  g.fillStyle = '#c7ccd6'; g.fillRect(0, 0, 256, 160);
  g.globalCompositeOperation = 'destination-out';
  for (let y = 18; y < 160; y += 26) for (let x = 14; x < 256; x += 22) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#8c93a1'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 154);
  return c;
}
/** Tel dokusu (tarak, gücü telleri): saydam zemin, sık dikey çelik teller */
function telDokusu(aralik) {
  const c = tuval(256, 64), g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(205,210,220,.95)'; for (let x = 0; x < 256; x += aralik) g.fillRect(x, 0, 1.4, 64);
  return c;
}
/** Kabin ızgarası: koyu zemin, yatay çelik çıtalar */
function izgaraDokusu() {
  const c = tuval(128, 32), g = c.getContext('2d');
  g.fillStyle = '#14161f'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#8c93a1'; for (let y = 3; y < 32; y += 6) g.fillRect(2, y, 124, 2);
  return c;
}
/** Dorse yan yüzü: marka */
function dorseDokusu() {
  const c = tuval(512, 108), g = c.getContext('2d');
  g.clearRect(0, 0, 512, 108);
  g.fillStyle = '#f3eee4'; g.font = '600 64px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ANTRA TECH', 256, 50);
  g.fillStyle = '#e2585a'; g.fillRect(156, 92, 200, 4);
  return c;
}
/** Şerit geometrisi: x–y düzleminde bir eğri, z boyunca genişlik; u uzunluk boyunca (1 birim = 1 döşeme) */
function seritGeometrisi(noktalar, gen, parca = 160) {
  const egri = new THREE.CatmullRomCurve3(noktalar.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal', 0.2);
  const ornek = egri.getSpacedPoints(parca), konum = [], uv = [], indis = [];
  let boy = 0;
  for (let k = 0; k <= parca; k++) {
    if (k) boy += ornek[k].distanceTo(ornek[k - 1]);
    const p = ornek[k];
    konum.push(p.x, p.y, -gen / 2, p.x, p.y, gen / 2);
    uv.push(boy / 1.2, 0, boy / 1.2, 1);
    if (k) { const a = (k - 1) * 2; indis.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(konum, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indis); g.computeVertexNormals();
  return g;
}

export function surec3bKur({ iz, tuval: tuvalEl, adimlar, etiketKatmani, azHareket = false }) {
  const dar = () => (tuvalEl.clientWidth || 800) < 700;
  const kur = renderKur(tuvalEl, { golgeBoyu: dar() ? 1024 : 2048 });
  if (!kur) return null;
  const { renderer, sahne, anahtar, kenarIsik } = kur;
  if (new URLSearchParams(location.search).has('olc')) globalThis.__surecSahne = { sahne, THREE };   /* geliştirme: sahne denetimi (aynı düzlem taraması) */
  const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const gk = anahtar.shadow.camera; gk.left = -11; gk.right = 11; gk.top = 7; gk.bottom = -7; gk.near = 1; gk.far = 50;

  /* ── malzemeler: ortak palet + hatta özgü (boya, kumaş, iplik, sargı, ekran) ── */
  const M = malzemeler(), { std } = M;
  M.su = std(0x1d2760, 0.14, 0.0, { emissive: 0x0d1338, emissiveIntensity: 0.5, envMapIntensity: 0.4 });
  const X0 = -4.2, X1 = (ADIM - 1) * ARA + 5.2, Z0 = -2.6, Z1 = 2.6;
  const hamDoku = dokuYap(kumasDokusu('#ece4d2', '#d8ccb3'), true), laciDoku = dokuYap(kumasDokusu('#27336a', '#16204a'), true);
  M.ham = std(0xffffff, 0.85, 0, { map: hamDoku, side: THREE.DoubleSide });
  M.kumasLaci = std(0xffffff, 0.8, 0, { map: laciDoku, side: THREE.DoubleSide });
  M.iplik = std(0xc42f31, 0.5, 0, { emissive: 0x3a0505, emissiveIntensity: 0.4 });   /* düz renk: çizgili doku ince tüpte kaydırırken kırpışıyordu */
  M.sargiHam = std(0xffffff, 0.75, 0, { map: dokuYap(sargiDokusu('#e9e0cc', 'rgba(120,100,70,.25)'), true) });
  M.sargiLaci = std(0xffffff, 0.7, 0, { map: dokuYap(sargiDokusu('#25305f', 'rgba(255,255,255,.12)'), true) });
  M.ekran = new THREE.MeshBasicMaterial({ map: dokuYap(ekranDokusu()), toneMapped: false });
  M.ekranPano = new THREE.MeshBasicMaterial({ map: dokuYap(panoDokusu()), toneMapped: false });
  M.ahsapKoyu = std(0x8f6a43, 0.85);
  const lifDoku = dokuYap(lifDokusu(), true); lifDoku.repeat.set(1.5, 1);
  M.balya = std(0xffffff, 0.95, 0, { map: lifDoku });
  const civiDoku = dokuYap(civiDokusu(), true); civiDoku.repeat.set(2, 3);
  M.civiBant = std(0xffffff, 0.6, 0.2, { map: civiDoku });
  M.ic = new THREE.MeshBasicMaterial({ color: 0x0a0c18 });
  M.isiPencere = new THREE.MeshBasicMaterial({ color: 0xff8a3c, toneMapped: false, transparent: true, opacity: 0.85 });
  M.lambaSonuk = (c) => std(new THREE.Color(c).multiplyScalar(0.35), 0.4, 0.1);
  M.cam2 = std(0x1c2540, 0.12, 0.3);
  M.izgara = std(0xffffff, 0.5, 0.3, { map: dokuYap(izgaraDokusu()) });
  M.lastik = std(0x17181d, 0.85, 0);
  M.sargiHaki = std(0xffffff, 0.75, 0, { map: dokuYap(sargiDokusu('#5b6142', 'rgba(255,255,255,.1)'), true) });
  M.dorseYazi = new THREE.MeshBasicMaterial({ map: dokuYap(dorseDokusu()), transparent: true, depthWrite: false });
  const delik = dokuYap(delikliDokusu()); M.delikliPlaka = std(0xffffff, 0.45, 0.3, { map: delik, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  M.telTarak = std(0xffffff, 0.4, 0.4, { map: dokuYap(telDokusu(4)), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  M.gucuTel = std(0xffffff, 0.4, 0.4, { map: dokuYap(telDokusu(3)), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });

  const statik = new THREE.Group(); sahne.add(statik);
  const hareketli = new THREE.Group(); sahne.add(hareketli);
  const { ekle, kutu, silindir, merdane } = kurucu(statik);
  const donenler = [];   /* { m, hiz, eksen } */
  const dondur = (m, hiz, eksen = 'y') => { donenler.push({ m, hiz, eksen }); return m; };

  /* ── maket kaidesi + istasyon bölge numaraları ── */
  /* kaide grubu 0,08 yukarıda: zemin düzlemi y = 0,11 (gövdeler, ayaklar ve paletler buna oturur) */
  const kaideG = new THREE.Group(); kaideG.position.y = 0.08; statik.add(kaideG);
  kaideKur(kaideG, M, { x0: X0, x1: X1, z0: Z0, z1: Z1 });
  for (let i = 0; i < ADIM; i++) {
    const n = ekle(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: dokuYap(numaraDokusu(i + 1)), transparent: true, depthWrite: false }), i * ARA - 1.7, 0.12, 1.85, statik, { golge: false, rx: -Math.PI / 2 });
    n.renderOrder = 1;
  }

  /* ── yardımcılar: pahlı gövde (yuvarlatılmış kenar, ışığı kenarda yakalar), ayak takozu, kumanda panosu, ışıklı kule, iplik gözü ──
     Kural: hiçbir parça havada durmaz; her parça bir gövdeye, ayağa ya da dirseğe oturur. */
  const govdeGeo = new Map();
  function govdeGeometrisi(w, h, d, r) {
    const k = `${w}|${h}|${d}|${r}`;
    if (govdeGeo.has(k)) return govdeGeo.get(k);
    const b = Math.min(r, d / 4, w / 4, h / 4), W = w - 2 * b, H = h - 2 * b, rr = Math.min(r, W / 3, H / 3);
    const s = new THREE.Shape(), x = -W / 2, y = -H / 2;
    s.moveTo(x + rr, y); s.lineTo(x + W - rr, y); s.quadraticCurveTo(x + W, y, x + W, y + rr); s.lineTo(x + W, y + H - rr);
    s.quadraticCurveTo(x + W, y + H, x + W - rr, y + H); s.lineTo(x + rr, y + H); s.quadraticCurveTo(x, y + H, x, y + H - rr);
    s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -(d - 2 * b) / 2);
    govdeGeo.set(k, g);
    return g;
  }
  /* y: gövdenin ALT yüzü (oturduğu düzlem) */
  const govde = (w, h, d, mat, x, y, z, eb = statik, sec = {}) => ekle(govdeGeometrisi(w, h, d, sec.r ?? 0.045), mat, x, y + h / 2, z, eb, sec);
  const ayaklar = (x, z, w, d) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) silindir(0.045, 0.06, 0.08, M.siyah, x + sx * (w / 2 - 0.1), 0.07, z + sz * (d / 2 - 0.1)); };
  /* kumanda panosu: yüzeye yaslı plaka + ışıyan ekran + üç düğme; ry ile yüzey yönü (0 = +z'ye bakar) */
  function pano(x, y, z, ry = 0, eb = statik) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; eb.add(g);
    kutu(0.34, 0.24, 0.025, M.laciKoyu, 0, 0, 0.012, g);
    ekle(new THREE.PlaneGeometry(0.2, 0.1), M.ekranPano, -0.03, 0.04, 0.027, g, { golge: false });
    [0x58c26b, 0xffb340, 0xe2585a].forEach((c, k) => silindir(0.016, 0.016, 0.02, M.led(c), 0.1, 0.07 - k * 0.055, 0.03, g, { rx: Math.PI / 2, golge: false }, 12));
    return g;
  }
  /* ışıklı kule (andon): gövde üstüne oturan çubuk + yeşil / sarı / kırmızı halkalar */
  function kule(x, y, z) {
    silindir(0.018, 0.018, 0.16, M.celikKoyu, x, y + 0.08, z);
    [[0x58c26b, 0], [0xffb340, 1], [0xe2585a, 2]].forEach(([c, k]) => silindir(0.04, 0.04, 0.07, k ? M.lambaSonuk(c) : M.led(c), x, y + 0.2 + k * 0.075, z, statik, { golge: false }, 16));
  }
  /* iplik gözü: makine üstündeki dirsekten yükselen çubuk + pirinç halka (y0: dirseğin oturduğu yüzey) */
  function goz(x, y0, y, z) {
    kutu(0.08, 0.03, 0.08, M.celikKoyu, x, y0 + 0.015, z);
    silindir(0.014, 0.014, y - y0, M.celikKoyu, x, (y0 + y) / 2, z);
    ekle(new THREE.TorusGeometry(0.045, 0.012, 8, 20), M.pirinc, x, y, z, statik, { rx: Math.PI / 2 });
  }
  const kukla = new THREE.Object3D();
  const x1 = 0, x2 = ARA, x3 = 2 * ARA, x4 = 3 * ARA, x5 = 4 * ARA, x6 = 5 * ARA, x7 = 6 * ARA, x8 = 7 * ARA;

  /* ═══ 01 HAMMADDE: palet üstünde sıkıştırılmış lif balyaları (dört yandan çelik çember), balya açıcı (çivili besleme bandı, hazne), emme kanalı ═══ */
  const PX = x1 - 1.45, PZ = 0.1;
  for (let k = 0; k < 5; k++) kutu(2.1, 0.035, 0.27, M.ahsap, PX, 0.248, PZ - 0.72 + k * 0.36);
  for (const dz of [-0.7, 0, 0.7]) kutu(2.1, 0.12, 0.14, M.ahsapKoyu, PX, 0.17, PZ + dz);
  const BW = 0.96, BH = 0.58, BD = 0.8;
  for (const [dx, dz, kat] of [[-0.5, -0.42, 0], [0.5, -0.42, 0], [-0.5, 0.42, 0], [0.5, 0.42, 0], [0, 0, 1]]) {
    const bx = PX + dx * (kat ? 0 : 1), bz = PZ + dz * (kat ? 0 : 1), by = 0.266 + kat * BH;
    govde(BW, BH, BD, M.balya, bx, by, bz, statik, { r: 0.07 });
    for (const k of [-0.3, 0, 0.3]) kutu(0.022, BH + 0.012, BD + 0.012, M.celikKoyu, bx + k * BW, by + BH / 2, bz);
  }
  kutu(0.18, 0.11, 0.012, M.emaye, PX - 0.22, 0.266 + BH * 1.55, PZ + BD / 2 + 0.008);                 /* balya künyesi: üst balyanın ön yüzünde */
  kutu(0.18, 0.025, 0.014, M.kirmizi, PX - 0.22, 0.266 + BH * 1.55 + 0.035, PZ + BD / 2 + 0.009);
  const AX = x1 + 1.35;
  kutu(1.36, 0.12, 1.28, M.laci, AX, 0.17, 0);
  govde(1.3, 0.8, 1.22, M.emaye, AX, 0.23, 0);
  kutu(1.32, 0.03, 1.24, M.laci, AX, 0.945, 0); kutu(1.32, 0.04, 0.012, M.kirmizi, AX, 0.880, 0 + (1.24) / 2 + 0.006);   /* üst kapak lacivert, kırmızı yalnız ön şerit */
  pano(AX - 0.25, 0.62, 0.61);
  const HY = 1.03;                                                                                  /* gövdenin üstü */
  for (const zz of [-0.5, 0.5]) kutu(0.82, 0.42, 0.04, M.emaye, AX - 0.18, HY + 0.21, zz);
  kutu(0.04, 0.42, 1.04, M.emaye, AX - 0.59, HY + 0.21, 0);
  for (const [dx, dz] of [[-0.38, 0.05], [-0.12, 0.22], [-0.42, 0.3], [0.02, 0.05], [-0.22, -0.02]]) { const y = ekle(new THREE.IcosahedronGeometry(0.13, 1), M.balya, AX + dx, HY + 0.07, dz, statik, { golge: false }); y.scale.set(1.25, 0.55, 1); y.rotation.y = dx * 7; }
  /* çivili besleme bandı: haznenin sağ duvarı, eğik; doku kayar (çiviler lifi yukarı taşır) */
  const bant = new THREE.Group(); bant.position.set(AX - 0.18, HY + 0.36, -0.3); bant.rotation.x = 1.0; statik.add(bant);
  ekle(new THREE.PlaneGeometry(0.76, 0.92), M.civiBant, 0, 0.022, 0, bant, { golge: false, rx: -Math.PI / 2 });
  for (const xx of [-0.4, 0.4]) kutu(0.04, 0.06, 0.96, M.celikKoyu, xx, 0.01, 0, bant);             /* bant yan rayları */
  for (const zz of [-0.46, 0.46]) silindir(0.04, 0.04, 0.8, M.celik, 0, 0.0, zz, bant, { rz: Math.PI / 2 });   /* uç tamburları */
  kutu(0.04, 0.42, 1.04, M.emaye, AX + 0.23, HY + 0.21, 0);                                        /* haznenin sağ duvarı */
  govde(0.32, 0.34, 0.34, M.emaye, AX + 0.45, HY, -0.35, statik, { r: 0.04 });                     /* emme davlumbazı */
  /* emme kanalı: açıcının üstünden tarak makinesinin besleme bacasına */
  const kanal = new THREE.CatmullRomCurve3([[AX + 0.45, HY + 0.34, -0.35], [AX + 0.5, 2.1, -0.38], [x2 - 2.6, 2.25, -0.38], [x2 - 1.85, 2.05, -0.36], [x2 - 1.75, 1.42, -0.32]].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  ekle(new THREE.TubeGeometry(kanal, 64, 0.1, 14, false), M.celik, 0, 0, 0);
  for (const t of [0.12, 0.5, 0.88]) { const p = kanal.getPointAt(t), r = kanal.getTangentAt(t); const h = ekle(new THREE.TorusGeometry(0.11, 0.018, 8, 24), M.celikKoyu, p.x, p.y, p.z); h.lookAt(p.clone().add(r)); }

  /* ═══ 02 İPLİK: tarak makinesi (ana tambur kapağı + şapka sırası, tülbent → şerit), şerit kovası (döner kafa), ring iplik makinesi ═══ */
  const TX = x2 - 0.95;
  kutu(1.96, 0.12, 1.2, M.laci, TX, 0.17, 0);
  govde(1.9, 0.5, 1.14, M.emaye, TX, 0.23, 0);
  kutu(1.92, 0.04, 1.16, M.laci, TX, 0.725, 0);   /* üst yüz 0,745: gövde üstü 0,73 ile aynı düzlemde olmasın (kaydırırken titriyordu) */ kutu(1.92, 0.04, 0.012, M.kirmizi, TX, 0.650, 0 + (1.16) / 2 + 0.006);   /* üst kapak lacivert, kırmızı yalnız ön şerit */
  kutu(0.16, 0.24, 0.5, M.emaye, x2 - 1.75, 0.73 + 0.12, -0.32);                                 /* besleme bacası (kanalın indiği yer) */
  /* ana tambur: üst yarım silindir kapak, iki yan kapakta göbek */
  const yarim = (r, boy) => { const g = new THREE.CylinderGeometry(r, r, boy, 40, 1, false, Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); return g; };
  const TY = 0.75;
  ekle(yarim(0.52, 1.1), M.emaye, TX - 0.15, TY, 0);
  for (const s of [-1, 1]) {
    silindir(0.1, 0.1, 0.04, M.laci, TX - 0.15, TY + 0.06, s * 0.57, statik, { rx: Math.PI / 2 });
  }
  /* şapkalar: tambur üstünde dönen bant (14 çıta) */
  const sapkaGeo = new THREE.BoxGeometry(0.07, 0.035, 1.12), sapkalar = new THREE.InstancedMesh(sapkaGeo, M.laci, 14); sapkalar.castShadow = true; statik.add(sapkalar);
  for (let k = 0; k < 14; k++) { const a = 0.35 + k * (2.45 / 13); kukla.position.set(TX - 0.15 + Math.cos(a) * 0.55, TY + Math.sin(a) * 0.55, 0); kukla.rotation.set(0, 0, a - Math.PI / 2); kukla.scale.set(1, 1, 1); kukla.updateMatrix(); sapkalar.setMatrixAt(k, kukla.matrix); }
  ekle(yarim(0.24, 1.1), M.emaye, TX + 0.62, TY, 0);                                          /* penye silindiri kapağı */
  dondur(merdane(0.06, 0.4, M.celik, TX + 0.98, 0.82, 0.1, hareketli), 4, 'y');                  /* kalender silindiri */
  pano(TX - 0.6, 0.38, 0.58);
  /* şerit: kalenderden kovanın döner kafasına */
  const KX = x2 + 0.3, KZ = 0.72;
  const serit = new THREE.CatmullRomCurve3([[TX + 0.98, 0.84, 0.1], [TX + 1.15, 0.98, 0.35], [KX - 0.05, 1.12, KZ - 0.05], [KX, 1.07, KZ]].map((p) => new THREE.Vector3(...p)));
  ekle(new THREE.TubeGeometry(serit, 24, 0.026, 8, false), M.lif, 0, 0, 0, statik, { golge: false });
  silindir(0.31, 0.31, 0.88, M.kirmizi, KX, 0.55, KZ, statik, {}, 32);
  ekle(new THREE.TorusGeometry(0.31, 0.02, 8, 32), M.celik, KX, 0.99, KZ, statik, { rx: Math.PI / 2 });
  silindir(0.27, 0.27, 0.03, M.lif, KX, 0.98, KZ, statik, {}, 32);
  kutu(0.44, 0.06, 0.14, M.emaye, KX - 0.27, 1.07, KZ - 0.04);                                    /* kafa kolu: tarak gövdesinden */
  kutu(0.08, 0.38, 0.14, M.emaye, KX - 0.47, 0.88, KZ - 0.04);
  dondur(silindir(0.2, 0.2, 0.05, M.emaye, KX, 1.06, KZ, hareketli, {}, 28), 2.2, 'y');
  /* ring iplik makinesi: motor başlığı, gövde, iğ sırası (10, biri kırmızı), çekim silindirleri, fitil cağlığı */
  const RX = x2 + 2.45, RZ = -0.25, RL = 2.5;
  kutu(0.6, 0.12, 0.9, M.laci, RX - RL / 2 - 0.3, 0.17, RZ);
  govde(0.56, 1.25, 0.86, M.emaye, RX - RL / 2 - 0.3, 0.23, RZ);
  kutu(0.58, 0.03, 0.88, M.laci, RX - RL / 2 - 0.3, 1.375, RZ); kutu(0.58, 0.04, 0.012, M.kirmizi, RX - RL / 2 - 0.3, 1.310, RZ + (0.88) / 2 + 0.006);   /* üst kapak lacivert, kırmızı yalnız ön şerit */
  pano(RX - RL / 2 - 0.3, 0.95, RZ + 0.43);
  kule(RX - RL / 2 - 0.42, 1.48, RZ - 0.2);
  kutu(RL, 0.12, 0.8, M.laci, RX, 0.17, RZ);
  govde(RL, 0.5, 0.74, M.emaye, RX, 0.23, RZ);
  kutu(RL + 0.02, 0.04, 0.76, M.laci, RX, 0.725, RZ);   /* üst yüz 0,745 > gövde 0,73 (z-fighting) */ kutu(RL + 0.02, 0.04, 0.012, M.kirmizi, RX, 0.650, RZ + (0.76) / 2 + 0.006);   /* üst kapak lacivert, kırmızı yalnız ön şerit */
  kutu(RL, 0.04, 0.14, M.celikKoyu, RX, 0.78, RZ + 0.4);                                           /* iğ rayı */
  const IG = 10, igX = (k) => RX - RL / 2 + 0.18 + k * ((RL - 0.36) / (IG - 1)), KIRMIZI_IG = 4;
  const igGeo = new THREE.CylinderGeometry(0.035, 0.055, 0.3, 14);
  const igler = new THREE.InstancedMesh(igGeo, M.lif, IG - 1); igler.castShadow = true; hareketli.add(igler);
  const kirmiziIg = silindir(0.035, 0.055, 0.3, M.kirmizi, igX(KIRMIZI_IG), 0.95, RZ + 0.42, hareketli);
  for (let k = 0; k < IG; k++) ekle(new THREE.TorusGeometry(0.06, 0.008, 6, 18), M.celik, igX(k), 0.86, RZ + 0.42, statik, { rx: Math.PI / 2, golge: false });
  /* çekim bölgesi: eğik kiriş üstünde üç silindir sırası */
  for (const [dy, dz, r] of [[1.32, 0.28, 0.03], [1.38, 0.18, 0.03], [1.44, 0.08, 0.035]]) silindir(r, r, RL, M.celik, RX, dy, RZ + dz, statik, { rz: Math.PI / 2 });
  kutu(RL, 0.04, 0.3, M.celikKoyu, RX, 1.27, RZ + 0.15, statik, { rx: 0.45 });
  for (const xx of [RX - RL / 2 + 0.05, RX + RL / 2 - 0.05]) kutu(0.06, 1.42, 0.06, M.celikKoyu, xx, 0.75 + 0.71, RZ - 0.15);   /* cağlık dikmeleri */
  kutu(RL, 0.05, 0.06, M.celikKoyu, RX, 2.15, RZ - 0.15);
  const fitil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 16), M.lif, IG); fitil.castShadow = true; statik.add(fitil);
  for (let k = 0; k < IG; k++) { kukla.position.set(igX(k), 1.97, RZ - 0.15); kukla.rotation.set(0, 0, 0); kukla.updateMatrix(); fitil.setMatrixAt(k, kukla.matrix); }
  const lif = [];
  for (let k = 0; k < IG; k++) lif.push(igX(k), 1.78, RZ - 0.15, igX(k), 1.46, RZ + 0.1, igX(k), 1.3, RZ + 0.3, igX(k), 1.1, RZ + 0.42);
  const lifGeo = new THREE.BufferGeometry(); lifGeo.setAttribute('position', new THREE.Float32BufferAttribute(lif, 3));
  statik.add(new THREE.LineSegments(lifGeo, new THREE.LineBasicMaterial({ color: 0xf3eee4, transparent: true, opacity: 0.6 })));

  /* ═══ 03 ÇÖZGÜ: cağlık (4 × 6 bobin pimlerde, gerginlik diskleri), delikli kılavuz plakası, açılır tarak, çözgü makinesi (iki yan ayak, levent) ═══ */
  const CX = x3 - 1.6;
  kutu(0.6, 0.08, 2.5, M.laci, CX + 0.1, 0.15, 0);
  for (const zz of [-1.18, -0.4, 0.4, 1.18]) kutu(0.07, 1.98, 0.07, M.celikKoyu, CX, 0.19 + 0.99, zz);
  kutu(0.12, 0.08, 2.5, M.laci, CX, 2.21, 0);
  const SIRA = [0.55, 0.95, 1.35, 1.75], SUTUN = (k) => -1.0 + k * 0.4, KIRMIZI_BOBIN = [2, 3];
  for (const yy of SIRA) kutu(0.05, 0.05, 2.42, M.celikKoyu, CX, yy, 0);
  const bobinGeo = new THREE.CylinderGeometry(0.035, 0.12, 0.3, 16); bobinGeo.rotateZ(-Math.PI / 2);
  const bobinler = new THREE.InstancedMesh(bobinGeo, M.lif, 24); bobinler.castShadow = true; statik.add(bobinler);
  const pimler = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.02, 0.02), M.celik, 24); statik.add(pimler);
  const diskler = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateZ(Math.PI / 2), M.pirinc, 24); statik.add(diskler);
  const cagUclari = [];
  let bi = 0;
  SIRA.forEach((yy, s) => { for (let k = 0; k < 6; k++) {
    const zz = SUTUN(k);
    kukla.rotation.set(0, 0, 0); kukla.scale.set(1, 1, 1);
    kukla.position.set(CX + 0.17, yy, zz); kukla.updateMatrix(); pimler.setMatrixAt(bi, kukla.matrix);
    kukla.position.set(CX + 0.24, yy, zz); kukla.updateMatrix(); bobinler.setMatrixAt(bi, kukla.matrix);
    kukla.position.set(CX + 0.5, yy, zz); kukla.updateMatrix(); diskler.setMatrixAt(bi, kukla.matrix);
    bobinler.setColorAt(bi, new THREE.Color(s === KIRMIZI_BOBIN[0] && k === KIRMIZI_BOBIN[1] ? 0xd13a3c : bi % 5 === 0 ? 0xe2d6bc : 0xf6f1e6));
    cagUclari.push([CX + 0.5, yy, zz]); bi++;
  } });
  /* delikli kılavuz plakası (iki ayaklı) ve açılır tarak (iki ayaklı, tel dokulu) */
  const KPX = CX + 0.95;
  for (const zz of [-1.15, 1.15]) kutu(0.06, 1.8, 0.06, M.celikKoyu, KPX, 0.11 + 0.9, zz);
  ekle(new THREE.PlaneGeometry(2.24, 1.5), M.delikliPlaka, KPX, 1.15, 0, statik, { ry: Math.PI / 2 });
  const RDX = x3 + 0.2;
  for (const zz of [-0.95, 0.95]) kutu(0.06, 1.06, 0.06, M.celikKoyu, RDX, 0.11 + 0.53, zz);
  kutu(0.06, 0.05, 1.96, M.laci, RDX, 1.17, 0); kutu(0.06, 0.05, 1.96, M.laci, RDX, 0.82, 0);
  ekle(new THREE.PlaneGeometry(1.9, 0.33), M.telTarak, RDX, 0.995, 0, statik, { ry: Math.PI / 2, golge: false });
  const BX = x3 + 1.4;
  for (const zz of [-1.06, 1.06]) { kutu(0.56, 0.1, 0.32, M.laci, BX, 0.16, zz); govde(0.5, 1.15, 0.26, M.emaye, BX, 0.21, zz); silindir(0.1, 0.1, 0.04, M.laci, BX, 0.98, zz + Math.sign(zz) * 0.15, statik, { rx: Math.PI / 2 }); }
  govde(0.46, 0.5, 0.4, M.laci, BX, 0.11, -1.44);                                               /* levent motoru: uzak yan ayağa bağlı */
  pano(BX, 0.6, 1.2);
  const levent = dondur(merdane(0.34, 1.86, M.sargiHam, BX, 0.98, 0, hareketli), 1.2, 'y');
  for (const yy of [-0.92, 0.92]) silindir(0.44, 0.44, 0.035, M.celik, 0, yy, 0, levent, {}, 36);
  const cozguCizgi = [];
  for (const [xx, yy, zz] of cagUclari) { const pz = zz * 0.92, ty = 0.995 + (yy - 1.15) * 0.25, tz = zz * 0.72; cozguCizgi.push(xx, yy, zz, KPX, yy * 0.9 + 0.1, pz, KPX, yy * 0.9 + 0.1, pz, RDX, ty, tz, RDX, ty, tz, BX, 1.32, tz * 0.95); }
  const cgGeo = new THREE.BufferGeometry(); cgGeo.setAttribute('position', new THREE.Float32BufferAttribute(cozguCizgi, 3));
  statik.add(new THREE.LineSegments(cgGeo, new THREE.LineBasicMaterial({ color: 0xf3eee4, transparent: true, opacity: 0.55 })));

  /* ═══ 04 DOKUMA: hava jetli tezgâh: iki kapalı yan gövde, arkada çözgü levendi + arka köprü, armür kutusu ve dört gücü çerçevesi,
         ağızlık, tarak (vargel), atkı, göğüs kirişi, kumaş levendi, kumanda panosu ve ışıklı kule ═══ */
  const LX = x4;
  /* arka yan gövde tam boy; ön yan gövde maket kesiti gibi alçak (ağızlık, gücü çerçeveleri ve tarak görünür) */
  for (const [zz, h] of [[-1.12, 1.18], [1.12, 0.6]]) { kutu(2.6, 0.12, 0.28, M.laci, LX, 0.16, zz); govde(2.5, h, 0.22, M.emaye, LX, 0.22, zz); kutu(2.52, 0.03, 0.24, M.laci, LX, 0.22 + h + 0.015, zz); kutu(2.52, 0.04, 0.012, M.kirmizi, LX, 0.22 + h - 0.06, zz + Math.sign(zz) * 0.116); }
  kutu(0.12, 0.12, 2.02, M.laci, LX - 1.05, 0.36, 0); kutu(0.12, 0.12, 2.02, M.laci, LX + 1.05, 0.36, 0);
  govde(0.16, 0.42, 0.18, M.emaye, LX - 0.42, 1.36, -1.12); govde(0.16, 0.94, 0.18, M.emaye, LX - 0.42, 0.84, 1.12);   /* armür köprüsü ayakları */
  govde(0.24, 0.14, 2.42, M.laci, LX - 0.42, 1.76, 0);
  govde(0.5, 0.3, 0.44, M.laci, LX - 0.42, 1.88, -0.78);                                          /* armür kutusu */
  pano(LX + 0.6, 0.55, 1.235);
  kule(LX + 1.05, 0.86, 1.12);
  const cozguLeventi = dondur(merdane(0.3, 2.0, M.sargiHam, LX - 0.95, 0.66, 0, hareketli), 0.35, 'y');
  for (const yy of [-1.0, 1.0]) silindir(0.38, 0.38, 0.03, M.celik, 0, yy, 0, cozguLeventi, {}, 32);
  silindir(0.055, 0.055, 2.02, M.celik, LX - 1.12, 1.2, 0, statik, { rx: Math.PI / 2 });          /* arka köprü (çözgü kılavuzu) */
  /* çözgü tabakası: levent üstünden arka köprüye, oradan gücü çerçevelerine */
  const duzlem = (xa, ya, xb, yb, mat, eb = statik) => { const L = Math.hypot(xb - xa, yb - ya), p = ekle(new THREE.PlaneGeometry(L, 2.0), mat, (xa + xb) / 2, (ya + yb) / 2, 0, eb, { golge: false }); p.rotation.set(-Math.PI / 2, 0, 0); p.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.atan2(yb - ya, xb - xa)); return p; };
  duzlem(LX - 0.95, 0.96, LX - 1.12, 1.25, M.ham); duzlem(LX - 1.12, 1.25, LX - 0.62, 1.1, M.ham);
  const GX0 = LX - 0.6, GDX = 0.075, GUCU = 4;
  const cerceveler = [0, 1].map(() => { const g = new THREE.Group(); hareketli.add(g); return g; });
  for (let k = 0; k < GUCU; k++) {
    const g = cerceveler[k % 2], gx = GX0 + k * GDX;
    kutu(0.03, 0.05, 2.0, M.celikKoyu, gx, 1.48, 0, g); kutu(0.03, 0.05, 2.0, M.celikKoyu, gx, 0.72, 0, g);
    for (const zz of [-0.98, 0.98]) kutu(0.03, 0.8, 0.04, M.celikKoyu, gx, 1.1, zz, g);
    ekle(new THREE.PlaneGeometry(1.94, 0.72), M.gucuTel, gx, 1.1, 0, g, { ry: Math.PI / 2, golge: false });
  }
  const AGIZ_X0 = GX0 + GUCU * GDX, AGIZ_X1 = LX + 0.36;
  const ustCozgu = ekle(new THREE.PlaneGeometry(1, 2.0), M.ham, 0, 0, 0, hareketli, { golge: false });
  const altCozgu = ekle(new THREE.PlaneGeometry(1, 2.0), M.ham, 0, 0, 0, hareketli, { golge: false });
  const tarak = new THREE.Group(); hareketli.add(tarak);
  kutu(0.025, 0.34, 2.0, M.celik, 0, 1.13, 0, tarak); kutu(0.14, 0.07, 2.04, M.laci, -0.04, 0.93, 0, tarak);
  for (const zz of [-0.98, 0.98]) kutu(0.05, 0.55, 0.05, M.laci, -0.04, 0.63, zz, tarak);
  silindir(0.02, 0.02, 0.18, M.celik, LX + 0.25, 1.05, -1.04, statik, { rx: Math.PI / 2 });            /* ana hava memesi */
  const atki = kutu(0.012, 0.012, 1.0, M.kirmizi, LX + 0.3, 1.05, 0, hareketli, { golge: false });
  duzlem(LX + 0.36, 1.05, LX + 0.56, 1.1, M.ham);                                                 /* kumaş: ağızdan göğüs kirişine */
  govde(0.14, 0.08, 2.04, M.laci, LX + 0.56, 1.01, 0);                                            /* göğüs kirişi */
  const kumasLeventi = dondur(merdane(0.22, 2.0, M.sargiHam, LX + 0.82, 0.55, 0, hareketli), -0.5, 'y');
  silindir(0.27, 0.27, 0.03, M.celik, 0, 1.0, 0, kumasLeventi, {}, 28); silindir(0.27, 0.27, 0.03, M.celik, 0, -1.0, 0, kumasLeventi, {}, 28);

  /* ═══ kumaş şeridi: göğüs kirişinden boya teknesine ham, tekneden sevkiyata lacivert (doku kayar = kumaş akar) ═══ */
  const TKX = x5 - 0.5;                                                                            /* tekne merkezi */
  const hamSerit = ekle(seritGeometrisi([[LX + 0.62, 1.1], [LX + 0.95, 1.18], [LX + 2.2, 1.18], [TKX - 0.8, 1.08], [TKX - 0.55, 0.62], [TKX, 0.36]], 1.5), M.ham, 0, 0, 0, statik);
  const RAX = x5 + 1.45, RAL = 2.5;                                                                /* ramöz girişi ve boyu */
  const laciSerit = ekle(seritGeometrisi([[TKX, 0.36], [TKX + 0.55, 0.62], [TKX + 0.8, 1.08], [x5 + 0.78, 1.17], [RAX - 0.1, 0.98], [RAX + RAL + 0.1, 0.98], [x6 - 1.55, 0.88], [x6 - 1.1, 0.71],
    [x6 + 1.2, 0.71], [x7 - 1.75, 0.66], [x7 - 1.34, 0.58], [x7 - 1.2, 0.68], [x7 + 0.1, 1.96], [x7 + 0.24, 1.93], [x7 + 0.8, 0.95], [x8 - 2.05, 0.9], [x8 - 1.42, 1.28]], 1.5), M.kumasLaci, 0, 0, 0, statik);
  /* yere bağlı kılavuz silindirleri: iki ayaklı */
  const kilavuzSilindir = (x, y) => { dondur(merdane(0.07, 1.84, M.celik, x, y - 0.08, 0, hareketli), 3, 'y'); for (const zz of [-0.98, 0.98]) { kutu(0.05, y - 0.22, 0.05, M.celikKoyu, x, 0.14 + (y - 0.22) / 2, zz); kutu(0.18, 0.03, 0.12, M.laci, x, 0.125, zz); } };
  kilavuzSilindir(LX + 2.2, 1.18);

  /* ═══ 05 BOYA VE APRE: boya teknesi (dalgalanan boya; giriş ve çıkış silindiri tekne ağzına bağlı, dalma silindiri boyanın altında),
         sıkma silindirleri, ramöz (giriş/çıkış ağzı, ısı pencereleri, egzoz kanalları, kumanda dolabı) ═══ */
  kutu(1.9, 0.1, 1.95, M.laci, TKX, 0.22, 0);
  for (const zz of [-0.935, 0.935]) { kutu(1.9, 0.56, 0.08, M.laci, TKX, 0.53, zz); kutu(1.94, 0.05, 0.12, M.celik, TKX, 0.83, zz); }
  for (const xx of [-0.91, 0.91]) { kutu(0.08, 0.56, 1.95, M.laci, TKX + xx, 0.53, 0); kutu(0.12, 0.05, 1.99, M.celik, TKX + xx, 0.83, 0); }
  kutu(1.92, 0.05, 0.02, M.kirmizi, TKX, 0.62, 0.985);
  for (const [dx, dz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) silindir(0.04, 0.05, 0.06, M.siyah, TKX + dx, 0.14, dz);
  const boya = ekle(new THREE.PlaneGeometry(1.74, 1.79, 24, 24), M.su, TKX, 0.72, 0, hareketli, { golge: false, rx: -Math.PI / 2 });
  for (const s of [-1, 1]) { dondur(merdane(0.07, 1.84, M.celik, TKX + s * 0.8, 1.0, 0, hareketli), 3, 'y'); for (const zz of [-0.93, 0.93]) kutu(0.05, 0.15, 0.05, M.celikKoyu, TKX + s * 0.8, 0.92, zz); }
  dondur(merdane(0.09, 1.82, M.celikKoyu, TKX, 0.42, 0, hareketli), -3, 'y');                     /* dalma silindiri */
  /* sıkma silindirleri (fular): iki silindir üst üste, iki yan ayak */
  for (const zz of [-1.02, 1.02]) govde(0.32, 1.2, 0.12, M.emaye, x5 + 0.78, 0.11, zz);
  dondur(merdane(0.1, 1.94, M.celik, x5 + 0.78, 1.06, 0, hareketli), 2.6, 'y'); dondur(merdane(0.1, 1.94, M.kirmizi, x5 + 0.78, 1.28, 0, hareketli), -2.6, 'y');
  /* ramöz */
  const RCX = RAX + RAL / 2;
  kutu(RAL + 0.06, 0.14, 1.8, M.laci, RCX, 0.18, 0);
  govde(RAL, 1.05, 1.74, M.emaye, RCX, 0.25, 0);
  kutu(RAL + 0.02, 0.03, 1.76, M.laci, RCX, 1.195, 0); kutu(RAL + 0.02, 0.04, 0.012, M.kirmizi, RCX, 1.130, 0 + (1.76) / 2 + 0.006);   /* üst kapak lacivert, kırmızı yalnız ön şerit */
  for (const s of [-1, 1]) ekle(new THREE.PlaneGeometry(1.6, 0.16), M.ic, RCX + s * (RAL / 2 + 0.003), 0.98, 0, statik, { ry: s * Math.PI / 2, golge: false });
  for (let k = 0; k < 4; k++) { const wx = RAX + 0.4 + k * 0.57; kutu(0.42, 0.26, 0.02, M.laciKoyu, wx, 0.72, 0.875); ekle(new THREE.PlaneGeometry(0.36, 0.2), M.isiPencere, wx, 0.72, 0.887, statik, { golge: false }); }
  for (const dx of [0.55, 1.95]) {
    const ex = RAX + dx, baca = new THREE.CatmullRomCurve3([[ex, 1.26, -0.45], [ex, 1.6, -0.45], [ex, 1.78, -0.5], [ex, 1.86, -0.66], [ex, 1.87, -0.9], [ex, 1.87, -1.12]].map((q) => new THREE.Vector3(...q)), false, 'centripetal');
    ekle(new THREE.TubeGeometry(baca, 40, 0.09, 16, false), M.celik, 0, 0, 0);
    silindir(0.13, 0.13, 0.05, M.celikKoyu, ex, 1.265, -0.45, statik, {}, 20);                  /* baca flanşı */
  }
  govde(0.42, 1.2, 0.5, M.laci, RAX + RAL + 0.32, 0.12, -0.55);                                  /* kumanda dolabı */
  pano(RAX + RAL + 0.32, 0.92, -0.295);
  kule(RAX + RAL + 0.4, 1.32, -0.7);

  /* ═══ 06 LABORATUVAR: kumaş kesim masasından geçer (kırmızı kesim çerçevesi); arkada tezgâhta çekme cihazı, Martindale, monitör ═══ */
  const LZ = -1.62;
  govde(2.4, 0.46, 1.7, M.emaye, x6 + 0.05, 0.23, 0); kutu(2.46, 0.12, 1.76, M.laci, x6 + 0.05, 0.17, 0);   /* kesim masası (kumaş üstünden geçer) */
  for (const [w, d, dx, dz] of [[0.5, 0.025, 0, -0.25], [0.5, 0.025, 0, 0.25], [0.025, 0.5, -0.25, 0], [0.025, 0.5, 0.25, 0]]) kutu(w, 0.008, d, M.kirmizi, x6 + 0.4 + dx, 0.716, 0.15 + dz, statik, { golge: false });
  govde(3.0, 0.07, 0.86, M.emaye, x6, 0.86, LZ);                                                  /* laboratuvar tezgâhı */
  for (const xx of [x6 - 1.4, x6 + 1.4]) for (const zz of [LZ - 0.35, LZ + 0.35]) kutu(0.06, 0.74, 0.06, M.celikKoyu, xx, 0.12 + 0.37, zz);
  govde(0.6, 0.6, 0.78, M.laci, x6 + 1.0, 0.11, LZ);                                             /* çekmeceli dolap */
  for (const yy of [0.32, 0.52]) kutu(0.3, 0.02, 0.01, M.celik, x6 + 1.0, yy, LZ + 0.395);
  /* çekme cihazı: taban, iki kolon, üst başlık, kırmızı travers (hareketli), çeneler, numune */
  const CKX = x6 - 0.9, TB = 0.93;
  govde(0.56, 0.14, 0.38, M.laci, CKX, TB, LZ);
  for (const dx of [-0.19, 0.19]) silindir(0.025, 0.025, 0.95, M.celik, CKX + dx, TB + 0.14 + 0.475, LZ);
  govde(0.56, 0.14, 0.38, M.laci, CKX, TB + 1.08, LZ);
  govde(0.12, 0.1, 0.12, M.celikKoyu, CKX, TB + 0.14, LZ);
  const travers = new THREE.Group(); hareketli.add(travers);
  govde(0.5, 0.08, 0.3, M.kirmizi, CKX, 0, LZ, travers); govde(0.12, 0.1, 0.12, M.celikKoyu, CKX, -0.1, LZ, travers);
  const numune = kutu(0.07, 1, 0.012, M.kirmizi, CKX, 1.4, LZ, hareketli);
  /* Martindale: gövde, üst plaka iki dikmede, dört başlık (Lissajous) */
  const MX = x6 + 0.05;
  govde(0.72, 0.22, 0.52, M.emaye, MX, TB, LZ);
  for (const dx of [-0.3, 0.3]) kutu(0.04, 0.28, 0.04, M.celikKoyu, MX + dx, TB + 0.22 + 0.14, LZ - 0.2);
  kutu(0.66, 0.035, 0.44, M.laci, MX, TB + 0.52, LZ);
  const martindale = [0, 1, 2, 3].map((k) => silindir(0.065, 0.065, 0.09, M.celik, MX - 0.16 + (k % 2) * 0.32, TB + 0.27, LZ - 0.1 + Math.floor(k / 2) * 0.2, hareketli));
  /* monitör: ayak + ekran (kuvvet–uzama eğrisi) */
  kutu(0.18, 0.02, 0.14, M.siyah, x6 + 0.75, TB + 0.01, LZ - 0.15); silindir(0.02, 0.02, 0.26, M.siyah, x6 + 0.75, TB + 0.15, LZ - 0.15);
  kutu(0.7, 0.44, 0.04, M.siyah, x6 + 0.75, TB + 0.48, LZ - 0.14); ekle(new THREE.PlaneGeometry(0.64, 0.38), M.ekran, x6 + 0.75, TB + 0.48, LZ - 0.117, statik, { golge: false });
  kilavuzSilindir(x6 - 1.55, 0.94);

  /* ═══ 07 KALİTE KONTROL: muayene makinesi (alt giriş silindiri, eğimli ışıklı cam masa, üst silindir, çıkış silindiri),
         üst ışık başlığı iki ayakta, operatör basamağı; hata işareti kumaşla masada yükselir ═══ */
  const EGIM = Math.atan2(1.29, 1.42);
  for (const zz of [-0.98, 0.98]) {
    kutu(1.9, 0.08, 0.1, M.laci, x7 - 0.45, 0.15, zz);                                            /* taban kızağı */
    kutu(0.08, 1.98, 0.08, M.emaye, x7 + 0.16, 0.2 + 0.99, zz);                                   /* ön dikme (üst silindiri taşır) */
    kutu(0.08, 0.5, 0.08, M.emaye, x7 - 1.26, 0.2 + 0.25, zz);                                    /* arka dikme (alt silindir) */
    const kol = kutu(Math.hypot(1.42, 1.15), 0.06, 0.08, M.emaye, x7 - 0.55, 1.275, zz); kol.rotation.z = Math.atan2(1.15, 1.42);
  }
  for (const [xx, yy] of [[x7 - 1.26, 0.66], [x7 + 0.16, 1.95], [x7 + 0.72, 1.0]]) dondur(merdane(0.07, 1.96, M.celik, xx, yy - 0.08, 0, hareketli), 3, 'y');
  for (const zz of [-0.98, 0.98]) kutu(0.06, 0.82, 0.06, M.emaye, x7 + 0.72, 0.2 + 0.41, zz);
  const masa = new THREE.Group(); masa.position.set(x7 - 0.55 + Math.sin(EGIM) * 0.06, 1.3 - Math.cos(EGIM) * 0.06, 0); masa.rotation.z = EGIM; statik.add(masa);
  ekle(new THREE.PlaneGeometry(1.7, 1.66), M.isik, 0, 0, 0, masa, { golge: false, rx: -Math.PI / 2 });
  kutu(1.74, 0.05, 1.72, M.laci, 0, -0.035, 0, masa);
  for (const zz of [-0.88, 0.88]) kutu(1.74, 0.06, 0.04, M.laci, 0, 0.0, zz, masa);
  for (const zz of [-0.98, 0.98]) kutu(0.08, 2.28, 0.08, M.laci, x7 + 0.55, 0.11 + 1.14, zz);
  govde(0.5, 0.1, 2.06, M.laci, x7 + 0.36, 2.39, 0);                                              /* üst ışık başlığı: dikmelere oturan ince bar */
  ekle(new THREE.PlaneGeometry(0.4, 1.96), M.isik, x7 + 0.36, 2.385, 0, statik, { golge: false, rx: Math.PI / 2 });
  kutu(1.3, 0.05, 0.52, M.celikKoyu, x7 - 0.45, 0.135, 1.42); for (let k = 0; k < 8; k++) kutu(0.012, 0.012, 0.5, M.siyah, x7 - 1.05 + k * 0.17, 0.165, 1.42, statik, { golge: false });
  pano(x7 + 0.55, 1.2, 1.03);
  const hata = kutu(0.12, 0.012, 0.12, M.kirmizi, 0, 0, 0, hareketli, { golge: false });

  /* ═══ 08 SEVKİYAT: top sarma ünitesi (iki yan ayak, motor), palet üstünde etiketli toplar, tır (kaide içinde; lastik + jant, kabin camı, ızgara, marka) ═══ */
  const SX = x8 - 1.42;
  for (const zz of [-1.02, 1.02]) { kutu(0.44, 0.1, 0.2, M.laci, SX, 0.16, zz); govde(0.36, 0.86, 0.14, M.emaye, SX, 0.21, zz); }
  govde(0.36, 0.34, 0.3, M.laci, SX, 0.7, -1.28);
  const sarim = dondur(merdane(0.28, 1.82, M.sargiLaci, SX, 1.0, 0, hareketli), -1.4, 'y');
  const PLX = x8 + 0.5;
  for (let k = 0; k < 5; k++) kutu(1.9, 0.035, 0.32, M.ahsap, PLX, 0.248, -0.8 + k * 0.4);
  for (const dz of [-0.75, 0, 0.75]) kutu(1.9, 0.12, 0.14, M.ahsapKoyu, PLX, 0.17, dz);
  const topRenk = [M.sargiLaci, M.sargiHam, M.sargiLaci, M.sargiHaki, M.sargiLaci, M.sargiHaki];
  [[-0.46, 0.487], [0, 0.487], [0.46, 0.487], [-0.23, 0.862], [0.23, 0.862], [0, 1.237]].forEach(([dx, yy], k) => {
    const t = merdane(0.22, 1.66, topRenk[k], PLX + dx, yy, 0);
    kutu(0.16, 0.012, 0.11, M.emaye, 0, 0.84, 0, t, { golge: false });
  });
  /* kamyon (kasa + kabin), kaide içinde x8 + 1,72 … x8 + 4,99; burun +x, kamera +z yanını ve önünü görür. Zemin y = 0,11.
     Kabin profilden çıkarılır (eğimli ön cam, tavan rüzgârlığı); kasa köşe dikmeli; arkada çift tekerlekli tandem aks */
  const TZ = -0.7, TW = 1.4, ZY = TZ + TW / 2;                                                      /* ZY: kameraya bakan yan yüz */
  const KX0 = x8 + 1.75, KX1 = x8 + 3.95, KBX = x8 + 3.99;                                           /* kasa başı/sonu, kabin arkası */
  /* şasi: iki ray + traversler */
  for (const dz of [-0.36, 0.36]) kutu(3.15, 0.12, 0.08, M.siyah, x8 + 3.27, 0.5, TZ + dz);
  for (const xx of [x8 + 1.9, x8 + 2.9, x8 + 3.85]) kutu(0.08, 0.08, 0.72, M.siyah, xx, 0.5, TZ);
  /* kasa: lacivert gövde, alt ve üst profil, köşe dikmeleri, kırmızı şerit, marka */
  govde(KX1 - KX0, 1.22, TW, M.laci, (KX0 + KX1) / 2, 0.6, TZ, statik, { r: 0.02 });
  kutu(KX1 - KX0 + 0.04, 0.07, TW + 0.04, M.celikKoyu, (KX0 + KX1) / 2, 0.6, TZ);                  /* alt profil */
  kutu(KX1 - KX0 + 0.04, 0.05, TW + 0.04, M.celik, (KX0 + KX1) / 2, 1.835, TZ);                    /* üst profil */
  for (const xx of [KX0, KX1]) for (const s of [-1, 1]) kutu(0.06, 1.22, 0.06, M.celik, xx, 1.21, TZ + s * (TW / 2));
  kutu(KX1 - KX0 - 0.08, 0.05, 0.012, M.kirmizi, (KX0 + KX1) / 2, 0.74, ZY + 0.007);
  ekle(new THREE.PlaneGeometry(1.7, 0.36), M.dorseYazi, (KX0 + KX1) / 2, 1.28, ZY + 0.008, statik, { golge: false });
  /* arka kapılar: orta ek, dört kilit çubuğu, menteşeler, stop lambaları, plaka, alt koruma barı */
  kutu(0.012, 1.1, 0.02, M.laciKoyu, KX0 - 0.012, 1.21, TZ);
  for (const dz of [-0.52, -0.2, 0.2, 0.52]) silindir(0.012, 0.012, 1.08, M.celik, KX0 - 0.03, 1.21, TZ + dz, statik, {}, 8);
  for (const s of [-1, 1]) for (const yy of [0.82, 1.21, 1.6]) kutu(0.03, 0.08, 0.05, M.celikKoyu, KX0 - 0.025, yy, TZ + s * 0.66);
  for (const s of [-1, 1]) kutu(0.03, 0.1, 0.16, M.led(0xe2585a), KX0 - 0.02, 0.5, TZ + s * 0.56);
  kutu(0.02, 0.1, 0.3, M.emaye, KX0 - 0.02, 0.48, TZ);
  kutu(0.08, 0.08, 1.3, M.siyah, KX0 + 0.03, 0.36, TZ);
  /* yan koruma barı (tandem ile kabin arası) ve yakıt deposu */
  for (const yy of [0.36, 0.48]) kutu(1.02, 0.04, 0.03, M.celik, x8 + 3.3, yy, ZY - 0.02);
  for (const xx of [x8 + 2.85, x8 + 3.78]) kutu(0.03, 0.2, 0.06, M.celikKoyu, xx, 0.42, ZY - 0.05);
  const depo = merdane(0.13, 0.5, M.celik, x8 + 3.6, 0.44, ZY - 0.22, statik, 24); depo.rotation.set(0, 0, Math.PI / 2);   /* ekseni x boyunca */
  for (const dx of [-0.16, 0.16]) ekle(new THREE.TorusGeometry(0.135, 0.012, 6, 24), M.celikKoyu, x8 + 3.6 + dx, 0.44, ZY - 0.22, statik, { ry: Math.PI / 2 });
  /* kabin: yandan profil (x: kabin arkasından ileri, y yukarı) → z boyunca çıkarılır */
  const kp = new THREE.Shape();
  kp.moveTo(0, 0.56); kp.lineTo(0, 1.95); kp.lineTo(0.6, 1.95); kp.lineTo(0.84, 1.44); kp.lineTo(0.96, 1.36); kp.lineTo(0.96, 0.62); kp.lineTo(0.9, 0.56); kp.lineTo(0, 0.56);
  const kabinGeo = new THREE.ExtrudeGeometry(kp, { depth: TW - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 4 });
  kabinGeo.translate(0, 0, -(TW - 0.06) / 2);
  ekle(kabinGeo, M.emaye, KBX, 0, TZ);
  const KYZ = TZ + TW / 2 - 0.03 + 0.03;                                                              /* kabin yan yüzü (eğim payıyla) */
  /* ön cam: eğimli yüzeyin 8 mm önünde */
  const camL = Math.hypot(0.24, 0.51), cn = new THREE.Vector2(0.51, 0.24).normalize(), cp = 0.03 + 0.008;   /* normal; pay = bevel + 8 mm */
  const camM = new THREE.Vector3(KBX + 0.72 + cn.x * cp, 1.695 + cn.y * cp, TZ);
  const onCam = ekle(new THREE.PlaneGeometry(TW - 0.22, camL - 0.06), M.cam2, camM.x, camM.y, camM.z, statik, { golge: false });
  onCam.lookAt(camM.clone().add(new THREE.Vector3(cn.x, cn.y, 0)));        /* +z normali dışa; yerel y eğim boyunca */
  /* yan cam (ön camın eğimini izler) ve kapı */
  const yc = new THREE.Shape(); yc.moveTo(0.2, 1.42); yc.lineTo(0.2, 1.86); yc.lineTo(0.57, 1.86); yc.lineTo(0.78, 1.42); yc.lineTo(0.2, 1.42);
  ekle(new THREE.ShapeGeometry(yc), M.cam2, KBX, 0, KYZ + 0.006, statik, { golge: false });
  for (const [g, h, xx, yy] of [[0.012, 1.24, 0.15, 1.22], [0.012, 0.82, 0.86, 1.0], [0.71, 0.012, 0.505, 0.6]]) kutu(g, h, 0.008, M.laciKoyu, KBX + xx, yy, KYZ + 0.004);
  kutu(0.1, 0.025, 0.02, M.celik, KBX + 0.66, 1.3, KYZ + 0.012);                                       /* kapı kolu */
  /* ayna: kol + kafa */
  kutu(0.04, 0.03, 0.2, M.siyah, KBX + 0.8, 1.62, KYZ + 0.1);
  kutu(0.05, 0.26, 0.09, M.siyah, KBX + 0.8, 1.56, KYZ + 0.22);
  /* tavan rüzgârlığı */
  const rz = new THREE.Shape(); rz.moveTo(0, 0); rz.lineTo(0, 0.26); rz.lineTo(0.08, 0.26); rz.lineTo(0.56, 0); rz.lineTo(0, 0);
  const rzGeo = new THREE.ExtrudeGeometry(rz, { depth: TW - 0.3, bevelEnabled: false }); rzGeo.translate(0, 0, -(TW - 0.3) / 2);
  ekle(rzGeo, M.laci, KBX + 0.02, 1.98, TZ);
  /* ön: ızgara (yüzeyden 12 mm önde: aynı düzlem titremesin), marka şeridi, farlar, tampon */
  const ON = KBX + 0.96 + 0.03;
  ekle(new THREE.PlaneGeometry(TW - 0.5, 0.36), M.izgara, ON + 0.012, 0.98, TZ, statik, { ry: Math.PI / 2, golge: false });
  kutu(0.012, 0.03, TW - 0.5, M.kirmizi, ON + 0.014, 1.2, TZ);
  for (const s of [-1, 1]) { kutu(0.03, 0.1, 0.22, M.siyah, ON + 0.01, 0.72, TZ + s * 0.5); ekle(new THREE.PlaneGeometry(0.18, 0.07), M.led(0xfff4d6), ON + 0.027, 0.72, TZ + s * 0.5, statik, { ry: Math.PI / 2, golge: false }); }
  kutu(0.1, 0.16, TW + 0.06, M.siyah, ON + 0.03, 0.5, TZ);
  /* basamaklar (kapı altı) */
  for (const yy of [0.52, 0.34]) kutu(0.32, 0.03, 0.12, M.celikKoyu, KBX + 0.5, yy, KYZ + 0.02);
  /* tekerlekler: lastik + jant + göbek + 6 somun; arkada çift tekerlek, önde tek; çamurluk ve çamur paçası */
  const teker = (x, z, yon) => {
    merdane(0.2, 0.17, M.lastik, x, 0.31, z, statik, 28);
    ekle(new THREE.TorusGeometry(0.175, 0.03, 8, 28), M.lastik, x, 0.31, z + yon * 0.07, statik);   /* yuvarlak omuz */
    merdane(0.12, 0.012, M.celik, x, 0.31, z + yon * 0.088, statik, 24);
    merdane(0.05, 0.03, M.celikKoyu, x, 0.31, z + yon * 0.1, statik, 16);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; merdane(0.013, 0.02, M.celikKoyu, x + Math.cos(a) * 0.085, 0.31 + Math.sin(a) * 0.085, z + yon * 0.098, statik, 8); }
  };
  for (const s of [-1, 1]) {
    for (const xx of [x8 + 2.15, x8 + 2.6]) { teker(xx, TZ + s * 0.68, s); teker(xx, TZ + s * 0.49, s); }
    teker(x8 + 4.35, TZ + s * 0.6, s);
  }
  kutu(0.98, 0.03, 0.42, M.siyah, x8 + 2.375, 0.57, TZ + 0.59);                                      /* tandem çamurluğu */
  kutu(0.02, 0.26, 0.4, M.siyah, x8 + 1.88, 0.4, TZ + 0.59);                                         /* çamur paçası */
  ekle(new THREE.TorusGeometry(0.25, 0.03, 8, 24, Math.PI), M.siyah, x8 + 4.35, 0.31, ZY + 0.005, statik);   /* ön çamurluk kemeri */

  /* ═══ kırmızı iplik: ring makinesindeki kırmızı masuradan başlar; makine üstündeki gözlerden geçerek cağlıktaki kırmızı bobine,
         oradan çözgüyle levende, leventten tezgâhın arka köprüsüne ve çözgü tabakasına (kumaşın kırmızı kenar ipliği: z = 0,6) ═══ */
  const IGX = igX(KIRMIZI_IG), IGZ = RZ + 0.42;
  goz(IGX, 2.15, 2.4, RZ - 0.15);                                                                  /* ring cağlığı üst rayında */
  goz(CX, 2.25, 2.55, 0.35);                                                                       /* çözgü cağlığı üst kirişinde */
  goz(BX, 1.36, 2.3, 1.06);                                                                       /* çözgü makinesinin ön yan ayağı üstünde */
  goz(LX - 0.42, 1.9, 2.15, 0.6);                                                                  /* tezgâh armür köprüsü üstünde */
  const kb = cagUclari[KIRMIZI_BOBIN[0] * 6 + KIRMIZI_BOBIN[1]];
  const iplikYolu = new THREE.CatmullRomCurve3([
    [IGX, 1.1, IGZ], [IGX, 1.6, IGZ - 0.1], [IGX, 2.4, RZ - 0.15], [IGX + 1.0, 2.62, 0.05], [CX - 0.3, 2.62, 0.3], [CX, 2.55, 0.35],
    [CX + 0.1, 2.0, kb[2]], [CX + 0.3, kb[1] + 0.02, kb[2]], [kb[0], kb[1], kb[2]], [KPX, kb[1] * 0.9 + 0.1, kb[2] * 0.92], [RDX, 0.995 + (kb[1] - 1.15) * 0.25, kb[2] * 0.72],
    [BX - 0.2, 1.3, kb[2] * 0.7], [BX, 1.33, 0.5], [BX + 0.05, 2.0, 1.0], [BX, 2.3, 1.06], [BX + 1.2, 2.55, 0.8], [LX - 0.9, 2.42, 0.62], [LX - 0.42, 2.15, 0.6],
    [LX - 0.8, 1.6, 0.6], [LX - 1.12, 1.26, 0.6], [LX - 0.62, 1.11, 0.6], [AGIZ_X1 - 0.05, 1.05, 0.6],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  ekle(new THREE.TubeGeometry(iplikYolu, 520, 0.015, 8, false), M.iplik, 0, 0, 0, statik, { golge: false });

  /* durağan parçaların matrisleri dondurulur */
  statik.updateMatrixWorld(true);
  statik.traverse((n) => { n.matrixAutoUpdate = false; });

  /* ── kontrol mühürleri: HTML katmanı (istasyon üstü dünya noktası → ekran) ── */
  const MUHUR_Y = [2.05, 2.75, 2.8, 2.55, 2.3, 2.55, 2.95, 2.05];
  const muhurler = [];
  if (etiketKatmani) {
    etiketKatmani.textContent = '';
    for (let i = 0; i < ADIM; i++) {
      const el = document.createElement('span');
      el.className = 'surec-muhur';
      el.innerHTML = '<b class="surec-muhur__damga">AT<svg viewBox="0 0 16 12" aria-hidden="true"><path d="M2 6.5 6 10l8-8"/></svg></b><span class="surec-muhur__yazi"></span>';
      etiketKatmani.append(el);
      muhurler.push({ el, yazi: el.querySelector('.surec-muhur__yazi'), dunya: new THREE.Vector3(i * ARA + (i === 7 ? -1.35 : 0), MUHUR_Y[i], 0) });
    }
  }
  const muhurYaz = () => muhurler.forEach((m, i) => { m.yazi.textContent = metin(`kontrol${i + 1}`); });
  muhurYaz();
  document.addEventListener('dil-degisti', muhurYaz);

  /* ── kare: zamanın (t) ve kamera konumunun saf fonksiyonu ── */
  const Z_EKSEN = new THREE.Vector3(0, 0, 1);
  const egikDuzlem = (p, xa, ya, xb, yb) => { p.scale.set(Math.hypot(xb - xa, yb - ya), 1, 1); p.rotation.set(-Math.PI / 2, 0, 0); p.rotateOnWorldAxis(Z_EKSEN, Math.atan2(yb - ya, xb - xa)); p.position.set((xa + xb) / 2, (ya + yb) / 2, 0); };
  function sahneyiKur(t) {
    for (const d of donenler) d.m.rotation[d.eksen] = d.hiz * t;
    civiDoku.offset.y = -t * 0.45;                                                     /* çivili bant lifi yukarı taşır */
    /* ring iğleri (örneklemeli) ve kırmızı iğ döner */
    for (let k = 0, j = 0; k < IG; k++) { if (k === KIRMIZI_IG) continue; kukla.position.set(igX(k), 0.95, RZ + 0.42); kukla.rotation.set(0, t * 22 + k, 0); kukla.scale.set(1, 1, 1); kukla.updateMatrix(); igler.setMatrixAt(j++, kukla.matrix); }
    igler.instanceMatrix.needsUpdate = true;
    kirmiziIg.rotation.y = t * 22;
    /* dokuma çevrimi (0,9 s): ağızlık açılır → atkı hava jetiyle geçer → tarak vurur → ağızlık kapanır */
    const f = kesir(t / 0.9);
    const agiz = f < 0.12 ? yumusak(f / 0.12) : f < 0.7 ? 1 : 1 - yumusak((f - 0.7) / 0.16);
    const kalk = 0.15 * agiz;
    egikDuzlem(ustCozgu, AGIZ_X0, 1.1 + kalk, AGIZ_X1, 1.05);
    egikDuzlem(altCozgu, AGIZ_X0, 1.1 - kalk, AGIZ_X1, 1.05);
    cerceveler[0].position.y = kalk; cerceveler[1].position.y = -kalk;
    const vurus = f < 0.7 ? 0 : f < 0.82 ? yumusak((f - 0.7) / 0.12) : 1 - yumusak((f - 0.82) / 0.18);
    tarak.position.set(LX + 0.12 + vurus * 0.2, 0, 0);
    const q = Math.min(1, Math.max(0, (f - 0.14) / 0.42));
    atki.visible = f > 0.14 && f < 0.72; atki.scale.z = Math.max(0.001, q * 2); atki.position.z = -1.0 + q;
    /* kumaş ve iplik akışı */
    hamDoku.offset.x = -t * 0.35; laciDoku.offset.x = -t * 0.35;
    /* boya teknesi: dalga */
    const pos = boya.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) { const u = pos.getX(k), v = pos.getY(k); pos.setZ(k, 0.012 * Math.sin(u * 7 + t * 2.6) + 0.01 * Math.sin(v * 9 - t * 2.1)); }
    pos.needsUpdate = true;
    /* çekme testi (4 s): travers yükselir, numune uzar; kopunca alt yarısı kalır, başa döner */
    const c = kesir(t / 4), uz = Math.min(c / 0.8, 1);
    travers.position.y = TB + 0.62 + 0.26 * uz;
    const alt = TB + 0.24, ust = travers.position.y - 0.2, L = ust - alt;
    if (c < 0.8) { numune.scale.y = L; numune.position.y = alt + L / 2; } else { numune.scale.y = L * 0.46; numune.position.y = alt + L * 0.23; }
    /* Martindale: başlıklar Lissajous yörüngesinde */
    martindale.forEach((m, k) => { const a = t * 1.6 + k; m.position.x = MX - 0.16 + (k % 2) * 0.32 + 0.05 * Math.sin(a); m.position.z = LZ - 0.1 + Math.floor(k / 2) * 0.2 + 0.05 * Math.sin(2 * a + 0.5); });
    /* muayene: hata işareti kumaşla eğimli masada yükselir */
    const h = kesir(t / 3.2), u = -0.8 + 1.6 * h;
    hata.position.set(masa.position.x + Math.cos(EGIM) * u - Math.sin(EGIM) * 0.03, masa.position.y + Math.sin(EGIM) * u + Math.cos(EGIM) * 0.03, 0.3); hata.rotation.z = EGIM; hata.visible = h > 0.05 && h < 0.95;
    /* top sarma: top yavaşça büyür, dolunca yenilenir */
    const sb = 1 + 0.5 * kesir(t / 12); sarim.scale.set(sb, 1, sb);
  }

  /* ── boyut ve kamera ── */
  const olcu = { w: 0, h: 0 };
  /* geniş ekranda hat soldan sağa hafif çapraz akar; dar (dikey) ekranda kamera yana döner, hat sol üstten sağ alta iner */
  const YON_GENIS = new THREE.Vector3(0.3, 0.62, 1).normalize(), YON_DAR = new THREE.Vector3(1.05, 0.95, 0.8).normalize();
  let yarimBoy = 3, YON = YON_GENIS;
  const boyutla = () => {
    const w = tuvalEl.clientWidth || 800, h = tuvalEl.clientHeight || 400;
    if (w === olcu.w && h === olcu.h) return;
    olcu.w = w; olcu.h = h;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    /* geniş ekranda bir buçuk istasyon, dar ekranda bir istasyon sığar */
    const oran = w / h;
    YON = oran < 0.95 ? YON_DAR : YON_GENIS;
    yarimBoy = oran < 0.95 ? Math.max(2.6, 2.6 / Math.max(oran, 0.45)) * 0.78 : oran > 1.2 ? Math.max(2.5, 4.4 / Math.sqrt(oran)) : 3.4;
  };
  const ekranNokta = new THREE.Vector3();
  const kameraKur = (cx) => {
    const merkez = new THREE.Vector3(cx + 0.3, 1.05, 0);
    const oran = olcu.w / olcu.h;
    kamera.left = -yarimBoy * oran; kamera.right = yarimBoy * oran; kamera.top = yarimBoy; kamera.bottom = -yarimBoy;
    kamera.position.copy(merkez).addScaledVector(YON, 60); kamera.up.set(0, 1, 0); kamera.lookAt(merkez);
    kamera.updateProjectionMatrix(); kamera.updateMatrixWorld(true);
    anahtar.position.set(cx - 5, 14, 9); anahtar.target.position.set(cx, 0, 0); anahtar.target.updateMatrixWorld();
    kenarIsik.position.set(cx + 14, 7, -10); kenarIsik.target.position.set(cx, 0, 0); kenarIsik.target.updateMatrixWorld();
    for (const [i, m] of muhurler.entries()) {
      ekranNokta.copy(m.dunya).project(kamera);
      const x = (ekranNokta.x + 1) / 2 * olcu.w, y = (1 - ekranNokta.y) / 2 * olcu.h;
      const uzak = Math.abs(i * ARA - cx) / ARA;
      m.el.style.transform = `translate(${Math.min(Math.max(x, 36), olcu.w - 36).toFixed(1)}px, ${Math.max(y, 64).toFixed(1)}px)`;
      m.el.style.visibility = uzak > 0.62 ? 'hidden' : '';   /* yarı saydam yazı kontrastı düşürür: uzaktaki mühür gizlenir, yakındaki tam okunur */
    }
  };

  /* ── kaydırma ve döngü ── */
  let p = 0, pHedef = 0, t = 0, son = 0, raf = 0, calisiyor = false, atla = false;
  const adim = adimBagla({ iz, adimlar, azHareket, etkinDegisti: (i) => muhurler.forEach((m, k) => m.el.classList.toggle('etkin', k === i)), gitti: (i) => { pHedef = i / (ADIM - 1); adim.guncelle(pHedef); } });
  const hedefOku = () => { const r = iz.getBoundingClientRect(); pHedef = ilerlemeHesapla(r.top, r.height, innerHeight); };
  /* gölgelendiriciler paralel derlenir (KHR_parallel_shader_compile): ana iş parçacığı kilitlenmez, ilk kare derleme bitince çizilir */
  let hazir = false;
  const ciz = () => { if (!hazir) return; boyutla(); kameraKur(kameraX(p)); sahneyiKur(azHareket ? 7.3 : t); renderer.render(sahne, kamera); if (!tuvalEl.dataset.cizildi) tuvalEl.dataset.cizildi = '3b'; };   /* işaret: sınama 3B tuvali 2B bağlamla okumaz */
  function kare(zm) {
    raf = 0;
    if (!calisiyor) return;
    const dt = son ? Math.min((zm - son) / 1000, 0.1) : 0.016;
    son = zm; t += Math.min(dt, 0.05);
    const hareket = Math.abs(pHedef - p) > 1e-4;
    p += (pHedef - p) * (1 - Math.exp(-dt / 0.12));
    atla = !hareket && !atla;        /* kamera dururken 30 kare/sn yeter; kayarken her kare */
    if (!atla) ciz();
    raf = requestAnimationFrame(kare);
  }
  hedefOku(); p = pHedef; adim.guncelle(p);
  boyutla(); kameraKur(kameraX(p)); sahneyiKur(7.3);
  derle(renderer, sahne, kamera).then(() => { hazir = true; ciz(); });
  addEventListener('scroll', () => { hedefOku(); adim.guncelle(pHedef); if (azHareket) { p = pHedef; ciz(); } }, { passive: true });
  new ResizeObserver(() => { olcu.w = 0; hedefOku(); ciz(); }).observe(tuvalEl);
  if (!azHareket) {
    let ioGorunur = false;
    const baslat = () => { if (ioGorunur && !document.hidden && !calisiyor) { calisiyor = true; son = 0; if (!raf) raf = requestAnimationFrame(kare); } };
    const durdur = () => { calisiyor = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver((g) => { ioGorunur = g[g.length - 1].isIntersecting; ioGorunur ? baslat() : durdur(); }).observe(tuvalEl);
    document.addEventListener('visibilitychange', () => (document.hidden ? durdur() : baslat()));
  }
  tuvalEl.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
  return { ciz, kare: (zaman, ilerleme) => { t = zaman; p = pHedef = ilerleme; adim.guncelle(p); ciz(); } };
}
