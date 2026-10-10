/* LABORATUVAR 3B — T1–T5 test cihazlarının 2.5B maketleri (three.js) + yanında canlı veri paneli (Canvas 2D).
 *
 *   T1 çekme       çift kolonlu çekme cihazı: kırmızı travers yükselir, numune boyun verir ve kopar
 *   T2 aşınma      Martindale: dört başlık Lissajous yörüngesinde sürter, disklerde tüy topakları birikir
 *   T3 haslık      ksenon kabini: lamba çevresinde dönen numune kartları, örtülü yarı korunur, açık yarı solar
 *   T4 geçirgenlik hava geçirgenliği cihazı: kumaş iki halka arasında, hava tanecikleri sıklığa göre geçer
 *   T5 yanmazlık   dikey yanma kabini: alt kenara alev, kömürleşme yükselir, duman tüter
 *
 * Laboratuvar denetimi (sekmeler, metin, ölçüm satırı, T6 muayene) laboratuvar.mjs'tedir; bu modül yalnız
 * "cihaz + veri" karesini üretir ve ölçüm satırının metnini döndürür. Değerler temsilîdir (sayfada yazılı).
 * Modeller (çekme eğrisi, Lissajous, geçirgenlik, solma) çağırandan gelir: tek kaynak, dogrula.mjs sınar.
 */
import { THREE, TAU, kesir, yumusak, tuval, dokuYap, kumasDokusu, renderKur, malzemeler, kurucu, kaideKur, derle } from './uc-ortak.mjs';
import { cekmeEgrisi, KOPMA } from './surec-ortak.mjs';
import { metin, sayi, yuzde, buyuk as buyukHarf } from '../ceviri.mjs';

const VW = 360, VH = 460;                      /* veri paneli mantıksal boyutu */
const R = { zemin: '#0e1229', ciz: 'rgba(243,238,228,.8)', ince: 'rgba(243,238,228,.42)', krem: '#f3eee4', kirmizi: '#e2585a', pirinc: '#b4967b', laci: '#3d4f9a' };

function lekeDokusu() {
  const S = 64, c = tuval(S), g = c.getContext('2d'), r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S);
  return c;
}
/** kömür: siyah, üst kenarı yırtık (alfa); ölçek y ile yükselir */
function komurDokusu() {
  const c = tuval(128, 256), g = c.getContext('2d');
  g.fillStyle = '#0a0a0e';
  g.beginPath(); g.moveTo(0, 256);
  for (let x = 0; x <= 128; x += 4) g.lineTo(x, 22 + 14 * Math.sin(x * 0.17) + 8 * Math.sin(x * 0.53 + 1));
  g.lineTo(128, 256); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(230, 120, 50, .9)'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= 128; x += 4) { const y = 22 + 14 * Math.sin(x * 0.17) + 8 * Math.sin(x * 0.53 + 1); x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  return c;
}
/** cetvel: mm çentikleri */
function cetvelDokusu() {
  const c = tuval(64, 512), g = c.getContext('2d');
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 64, 512);
  g.fillStyle = '#1a2147';
  for (let k = 0; k <= 100; k++) { const y = 512 - k * 5; g.fillRect(0, y, k % 10 ? 14 : k % 5 ? 20 : 30, 2); }
  return c;
}
/** manometre kadranı */
function kadranDokusu() {
  const c = tuval(256), g = c.getContext('2d');
  g.fillStyle = '#f6f1e6'; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.fill();
  g.strokeStyle = '#1a2147'; g.lineWidth = 6; g.stroke();
  for (let k = 0; k <= 20; k++) { const a = Math.PI * (0.75 + 1.5 * k / 20); g.lineWidth = k % 5 ? 2 : 5; g.beginPath(); g.moveTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); g.lineTo(128 + Math.cos(a) * (k % 5 ? 108 : 114), 128 + Math.sin(a) * (k % 5 ? 108 : 114)); g.stroke(); }
  g.strokeStyle = '#b8292b'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 104, Math.PI * 1.85, Math.PI * 2.25); g.stroke();
  g.fillStyle = '#1a2147'; g.font = '700 26px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('Pa', 128, 190);
  return c;
}

export function labUcKur({ ucTuval, veriTuval, azHareket = false, model }) {
  const kur = renderKur(ucTuval, { golgeBoyu: 1024 });
  if (!kur) return null;
  const { renderer, sahne, anahtar, kenarIsik } = kur;
  const { lissajous, gecirgenlik, solma } = model;
  const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const gk = anahtar.shadow.camera; gk.left = -4; gk.right = 4; gk.top = 4; gk.bottom = -4; gk.near = 1; gk.far = 40;
  anahtar.position.set(-3, 9, 6); anahtar.target.position.set(0, 0.8, 0);
  kenarIsik.position.set(6, 4, -5);

  const M = malzemeler(), { std } = M;
  const kumasKirmizi = dokuYap(kumasDokusu('#c43a3c', '#922426', false), true); kumasKirmizi.repeat.set(1, 3);
  const kumasLaci = dokuYap(kumasDokusu('#2a376e', '#18214c', false), true);
  M.numune = std(0xffffff, 0.85, 0, { map: kumasKirmizi, side: THREE.DoubleSide });
  M.disk = std(0xffffff, 0.9, 0, { map: kumasLaci });
  M.laciKumas = std(0xffffff, 0.85, 0, { map: kumasLaci, side: THREE.DoubleSide });
  M.ic = std(0x10142e, 0.85, 0.05);
  const leke = dokuYap(lekeDokusu());

  const cihazlar = [];
  const yeni = (hedef, yarim) => { const g = new THREE.Group(); g.visible = false; sahne.add(g); kaideKur(g, M, { x0: -1.9, x1: 1.9, z0: -1.25, z1: 1.25, cizgi: false }); const c = { g, hedef, yarim }; cihazlar.push(c); return c; };

  /* ═══ T1 ÇEKME CİHAZI ═══ */
  const c1 = yeni(new THREE.Vector3(0.1, 2.0, 0), 2.45);
  {
    const { kutu, silindir } = kurucu(c1.g);
    kutu(1.9, 0.55, 1.0, M.laci, 0, 0.3, 0); kutu(1.92, 0.06, 1.02, M.kirmizi, 0, 0.47, 0);
    for (const x of [-0.62, 0.62]) { silindir(0.075, 0.075, 3.0, M.celik, x, 2.05, 0); silindir(0.105, 0.105, 0.85, M.siyah, x, 0.98, 0); }
    kutu(1.55, 0.32, 0.62, M.emaye, 0, 3.62, 0); kutu(1.57, 0.06, 0.64, M.kirmizi, 0, 3.5, 0);
    kutu(0.38, 0.3, 0.3, M.celikKoyu, 0, 0.75, 0);
    for (const x of [-0.11, 0.11]) kutu(0.05, 0.24, 0.32, M.siyah, x, 0.78, 0);
    kutu(0.55, 1.35, 0.45, M.emaye, 1.38, 0.68, -0.25);
    kutu(0.45, 0.32, 0.03, M.siyah, 1.38, 1.05, -0.02);
    for (let k = 0; k < 3; k++) kutu(0.06, 0.06, 0.02, M.led([0x58c26b, 0xffb340, 0xe2585a][k]), 1.26 + k * 0.12, 0.75, -0.02, c1.g, { golge: false });
  }
  const travers = new THREE.Group(); c1.g.add(travers);
  {
    const { kutu, silindir } = kurucu(travers);
    kutu(1.45, 0.24, 0.55, M.kirmizi, 0, 0, 0);
    silindir(0.12, 0.12, 0.22, M.celik, 0, -0.23, 0);
    kutu(0.38, 0.3, 0.3, M.celikKoyu, 0, -0.5, 0);
    for (const x of [-0.11, 0.11]) kutu(0.05, 0.24, 0.32, M.siyah, x, -0.53, 0);
  }
  /* numune: iki parça (kopunca ayrılır); boyun verme köşe noktalarıyla */
  const numuneParca = [0, 1].map(() => { const geo = new THREE.PlaneGeometry(0.26, 1, 1, 14); const m = new THREE.Mesh(geo, M.numune); m.castShadow = true; c1.g.add(m); return m; });
  function numuneKur(alt, ust, boyun, kopuk) {
    const orta = (alt + ust) / 2, bosluk = kopuk ? 0.06 : 0;
    [[alt, orta - bosluk], [orta + bosluk, ust]].forEach(([y0, y1], k) => {
      const pos = numuneParca[k].geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const sira = Math.floor(i / 2), u = sira / 14, y = y0 + (y1 - y0) * (1 - u);
        const d = (y - orta) / 0.22, dar = 1 - boyun * Math.exp(-d * d);
        const kenar = i % 2 ? 1 : -1;
        const sacak = kopuk && Math.abs(y - orta) < 0.08 ? 0.02 * Math.sin(i * 7.3) : 0;
        pos.setXYZ(i, kenar * 0.13 * dar + sacak, y, 0.0);
      }
      pos.needsUpdate = true; numuneParca[k].geometry.computeBoundingSphere();
    });
  }

  /* ═══ T2 MARTINDALE ═══ */
  const c2 = yeni(new THREE.Vector3(0, 1.0, 0), 1.95);
  const istasyon = [[-0.62, -0.36], [0.62, -0.36], [-0.62, 0.36], [0.62, 0.36]];
  {
    const { kutu, silindir } = kurucu(c2.g);
    kutu(2.8, 0.42, 1.7, M.laci, 0, 0.21, 0); kutu(2.8, 0.34, 1.7, M.emaye, 0, 0.59, 0); kutu(2.82, 0.05, 1.72, M.kirmizi, 0, 0.44, 0);
    kutu(2.6, 0.06, 1.5, M.celik, 0, 0.79, 0);
    for (const [x, z] of istasyon) { silindir(0.31, 0.31, 0.05, M.disk, x, 0.845, z); silindir(0.34, 0.34, 0.02, M.celikKoyu, x, 0.82, z); }
    kutu(0.62, 0.26, 0.04, M.siyah, 0.95, 0.42, 0.87);
    kutu(0.5, 0.12, 0.01, M.led(0xff5b5d), 0.95, 0.43, 0.895, c2.g, { golge: false });
    for (const x of [-1.32, 1.32]) kutu(0.12, 0.9, 0.12, M.celikKoyu, x, 1.15, -0.78);
    kutu(2.76, 0.1, 0.14, M.celikKoyu, 0, 1.62, -0.78);
  }
  const ustPlaka = new THREE.Group(); c2.g.add(ustPlaka);
  {
    const { kutu, silindir } = kurucu(ustPlaka);
    kutu(2.3, 0.06, 1.34, M.laci, 0, 1.3, 0);
    for (const [x, z] of istasyon) { silindir(0.24, 0.24, 0.36, M.celik, x, 1.06, z); silindir(0.04, 0.04, 0.55, M.celikKoyu, x, 1.58, z); silindir(0.13, 0.13, 0.15, M.siyah, x, 1.86, z); }
  }
  const tuyGeo = new THREE.SphereGeometry(0.022, 8, 6);
  const TUY = 160, tuylar = new THREE.InstancedMesh(tuyGeo, std(0xe9e1cf, 0.95), TUY); c2.g.add(tuylar);
  const tuyKonum = [];
  for (let k = 0; k < TUY; k++) { const [x, z] = istasyon[k % 4], a = (k * 2.399) % TAU, d = 0.27 * Math.sqrt(((k * 0.618) % 1)); tuyKonum.push([x + Math.cos(a) * d, 0.875, z + Math.sin(a) * d]); }

  /* ═══ T3 KSENON KABİNİ ═══ */
  const c3 = yeni(new THREE.Vector3(0, 1.5, 0), 1.85);
  {
    const { kutu, silindir, ekle } = kurucu(c3.g);
    kutu(2.2, 0.5, 1.5, M.laci, 0, 0.25, 0); kutu(2.22, 0.05, 1.52, M.kirmizi, 0, 0.47, 0);
    kutu(2.2, 2.2, 0.08, M.emaye, 0, 1.6, -0.71); kutu(0.08, 2.2, 1.5, M.emaye, -1.06, 1.6, 0); kutu(0.08, 2.2, 1.5, M.emaye, 1.06, 1.6, 0);
    kutu(2.2, 0.3, 1.5, M.emaye, 0, 2.85, 0);
    ekle(new THREE.PlaneGeometry(2.04, 2.1), M.ic, 0, 1.6, -0.66, c3.g, { golge: false });
    for (const y of [0.55, 2.68]) kutu(2.2, 0.08, 0.06, M.laci, 0, y, 0.74);
    for (const x of [-1.06, 1.06]) kutu(0.08, 2.2, 0.06, M.laci, x, 1.6, 0.74);
    ekle(new THREE.PlaneGeometry(2.04, 2.08), M.cam, 0, 1.6, 0.76, c3.g, { golge: false });
    silindir(0.14, 0.14, 0.25, M.celik, 0.6, 3.1, -0.2);
    kutu(0.04, 0.7, 0.5, M.laci, 1.12, 1.9, 0.25);
    for (let k = 0; k < 3; k++) kutu(0.02, 0.06, 0.06, M.led([0x58c26b, 0xffb340, 0xe2585a][k]), 1.145, 2.1 - k * 0.12, 0.25, c3.g, { golge: false });
    silindir(0.08, 0.08, 1.5, new THREE.MeshBasicMaterial({ color: 0xe8f0ff, toneMapped: false }), 0, 1.6, 0, c3.g, { golge: false });
    const hale = silindir(0.24, 0.24, 1.45, new THREE.MeshBasicMaterial({ color: 0x9fbaff, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }), 0, 1.6, 0, c3.g, { golge: false });
    hale.renderOrder = 2;
    const isik = new THREE.PointLight(0xcfe0ff, 6, 3.2, 1.4); isik.position.set(0, 1.6, 0); c3.g.add(isik);
  }
  const raf = new THREE.Group(); raf.position.set(0, 1.6, 0); c3.g.add(raf);
  const kartMalz = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU, kart = new THREE.Group(); kart.position.set(Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52); kart.lookAt(0, 0, 0); raf.add(kart);
    const malz = std(0x27336a, 0.8); kartMalz.push(malz);
    const ust = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.45), malz); ust.position.y = 0.23; kart.add(ust);
    const alt = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.45), std(0x27336a, 0.8)); alt.position.y = -0.23; kart.add(alt);
    const ortu = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.46), M.celikKoyu); ortu.position.set(0, -0.23, 0.01); kart.add(ortu);
  }
  for (const y of [-0.62, 0.62]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.015, 6, 48), M.celikKoyu); h.rotation.x = Math.PI / 2; h.position.y = y; raf.add(h); }

  /* ═══ T4 HAVA GEÇİRGENLİĞİ ═══ */
  const c4 = yeni(new THREE.Vector3(0, 1.3, 0), 1.95);
  const TX = -0.35;
  {
    const { kutu, silindir, ekle } = kurucu(c4.g);
    kutu(2.6, 0.9, 1.5, M.emaye, 0, 0.45, 0); kutu(2.62, 0.06, 1.52, M.kirmizi, 0, 0.74, 0);
    kutu(2.6, 0.2, 1.5, M.laci, 0, 0.1, 0);
    silindir(0.5, 0.56, 0.16, M.celik, TX, 0.98, 0);
    silindir(0.68, 0.68, 0.02, M.laciKumas, TX, 1.07, 0);
    silindir(0.07, 0.07, 1.6, M.celikKoyu, -1.15, 1.7, -0.5);
    kutu(0.95, 0.14, 0.18, M.laci, -0.72, 2.45, -0.5);
    kutu(0.7, 0.95, 0.14, M.laci, 0.85, 1.45, 0.2, c4.g, { ry: -0.35 });
    const kadran = ekle(new THREE.CircleGeometry(0.28, 40), std(0xffffff, 0.6, 0, { map: dokuYap(kadranDokusu()) }), 0.85 + Math.sin(-0.35) * 0.075, 1.55, 0.2 + Math.cos(-0.35) * 0.075, c4.g, { golge: false, ry: -0.35 });
    kadran.userData.kadran = true;
  }
  const ustHalka = new THREE.Group(); c4.g.add(ustHalka);
  { const { silindir } = kurucu(ustHalka); silindir(0.5, 0.5, 0.22, M.celik, TX, 0, 0); silindir(0.04, 0.04, 1.2, M.celikKoyu, TX, 0.7, 0); silindir(0.3, 0.3, 0.05, M.kirmizi, TX, 0.12, 0); }
  const ibre = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.01), M.kirmizi);
  ibre.geometry.translate(0, 0.1, 0);
  ibre.position.set(0.85 + Math.sin(-0.35) * 0.09, 1.55, 0.2 + Math.cos(-0.35) * 0.09); ibre.rotation.y = -0.35; c4.g.add(ibre);
  const HAVA = 220;
  const havaGeo = new THREE.BufferGeometry();
  havaGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HAVA * 3), 3));
  havaGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(HAVA * 4), 4));
  const hava = new THREE.Points(havaGeo, new THREE.PointsMaterial({ map: leke, size: 7, sizeAttenuation: false, transparent: true, depthWrite: false, vertexColors: true }));
  hava.frustumCulled = false; c4.g.add(hava);

  /* ═══ T5 DİKEY YANMA KABİNİ ═══ */
  const c5 = yeni(new THREE.Vector3(0, 1.55, 0), 1.85);
  const NY0 = 0.75, NBOY = 1.6;
  {
    const { kutu, silindir, ekle } = kurucu(c5.g);
    kutu(2.0, 0.5, 1.4, M.laci, 0, 0.25, 0); kutu(2.02, 0.05, 1.42, M.kirmizi, 0, 0.47, 0);
    kutu(2.0, 2.3, 0.08, M.emaye, 0, 1.65, -0.66); kutu(0.08, 2.3, 1.4, M.emaye, -0.96, 1.65, 0); kutu(0.08, 2.3, 1.4, M.emaye, 0.96, 1.65, 0);
    kutu(2.0, 0.25, 1.4, M.emaye, 0, 2.92, 0); silindir(0.16, 0.16, 0.35, M.celik, -0.5, 3.2, -0.2);
    ekle(new THREE.PlaneGeometry(1.84, 2.2), M.ic, 0, 1.65, -0.61, c5.g, { golge: false });
    for (const y of [0.55, 2.76]) kutu(2.0, 0.08, 0.06, M.laci, 0, y, 0.69);
    for (const x of [-0.96, 0.96]) kutu(0.08, 2.3, 0.06, M.laci, x, 1.65, 0.69);
    ekle(new THREE.PlaneGeometry(1.84, 2.18), M.cam, 0, 1.65, 0.71, c5.g, { golge: false });
    for (const x of [-0.29, 0.29]) kutu(0.04, 1.75, 0.04, M.celik, x, NY0 + NBOY / 2 + 0.05, 0);
    kutu(0.66, 0.06, 0.06, M.celik, 0, NY0 + NBOY + 0.08, 0);
    ekle(new THREE.PlaneGeometry(0.5, NBOY), M.laciKumas, 0, NY0 + NBOY / 2, 0, c5.g, { golge: false });
    ekle(new THREE.PlaneGeometry(0.1, NBOY), std(0xffffff, 0.7, 0, { map: dokuYap(cetvelDokusu()) }), 0.42, NY0 + NBOY / 2, 0.02, c5.g, { golge: false });
    const bek = silindir(0.045, 0.06, 0.55, M.celikKoyu, 0, 0.42, 0.28, c5.g, { rx: -0.55 });
    bek.position.set(0, 0.55, 0.22);
  }
  const komurGeo = new THREE.PlaneGeometry(0.5, NBOY); komurGeo.translate(0, NBOY / 2, 0);
  const komur = new THREE.Mesh(komurGeo, new THREE.MeshStandardMaterial({ map: dokuYap(komurDokusu()), transparent: true, roughness: 0.9, alphaTest: 0.05 }));
  komur.position.set(0, NY0, 0.005); c5.g.add(komur);
  const alev = new THREE.Group(); alev.position.set(0, NY0 - 0.02, 0.06); c5.g.add(alev);
  const alevler = [[0.11, 0.42, 0xe2585a, 0.55], [0.08, 0.32, 0xf0a046, 0.75], [0.045, 0.2, 0xfff0c0, 0.95]].map(([r, h, renk, op]) => {
    const geo = new THREE.ConeGeometry(r, h, 18, 1, true); geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    alev.add(m); return m;
  });
  const alevIsik = new THREE.PointLight(0xff8a3c, 4, 2.2, 1.5); alevIsik.position.set(0, NY0 + 0.2, 0.3); c5.g.add(alevIsik);
  const DUMAN = 60, dumanGeo = new THREE.BufferGeometry();
  dumanGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUMAN * 3), 3));
  dumanGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DUMAN * 4), 4));
  const duman = new THREE.Points(dumanGeo, new THREE.PointsMaterial({ map: leke, size: 22, sizeAttenuation: false, transparent: true, depthWrite: false, vertexColors: true, color: 0x9aa0ad }));
  duman.frustumCulled = false; c5.g.add(duman);

  /* ── veri paneli (2B) ── */
  const vctx = veriTuval.getContext('2d');
  let vo = 1, vox = 0, voy = 0, vdpr = 1;
  const lw = (px) => px / vo;
  const yazi = (s, x, y, renk = R.ince, boy = 11, hiza = 'left', agirlik = 500, aile = '"JetBrains Mono", monospace') => { vctx.fillStyle = renk; vctx.font = `${agirlik} ${lw(boy)}px ${aile}`; vctx.textAlign = hiza; vctx.fillText(s, x, y); };
  const buyuk = (s, x, y, boy = 40, renk = R.krem, hiza = 'left') => yazi(s, x, y, renk, boy, hiza, 300, 'Fraunces, Georgia, serif');
  const baslik = (s) => { yazi(buyukHarf(s), 24, 34, 'rgba(243,238,228,.62)', 12); vctx.fillStyle = R.kirmizi; vctx.fillRect(24, 44, 28, lw(2)); };

  /* T1 veri: kuvvet–uzama eğrisi */
  const CEKME_SURE = 6, FMAX = 1180, EMAX = 31;
  function veriCekme(e, kopuk, imlec) {
    baslik(metin('panel1Baslik'));
    const s = Math.min(e, 0.95), f = kopuk ? cekmeEgrisi(KOPMA - 1e-4) * FMAX : cekmeEgrisi(s) * FMAX;
    buyuk(`${sayi(f)}`, 24, 104, 44); yazi('N', 24 + vctx.measureText(sayi(f)).width + lw(6), 104, R.ince, 13);
    yazi(`${metin('panelUzama')} ${yuzde(sayi((kopuk ? KOPMA : s) * EMAX, 1))}`, 24, 128, R.krem, 13);
    const gx = 44, gy = 410, gw = 290, gh = 230;
    vctx.strokeStyle = R.ince; vctx.lineWidth = lw(1);
    for (let k = 1; k <= 3; k++) { const y = gy - gh * (k * 400) / (FMAX * 1.1); vctx.beginPath(); vctx.moveTo(gx, y); vctx.lineTo(gx + gw, y); vctx.stroke(); yazi(sayi(k * 400), gx - 6, y + 4, R.ince, 11, 'right'); }
    vctx.strokeStyle = R.ciz; vctx.beginPath(); vctx.moveTo(gx, gy - gh - 8); vctx.lineTo(gx, gy); vctx.lineTo(gx + gw + 8, gy); vctx.stroke();
    for (let ee = 0; ee <= 25; ee += 5) { const x = gx + (ee / EMAX / 0.95) * gw; yazi(String(ee), x, gy + 18, R.ince, 11, 'center'); }
    yazi('F (N)', gx, gy - gh - 16, R.ince, 11); yazi('ε (%)', gx + gw + 8, gy + 34, R.ince, 11, 'right');
    vctx.strokeStyle = R.kirmizi; vctx.lineWidth = lw(2.4); vctx.beginPath();
    for (let q = 0; q <= s + 1e-6; q += 0.005) { const x = gx + (q / 0.95) * gw, y = gy - cekmeEgrisi(q) / 1.1 * gh; q ? vctx.lineTo(x, y) : vctx.moveTo(x, y); }
    vctx.stroke();
    const px = gx + (s / 0.95) * gw, py = gy - cekmeEgrisi(s) / 1.1 * gh;
    vctx.fillStyle = R.kirmizi; vctx.beginPath(); vctx.arc(px, py, lw(5), 0, TAU); vctx.fill();
    if (kopuk) {
      const tx = gx + (KOPMA / 0.95) * gw, ty = gy - cekmeEgrisi(KOPMA - 1e-4) / 1.1 * gh;
      vctx.setLineDash([lw(4), lw(4)]); vctx.strokeStyle = R.pirinc; vctx.lineWidth = lw(1); vctx.beginPath(); vctx.moveTo(tx, ty); vctx.lineTo(tx, gy); vctx.stroke(); vctx.setLineDash([]);
      yazi(metin('panelKopma'), tx - 6, ty - 10, R.pirinc, 9, 'right');
    }
    if (imlec && imlec.x >= gx && imlec.x <= px && imlec.y > gy - gh - 20 && imlec.y < gy + 20) {
      const q = (imlec.x - gx) / gw * 0.95, ay = gy - cekmeEgrisi(q) / 1.1 * gh;
      vctx.setLineDash([lw(3), lw(3)]); vctx.strokeStyle = 'rgba(243, 238, 228, .55)'; vctx.lineWidth = lw(1);
      vctx.beginPath(); vctx.moveTo(imlec.x, gy); vctx.lineTo(imlec.x, ay); vctx.lineTo(gx, ay); vctx.stroke(); vctx.setLineDash([]);
      vctx.fillStyle = R.krem; vctx.beginPath(); vctx.arc(imlec.x, ay, lw(4), 0, TAU); vctx.fill();
      const etiket = `${sayi(cekmeEgrisi(q) * FMAX)} N · ${yuzde(sayi(q * EMAX, 1))}`;
      vctx.font = `600 ${lw(11)}px "JetBrains Mono", monospace`;
      const g = vctx.measureText(etiket).width + lw(12), ex = Math.min(imlec.x + lw(8), gx + gw - g), ey = ay - lw(28);
      vctx.fillStyle = '#060918'; vctx.fillRect(ex, ey, g, lw(20)); vctx.strokeStyle = R.kirmizi; vctx.strokeRect(ex, ey, g, lw(20));
      vctx.fillStyle = R.krem; vctx.textAlign = 'left'; vctx.textBaseline = 'middle'; vctx.fillText(etiket, ex + lw(6), ey + lw(10)); vctx.textBaseline = 'alphabetic';
    }
    return kopuk ? metin('lab1Kopma').replace('{f}', sayi(f)).replace('{e}', sayi(EMAX * KOPMA, 1)) : metin('lab1Olcum').replace('{f}', sayi(f)).replace('{e}', sayi(s * EMAX, 1));
  }
  /* T2 veri: devir, ilerleme, Lissajous izi, tüylenme derecesi */
  const iz = [];
  let devirG = 0;
  function veriAsinma(t, devir, oran, tazele) {
    baslik('Martindale');
    if (tazele) devirG = devir;
    buyuk(sayi(devirG), 24, 104, 44);
    yazi(`${metin('panelDevir')} / ${sayi(40000)}`, 24, 128, R.krem, 13);
    vctx.fillStyle = 'rgba(243,238,228,.1)'; vctx.fillRect(24, 142, 312, lw(5));
    vctx.fillStyle = R.kirmizi; vctx.fillRect(24, 142, 312 * oran, lw(5));
    const cx = 180, cy = 290, r = 104;
    vctx.strokeStyle = R.ince; vctx.lineWidth = lw(1); vctx.beginPath(); vctx.arc(cx, cy, r + 10, 0, TAU); vctx.stroke();
    const a = azHareket ? 40 : t * 2.2;
    if (azHareket) { iz.length = 0; for (let q = 0; q < 40; q += 0.03) iz.push(lissajous(q)); } else { iz.push(lissajous(a)); if (iz.length > 700) iz.shift(); }
    vctx.strokeStyle = 'rgba(226, 88, 90, .6)'; vctx.lineWidth = lw(1.2); vctx.beginPath();
    iz.forEach(([x, y], i) => { const X = cx + x * r * 1.4, Y = cy + y * r * 1.4; i ? vctx.lineTo(X, Y) : vctx.moveTo(X, Y); });
    vctx.stroke();
    const [hx, hy] = lissajous(a);
    vctx.strokeStyle = R.krem; vctx.lineWidth = lw(1.5); vctx.beginPath(); vctx.arc(cx + hx * r * 1.4, cy + hy * r * 1.4, lw(9), 0, TAU); vctx.stroke();
    const derece = Math.max(1, Math.round((5 - oran * 2.6) * 2) / 2);
    const dy = Number.isInteger(derece) ? String(derece) : `${Math.floor(derece)}–${Math.ceil(derece)}`;
    yazi(`${metin('panelTuylenme')}  ${dy}`, 24, 440, R.krem, 11);
    return metin('lab2Olcum').replace('{n}', sayi(devirG));
  }
  /* T3 veri: mavi yün 1–8 ve gri skala */
  function veriHaslik(poz) {
    baslik(metin('panel3Baslik'));
    const saat = Math.round(poz * 72);
    buyuk(sayi(saat), 24, 104, 44); yazi(metin('panelSaat'), 24, 128, R.krem, 13);
    for (let d = 1; d <= 8; d++) {
      const k = solma(poz, d), x = 24 + (d - 1) * 39;
      vctx.fillStyle = `rgb(${Math.round(40 + 160 * k)}, ${Math.round(70 + 140 * k)}, ${Math.round(170 + 50 * k)})`; vctx.fillRect(x, 150, 32, 130);
      vctx.fillStyle = 'rgb(40, 70, 170)'; vctx.fillRect(x, 150, 32, 30);
      vctx.strokeStyle = R.ince; vctx.lineWidth = lw(1); vctx.strokeRect(x, 150, 32, 130);
      yazi(String(d), x + 16, 298, R.ince, 11, 'center');
    }
    yazi(metin('lab3Ortulu'), 24, 146 - 4, R.ince, 8);
    const kayip = solma(poz, 4), derece = Math.max(1, 5 - kayip * 5.2), yarim = Math.round(derece * 2) / 2;
    yazi(metin('panelGriSkala'), 24, 336, R.ince, 11);
    for (let i = 0; i < 5; i++) {
      const g = 90 + i * 30, x = 24 + i * 63;
      vctx.fillStyle = `rgb(${g}, ${g}, ${g + 8})`; vctx.fillRect(x, 348, 26, 40);
      vctx.fillStyle = 'rgb(210, 210, 216)'; vctx.fillRect(x + 26, 348, 26, 40);
      yazi(String(5 - i), x + 26, 406, R.ince, 11, 'center');
    }
    const ix = 24 + (5 - yarim) * 63;
    vctx.strokeStyle = R.kirmizi; vctx.lineWidth = lw(2); vctx.strokeRect(ix - 4, 342, 60, 52);
    const dy = Number.isInteger(yarim) ? String(yarim) : `${Math.floor(yarim)}–${Math.floor(yarim) + 1}`;
    return metin('lab3Olcum').replace('{s}', sayi(saat)).replace('{d}', dy);
  }
  /* T4 veri: kesit + geçirgenlik göstergesi */
  function veriGecir(siklik) {
    const { bosluk, gecis } = gecirgenlik(siklik);
    baslik(metin('panel4Baslik'));
    const y = sayi(gecis * 100, 0);
    buyuk(yuzde(y), 24, 104, 44); yazi(`${siklik} ${metin('panelTelCm')}`, 24, 128, R.krem, 13);
    const cy = 250, n = Math.round(siklik / 4.2), adim = 300 / n, rr = Math.min(adim * 0.5 * (1 - bosluk * 0.5), 22);
    vctx.fillStyle = 'rgba(61, 79, 154, .18)'; vctx.fillRect(24, 160, 312, 70); vctx.fillStyle = 'rgba(61, 79, 154, .07)'; vctx.fillRect(24, 270, 312, 70);
    yazi('p₁', 30, 178, R.ince, 11); yazi('p₂ < p₁', 30, 336, R.ince, 11);
    vctx.strokeStyle = '#e9e1cf'; vctx.lineWidth = lw(4); vctx.beginPath();
    for (let i = 0; i < n; i++) { const x = 30 + adim * (i + 0.5), yy = cy + (i % 2 ? rr : -rr) * 0.9; i ? vctx.lineTo(x, yy) : vctx.moveTo(x, yy); }
    vctx.stroke();
    for (let i = 0; i < n; i++) { vctx.beginPath(); vctx.arc(30 + adim * (i + 0.5), cy, rr, 0, TAU); vctx.fillStyle = R.laci; vctx.fill(); vctx.strokeStyle = R.ciz; vctx.lineWidth = lw(1); vctx.stroke(); }
    yazi(metin('panelGecirgenlik'), 24, 384, R.ince, 11);
    vctx.fillStyle = 'rgba(243,238,228,.1)'; vctx.fillRect(24, 394, 312, lw(8));
    vctx.fillStyle = R.kirmizi; vctx.fillRect(24, 394, 312 * Math.min(1, gecis * 1.25), lw(8));
    return metin('lab4Olcum').replace('{s}', String(siklik)).replace('{g}', yuzde(y));
  }
  /* T5 veri: hasar boyu + alev süresi */
  function veriYanma(faz, hasarMm, alevVar) {
    baslik(metin('panel5Baslik'));
    buyuk(sayi(hasarMm), 24, 104, 44); yazi('mm', 24 + vctx.measureText(sayi(hasarMm)).width + lw(6), 104, R.ince, 13);
    const sn = Math.round(Math.min(faz, 0.45) / 0.45 * 12);
    yazi(`${metin('panelAlev')} ${sn} s`, 24, 128, R.krem, 13);
    const rx = 70, ry0 = 420, rh = 250;
    vctx.fillStyle = 'rgba(61, 79, 154, .35)'; vctx.fillRect(rx, ry0 - rh, 70, rh);
    vctx.fillStyle = '#0a0a0e'; vctx.fillRect(rx, ry0 - rh * (hasarMm / 100), 70, rh * (hasarMm / 100));
    vctx.strokeStyle = R.ciz; vctx.lineWidth = lw(1); vctx.strokeRect(rx, ry0 - rh, 70, rh);
    for (let mm = 0; mm <= 100; mm += 10) { const y = ry0 - rh * mm / 100; vctx.beginPath(); vctx.moveTo(rx + 70, y); vctx.lineTo(rx + 70 + (mm % 50 ? 6 : 12), y); vctx.stroke(); if (mm % 50 === 0) yazi(String(mm), rx + 90, y + 4, R.ince, 11); }
    vctx.strokeStyle = R.kirmizi; vctx.lineWidth = lw(2); const hy = ry0 - rh * (hasarMm / 100); vctx.beginPath(); vctx.moveTo(rx - 10, hy); vctx.lineTo(rx + 84, hy); vctx.stroke();
    yazi(alevVar ? (metin('panelAlevVar')) : (metin('panelKorSifir')), 200, 260, alevVar ? R.kirmizi : R.krem, 10);
    return metin('lab5Olcum').replace('{s}', String(sn)).replace('{h}', sayi(hasarMm));
  }

  /* ── kare ── */
  const kukla = new THREE.Object3D(), renk = new THREE.Color(), solmamis = new THREE.Color(0x27336a), solmus = new THREE.Color(0x9ea6c6);
  let w = 0, h = 0, devirSon = 0;
  function boyutla() {
    const r = { width: ucTuval.clientWidth, height: ucTuval.clientHeight };
    if (r.width !== w || r.height !== h) { w = r.width; h = r.height; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w || 1, h || 1, false); }
    vdpr = Math.min(devicePixelRatio || 1, 2);
    const vw = veriTuval.clientWidth, vh = veriTuval.clientHeight;
    if (veriTuval.width !== Math.round(vw * vdpr) || veriTuval.height !== Math.round(vh * vdpr)) { veriTuval.width = Math.max(1, Math.round(vw * vdpr)); veriTuval.height = Math.max(1, Math.round(vh * vdpr)); }
    vo = Math.min(vw / VW, vh / VH); vox = (vw - VW * vo) / 2; voy = (vh - VH * vo) / 2;
  }
  const YON = new THREE.Vector3(0.55, 0.42, 1).normalize();
  function kameraKur(c) {
    const oran = (w || 1) / (h || 1);
    const yb = c.yarim * Math.max(1, 0.9 / oran);
    kamera.left = -yb * oran; kamera.right = yb * oran; kamera.top = yb; kamera.bottom = -yb;
    kamera.position.copy(c.hedef).addScaledVector(YON, 30); kamera.lookAt(c.hedef); kamera.updateProjectionMatrix();
  }

  /* bütün cihazların gölgelendiricileri paralel derlenir (gizli olanlar da: sekme değişince takılma olmasın) */
  let hazir = false;
  boyutla(); kameraKur(cihazlar[0]);
  cihazlar.forEach((c) => { c.g.visible = true; });
  const derlendi = derle(renderer, sahne, kamera).then(() => { hazir = true; });
  function ciz(sira, t, { siklik = 32, imlec = null, tazele = true } = {}) {
    boyutla();
    cihazlar.forEach((c, k) => { c.g.visible = k === sira; });
    const c = cihazlar[sira];
    kameraKur(c);
    vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.clearRect(0, 0, veriTuval.width, veriTuval.height);
    vctx.setTransform(vdpr * vo, 0, 0, vdpr * vo, vdpr * vox, vdpr * voy);
    let yazisi = '';
    if (sira === 0) {
      const faz = azHareket ? 0.62 : (t / CEKME_SURE) % 1, e = Math.min(1, faz / 0.85), kopuk = e >= KOPMA;
      const uz = Math.min(e, KOPMA);
      travers.position.set(0, 2.35 + 0.62 * uz + (kopuk ? 0.03 : 0), 0);
      numuneKur(0.9, travers.position.y - 0.65, 0.45 * yumusak(uz / KOPMA) ** 2, kopuk);
      yazisi = veriCekme(e, kopuk, imlec);
    } else if (sira === 1) {
      const a = azHareket ? 40 : t * 2.2, [lx, lz] = lissajous(a);
      ustPlaka.position.set(lx * 0.14, 0, lz * 0.14);
      const devir = azHareket ? 18000 : Math.floor((t * 2.2 * 900) % 40000), oran = devir / 40000;
      const goster = Math.floor(TUY * Math.min(1, oran * 1.3));
      for (let k = 0; k < TUY; k++) { kukla.position.set(...tuyKonum[k]); const s = k < goster ? 0.6 + 0.6 * ((k * 0.37) % 1) : 0.0001; kukla.scale.set(s, s * 0.7, s); kukla.updateMatrix(); tuylar.setMatrixAt(k, kukla.matrix); }
      tuylar.instanceMatrix.needsUpdate = true;
      devirSon = devir;
      yazisi = veriAsinma(t, devirSon, oran, tazele);
    } else if (sira === 2) {
      const poz = azHareket ? 0.75 : (t / 9) % 1;
      raf.rotation.y = azHareket ? 0.4 : t * 0.5;
      kartMalz.forEach((m, k) => m.color.copy(renk.copy(solmamis).lerp(solmus, solma(poz, 3 + (k % 3)))));
      yazisi = veriHaslik(poz);
    } else if (sira === 3) {
      const { gecis } = gecirgenlik(siklik);
      const f = azHareket ? 0.5 : kesir(t / 5), basma = f < 0.12 ? yumusak(f / 0.12) : 1;
      ustHalka.position.y = 1.85 - 0.62 * basma;
      ibre.rotation.set(0, -0.35, -(-2.2 + 3.6 * Math.min(1, gecis * 1.25)) * basma);
      const pos = havaGeo.attributes.position.array, col = havaGeo.attributes.color.array;
      for (let k = 0; k < HAVA; k++) {
        const gec = ((k * 0.618) % 1) < Math.min(1, gecis * 2.2), q = kesir(t * 0.55 + k / HAVA), a = k * 2.399, d = 0.42 * Math.sqrt((k * 0.37) % 1);
        let y = 2.3 - q * 2.0, alfa = Math.sin(Math.PI * Math.min(1, q * 1.4)) * 0.85;
        if (!gec && y < 1.12) { y = 1.12 + 0.02 * Math.sin(k); alfa *= Math.max(0, 1 - (1.12 - (2.3 - q * 2.0)) * 3); }
        pos[k * 3] = TX + Math.cos(a) * d * (gec || y > 1.2 ? 1 : 1.3); pos[k * 3 + 1] = y; pos[k * 3 + 2] = Math.sin(a) * d;
        col.set(gec ? [0.95, 0.94, 0.9, alfa * basma] : [0.89, 0.35, 0.36, alfa * basma], k * 4);
      }
      havaGeo.attributes.position.needsUpdate = true; havaGeo.attributes.color.needsUpdate = true;
      yazisi = veriGecir(siklik);
    } else if (sira === 4) {
      const faz = azHareket ? 0.8 : (t / 8) % 1, alevSure = 0.45, uyg = Math.min(faz / alevSure, 1);
      const hasar = (1 - Math.exp(-uyg * 2.2)) / (1 - Math.exp(-2.2));
      komur.scale.set(1, 0.02 + 0.5 * hasar, 1);
      const alevVar = faz < alevSure || azHareket;
      alev.visible = alevVar; alevIsik.intensity = alevVar ? 3.5 + Math.sin(t * 31) * 0.8 : 0;
      alevler.forEach((m, k) => { m.scale.set(1 + 0.08 * Math.sin(t * 23 + k), 1 + 0.18 * Math.sin(t * 17 + k * 2), 1 + 0.08 * Math.cos(t * 19 + k)); });
      const pos = dumanGeo.attributes.position.array, col = dumanGeo.attributes.color.array;
      for (let k = 0; k < DUMAN; k++) {
        const q = kesir(t * 0.35 + k / DUMAN);
        pos.set([0.18 * Math.sin(k * 1.7 + q * 4), NY0 + 0.25 + q * 1.9, 0.12 + 0.08 * Math.cos(k * 2.3)], k * 3);
        col.set([1, 1, 1, (alevVar ? 0.32 : 0.12) * Math.sin(Math.PI * q)], k * 4);
      }
      dumanGeo.attributes.position.needsUpdate = true; dumanGeo.attributes.color.needsUpdate = true;
      yazisi = veriYanma(faz, Math.round(hasar * 80), alevVar);
    }
    if (hazir) { renderer.render(sahne, kamera); if (!ucTuval.dataset.cizildi) ucTuval.dataset.cizildi = '3b'; }
    return yazisi;
  }
  /** veri panelindeki imleç (mantıksal koordinat) */
  const veriNokta = (e) => { const r = veriTuval.getBoundingClientRect(); return { x: (e.clientX - r.left - vox) / vo, y: (e.clientY - r.top - voy) / vo }; };
  return { ciz, boyutla, veriNokta, derlendi };
}
