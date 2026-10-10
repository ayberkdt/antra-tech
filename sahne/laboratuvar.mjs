/* LABORATUVAR — beş test yönteminin temsilî canlandırması (Canvas 2D, 800 × 640 mantıksal birim).
 *
 *   cekme       şerit yöntemi: çeneler ayrılır, kuvvet–uzama eğrisi çizilir, iplikler sırayla kopar
 *   asinma      Martindale: sürtme başlığı Lissajous eğrisi izler, yüzeyde tüylenme birikir
 *   haslik      ksenon lamba altında yarısı örtülü numune + mavi yün referansları solar
 *   gecirgenlik kumaş kesiti; sıklık kaydırıcısıyla iplik arası boşluk ve hava akışı değişir
 *   yanmazlik   dikey numuneye alev; kömürleşme yükselir, hasar boyu cetvelle ölçülür
 *
 * Değerler örnektir (sayfada yazılı). Ölçüm satırı 8 Hz'de güncellenir; ekran okuyucuya
 * yalnız test değişince duyurulur. Saf modeller dışa açık; araclar/dogrula.mjs sınar.
 */
import { metin, sayi, yuzde, buyuk } from '../ceviri.mjs';
import { cekmeEgrisi, KOPMA } from './surec-ortak.mjs';
import { muayeneKur } from './muayene.mjs';
import { donanimGpu } from './gpu.mjs';

export const TESTLER = ['cekme', 'asinma', 'haslik', 'gecirgenlik', 'yanmazlik', 'muayene'];

/** Martindale sürtme yolu: iki dik harmonik hareket (Lissajous), birim daire içinde */
export function lissajous(t) {
  return [Math.sin(t) * 0.62, Math.cos(t * 15 / 16) * 0.62];
}
/** Geçirgenlik: sıklık (tel/cm) → iplik arası boşluk oranı ve göreli hava geçirgenliği (boşluk³) */
export function gecirgenlik(siklik, iplikCapi = 0.018) {
  const aralik = 1 / siklik;                         /* cm */
  const bosluk = Math.max(0, aralik - iplikCapi) / aralik;
  return { bosluk, gecis: Math.pow(bosluk, 3) };
}
/** Solma: pozlama oranı (0–1) ve referans hassasiyeti (1 hızlı … 8 yavaş) → renk kaybı 0–1 */
export function solma(pozlama, derece) {
  return 1 - Math.exp(-pozlama * 6 / Math.pow(2, derece - 1));
}

const R = {
  zemin: '#151b38', zemin2: '#1d2550', ciz: 'rgba(243,238,228,.8)', ince: 'rgba(243,238,228,.28)',
  krem: '#f3eee4', kirmizi: '#e2585a', laci: '#3d4f9a', laciKoyu: '#25306a', ham: '#e9e1cf', pirinc: '#b4967b',
};

export function labKur({ kok, azHareket }) {
  const tuval = kok.querySelector('#lab-tuval');
  const olcum = kok.querySelector('#lab-olcum');
  const ad = kok.querySelector('#lab-test-ad');
  const aciklama = kok.querySelector('#lab-test-metin');
  const panel = kok.querySelector('#lab-panel');
  const olculen = kok.querySelector('#lab-olculen');
  const sekmeler = [...kok.querySelectorAll('[role="tab"]')];
  const ekran = kok.querySelector('.lab__ekran');
  const ctx = tuval.getContext('2d');
  let dpr = Math.min(devicePixelRatio || 1, 2);       /* boyutla() yeniler: yakınlaştırmada tuval bulanıklaşmasın */
  let olcek = 1, t = 0, son = 0, raf = 0, gorunur = false, sira = 0, sonYazi = 0;
  let kareDt = 1 / 60, uretBirikim = 0;
  let imlec = null;                          /* mantıksal koordinatta imleç (çekme grafiği artısı) */
  let uc = null, ucImlec = null;             /* 3B cihaz sahnesi (lab3b.mjs); yoksa 2B çizim */
  tuval.addEventListener('pointermove', (e) => {
    if (uc) ucImlec = uc.veriNokta(e);
    const r = tuval.getBoundingClientRect();
    const ox = (r.width - 800 * olcek) / 2, oy = (r.height - 640 * olcek) / 2;
    imlec = { x: (e.clientX - r.left - ox) / olcek, y: (e.clientY - r.top - oy) / olcek };
    if (azHareket) { sonOlcum = ciz(); yaz(true); }
  });
  tuval.addEventListener('pointerleave', () => { imlec = null; ucImlec = null; if (azHareket) { sonOlcum = ciz(); yaz(true); } });      /* tanecik üretimi ve hızı gerçek kare süresine bağlı */
  let siklik = 32;

  /* geçirgenlik kaydırıcısı (yalnız T4'te görünür) */
  const surguKap = document.createElement('label');
  surguKap.className = 'lab__surgu';
  surguKap.innerHTML = `<span class="lab__surgu-ad"></span><input type="range" min="18" max="56" step="1" value="${siklik}">`;
  const surgu = surguKap.querySelector('input');
  const surguAd = surguKap.querySelector('span');
  surgu.addEventListener('input', () => { siklik = +surgu.value; if (azHareket) ciz(); yaz(true); });
  ekran.append(surguKap);

  function boyutla() {
    const r = tuval.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
    tuval.width = Math.max(1, Math.round(r.width * dpr)); tuval.height = Math.max(1, Math.round(r.height * dpr));
    olcek = Math.min(r.width / 800, r.height / 640);
  }
  const lw = (px) => px / olcek;
  const kutu = (x, y, g, h, dolgu = R.zemin2, renk = R.ciz) => { ctx.fillStyle = dolgu; ctx.fillRect(x, y, g, h); ctx.strokeStyle = renk; ctx.lineWidth = lw(1.4); ctx.strokeRect(x, y, g, h); };
  const yazi = (s, x, y, renk = R.ince, boy = 11, hiza = 'left') => { ctx.fillStyle = renk; ctx.font = `500 ${lw(boy)}px "JetBrains Mono", monospace`; ctx.textAlign = hiza; ctx.fillText(s, x, y); };

  /* ── T1 çekme ─────────────────────────────────────────────── */
  const CEKME_SURE = 6, FMAX = 1180, EMAX = 31;
  function cekme() {
    const faz = azHareket ? 0.62 : (t / CEKME_SURE) % 1;
    const e = Math.min(1, faz / 0.85);
    const kopuk = e >= KOPMA;
    const bosaltma = kopuk ? Math.min(1, (faz - KOPMA * 0.85) / 0.1) : 0;
    /* çerçeve */
    kutu(70, 560, 300, 40);
    kutu(90, 70, 18, 490, R.zemin2); kutu(332, 70, 18, 490, R.zemin2);
    kutu(70, 52, 300, 22);
    const ac = e * 120;
    const ustY = 150 - ac;
    kutu(90, ustY - 18, 260, 16);
    kutu(186, ustY - 2, 68, 40);
    kutu(186, 440, 68, 40);
    /* numune: atkılar (yatay) ve çözgüler (dikey); çözgüler sırayla kopar */
    const ust = ustY + 38, alt = 440;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x = 196 + i * 6;
      const kopmaSirasi = KOPMA + (i * 7 % n) / n * 0.03;
      const koptu = e >= kopmaSirasi;
      const orta = (ust + alt) / 2 + ((i * 13) % 7) - 3;
      ctx.lineWidth = lw(3.4); ctx.strokeStyle = i === 4 ? R.kirmizi : R.ham;
      if (!koptu) {
        const daral = e * 4 * Math.sin((i / (n - 1)) * Math.PI) * (i < n / 2 ? 1 : -1);
        ctx.beginPath(); ctx.moveTo(x, ust); ctx.quadraticCurveTo(x + daral, (ust + alt) / 2, x, alt); ctx.stroke();
      } else {
        const geri = 6 + bosaltma * 10;
        ctx.beginPath(); ctx.moveTo(x, ust); ctx.lineTo(x + ((i % 3) - 1) * 2, orta - geri); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, alt); ctx.lineTo(x - ((i % 3) - 1) * 2, orta + geri); ctx.stroke();
      }
    }
    if (!kopuk) {
      ctx.strokeStyle = 'rgba(200, 190, 168, .7)'; ctx.lineWidth = lw(1.2);
      for (let y = ust + 4; y < alt; y += 7) { ctx.beginPath(); ctx.moveTo(193, y); ctx.lineTo(247, y); ctx.stroke(); }
    }
    /* grafik */
    const gx = 420, gy = 520, gw = 330, gh = 380;
    ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1);
    for (let k = 1; k <= 3; k++) { const y = gy - gh * (k * 400) / (FMAX * 1.1); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = R.ciz; ctx.beginPath(); ctx.moveTo(gx, gy - gh - 10); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw + 10, gy); ctx.stroke();
    yazi('F (N)', gx, gy - gh - 22); yazi('ε (%)', gx + gw + 10, gy + 40, R.ince, 11, 'right');
    for (let k = 0; k <= 3; k++) yazi(sayi(k * 400), gx - 10, gy - gh * (k * 400) / (FMAX * 1.1) + 4, R.ince, 10, 'right');
    /* uzama ekseni: eğri parametresi s ∈ [0, 0.95] ↔ uzama s × EMAX (%) */
    for (let e = 0; e <= 25; e += 5) {
      const x = gx + (e / EMAX / 0.95) * gw;
      ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + 6); ctx.stroke();
      yazi(String(e), x, gy + 20, R.ince, 10, 'center');
    }
    ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(2.4); ctx.beginPath();
    const sonE = Math.min(e, 0.95);
    for (let s = 0; s <= sonE + 1e-6; s += 0.005) {
      const x = gx + (s / 0.95) * gw, y = gy - cekmeEgrisi(s) / 1.1 * gh;
      s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    const f = cekmeEgrisi(sonE) * FMAX, uz = sonE * EMAX;
    const px = gx + (sonE / 0.95) * gw, py = gy - cekmeEgrisi(sonE) / 1.1 * gh;
    ctx.fillStyle = R.kirmizi; ctx.beginPath(); ctx.arc(px, py, lw(5), 0, Math.PI * 2); ctx.fill();
    /* imleç artısı: eğrinin çizilmiş kısmında o noktanın kuvvet ve uzaması */
    if (imlec && imlec.x >= gx && imlec.x <= px && imlec.y > gy - gh - 20 && imlec.y < gy + 20) {
      const s = (imlec.x - gx) / gw * 0.95;
      const ay = gy - cekmeEgrisi(s) / 1.1 * gh;
      ctx.setLineDash([lw(3), lw(3)]); ctx.strokeStyle = 'rgba(243, 238, 228, .55)'; ctx.lineWidth = lw(1);
      ctx.beginPath(); ctx.moveTo(imlec.x, gy); ctx.lineTo(imlec.x, ay); ctx.lineTo(gx, ay); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = R.krem; ctx.beginPath(); ctx.arc(imlec.x, ay, lw(4), 0, Math.PI * 2); ctx.fill();
      const etiket = `${sayi(cekmeEgrisi(s) * FMAX)} N · ${yuzde(sayi(s * EMAX, 1))}`;
      ctx.font = `600 ${lw(12)}px "JetBrains Mono", monospace`;
      const g = ctx.measureText(etiket).width + lw(14);
      const ex = Math.min(imlec.x + lw(10), gx + gw + 10 - g), ey = ay - lw(30);
      ctx.fillStyle = '#0e1229'; ctx.fillRect(ex, ey, g, lw(22));
      ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1); ctx.strokeRect(ex, ey, g, lw(22));
      ctx.fillStyle = R.krem; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(etiket, ex + lw(7), ey + lw(11));
      ctx.textBaseline = 'alphabetic';
    }
    if (kopuk) {
      const tepeX = gx + (KOPMA / 0.95) * gw, tepeY = gy - cekmeEgrisi(KOPMA - 1e-4) / 1.1 * gh;
      ctx.setLineDash([lw(4), lw(4)]); ctx.strokeStyle = R.pirinc; ctx.lineWidth = lw(1);
      ctx.beginPath(); ctx.moveTo(tepeX, tepeY); ctx.lineTo(tepeX, gy); ctx.stroke(); ctx.setLineDash([]);
      return metin('lab1Kopma').replace('{f}', sayi(cekmeEgrisi(KOPMA - 1e-4) * FMAX)).replace('{e}', sayi(EMAX * KOPMA, 1));
    }
    return metin('lab1Olcum').replace('{f}', sayi(f)).replace('{e}', sayi(uz, 1));
  }

  /* ── T2 Martindale aşınma ─────────────────────────────────── */
  const iz = [];
  const tuy = [];
  /* devir rakamı alttaki okumayla aynı karede değişir (okuma 125 ms'de bir yazılır; ayrı akarlarsa iki farklı sayı görünür) */
  let devirG = 0;
  function asinma() {
    const cx = 330, cy = 320, r = 230;
    const hiz = 2.2;
    const devir = azHareket ? 18000 : Math.floor((t * hiz * 900) % 40000);
    /* numune diski: örgü dokusu */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = R.laciKoyu; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = 'rgba(120, 140, 210, .18)'; ctx.lineWidth = lw(3);
    for (let x = cx - r; x < cx + r; x += 8) { ctx.beginPath(); ctx.moveTo(x, cy - r); ctx.lineTo(x + r * 0.3, cy + r); ctx.stroke(); }
    /* aşınma: yol yoğunluğu → açık leke */
    const oran = devir / 40000;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r * 0.75);
    g.addColorStop(0, `rgba(190, 180, 160, ${0.38 * oran})`); g.addColorStop(1, 'rgba(190, 180, 160, 0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    /* tüylenme topakları */
    const hedefTuy = Math.floor(oran * 60);
    while (tuy.length < hedefTuy) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * 0.7; tuy.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + Math.random() * 3]); }
    if (tuy.length > hedefTuy) tuy.length = hedefTuy;
    for (const [x, y, s] of tuy) { ctx.fillStyle = 'rgba(214, 206, 190, .75)'; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = R.ciz; ctx.lineWidth = lw(1.4); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = R.ince; ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.stroke();
    /* Lissajous izi */
    const a = azHareket ? 40 : t * hiz;
    if (azHareket) { iz.length = 0; for (let s = 0; s < 40; s += 0.02) iz.push(lissajous(s)); }
    else { iz.push(lissajous(a)); if (iz.length > 900) iz.shift(); }
    ctx.strokeStyle = 'rgba(226, 88, 90, .55)'; ctx.lineWidth = lw(1.2); ctx.beginPath();
    iz.forEach(([x, y], i) => { const X = cx + x * r, Y = cy + y * r; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
    /* sürtme başlığı */
    const [hx, hy] = lissajous(a);
    const X = cx + hx * r, Y = cy + hy * r;
    ctx.fillStyle = 'rgba(243, 238, 228, .14)'; ctx.beginPath(); ctx.arc(X, Y, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = R.krem; ctx.lineWidth = lw(1.6); ctx.beginPath(); ctx.arc(X, Y, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(X, Y, 6, 0, Math.PI * 2); ctx.fillStyle = R.krem; ctx.fill();
    /* devir sayacı */
    kutu(610, 230, 150, 180);
    yazi('MARTINDALE', 685, 262, R.ince, 10, 'center');
    ctx.fillStyle = R.krem; ctx.font = `300 ${lw(34)}px Fraunces, Georgia, serif`; ctx.textAlign = 'center'; if (tazele || azHareket) devirG = devir; ctx.fillText(sayi(devirG), 685, 330);
    yazi(buyuk(metin('lab2Olcum').split(' ')[0]), 685, 360, R.ince, 10, 'center');
    ctx.fillStyle = R.kirmizi; ctx.fillRect(630, 384, 110 * oran, 4); ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1); ctx.strokeRect(630, 384, 110, 4);
    return metin('lab2Olcum').replace('{n}', sayi(devirG));
  }

  /* ── T3 ışık ve ter haslığı ───────────────────────────────── */
  function haslik() {
    const poz = azHareket ? 0.75 : (t / 9) % 1;
    /* ksenon lamba */
    kutu(180, 40, 440, 50);
    for (let i = 0; i < 9; i++) {
      const x = 220 + i * 45;
      ctx.strokeStyle = `rgba(243, 238, 228, ${0.08 + 0.06 * Math.sin(t * 6 + i)})`; ctx.lineWidth = lw(10);
      ctx.beginPath(); ctx.moveTo(x, 96); ctx.lineTo(x + (i - 4) * 14, 300); ctx.stroke();
    }
    yazi(metin('lab3Ksenon'), 400, 72, R.ince, 11, 'center');
    /* numune: üst yarısı örtülü */
    const nx = 120, ny = 300, ng = 260, nh = 150;
    const kayip = solma(poz, 4);
    const renk = (k) => `rgb(${Math.round(37 + (150 - 37) * k)}, ${Math.round(48 + (156 - 48) * k)}, ${Math.round(106 + (190 - 106) * k)})`;
    ctx.fillStyle = renk(0); ctx.fillRect(nx, ny, ng / 2, nh);
    ctx.fillStyle = renk(kayip); ctx.fillRect(nx + ng / 2, ny, ng / 2, nh);
    /* örtü: sol yarı pozlama boyunca kapalı (taralı karton) */
    ctx.save(); ctx.beginPath(); ctx.rect(nx, ny, ng / 2, nh); ctx.clip();
    ctx.fillStyle = 'rgba(13, 17, 41, .35)'; ctx.fillRect(nx, ny, ng / 2, nh);
    ctx.strokeStyle = 'rgba(243, 238, 228, .14)'; ctx.lineWidth = lw(1);
    for (let k = -nh; k < ng / 2; k += 12) { ctx.beginPath(); ctx.moveTo(nx + k, ny + nh); ctx.lineTo(nx + k + nh, ny); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = R.ciz; ctx.lineWidth = lw(1.4); ctx.strokeRect(nx, ny, ng, nh);
    ctx.setLineDash([lw(4), lw(4)]); ctx.beginPath(); ctx.moveTo(nx + ng / 2, ny); ctx.lineTo(nx + ng / 2, ny + nh); ctx.stroke(); ctx.setLineDash([]);
    yazi(metin('lab3Ortulu'), nx + ng / 4, ny + nh + 22, R.ince, 10, 'center');
    yazi(metin('lab3Pozlanan'), nx + ng * 3 / 4, ny + nh + 22, R.ince, 10, 'center');
    /* mavi yün referansları 1–8 */
    const rx = 440, ry = 300;
    yazi(metin('lab3MaviYun'), rx, ry - 14, R.ince, 10);
    for (let d = 1; d <= 8; d++) {
      const k = solma(poz, d);
      const x = rx + (d - 1) * 38;
      ctx.fillStyle = `rgb(${Math.round(40 + 160 * k)}, ${Math.round(70 + 140 * k)}, ${Math.round(170 + 50 * k)})`;
      ctx.fillRect(x, ry, 30, 150);
      ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1); ctx.strokeRect(x, ry, 30, 150);
      yazi(String(d), x + 15, ry + 172, R.ince, 10, 'center');
    }
    /* gri skala karşılaştırma */
    const derece = Math.max(1, 5 - kayip * 5.2);
    const yarim = Math.round(derece * 2) / 2;
    kutu(120, 520, 330, 70, R.zemin2, R.ince);
    /* ter haslığı: çok lifli refakat şeridi (asetat, pamuk, poliamid, poliester, akrilik, yün) numuneden boya alır */
    const LIF = ['CA', 'CO', 'PA', 'PES', 'PAC', 'WO'];
    const AL = [0.55, 0.35, 0.9, 0.2, 0.3, 0.7];          /* temsilî boya alma eğilimi */
    yazi(metin('lab3Serit'), 470, 512, R.ince, 10);
    LIF.forEach((l, i) => {
      const k = Math.min(1, poz * AL[i]) * 0.6;
      const x = 470 + i * 46;
      ctx.fillStyle = `rgb(${Math.round(236 - 160 * k)}, ${Math.round(230 - 140 * k)}, ${Math.round(216 - 60 * k)})`;
      ctx.fillRect(x, 522, 44, 46);
      yazi(l, x + 22, 586, R.ince, 9, 'center');
    });
    for (let i = 0; i < 5; i++) {
      const g = 90 + i * 30;
      ctx.fillStyle = `rgb(${g}, ${g}, ${g + 8})`; ctx.fillRect(140 + i * 60, 538, 26, 34);
      ctx.fillStyle = 'rgb(210, 210, 216)'; ctx.fillRect(166 + i * 60, 538, 26, 34);
      yazi(String(5 - i), 166 + i * 60, 586, R.ince, 9, 'center');
    }
    const ix = 166 + (5 - yarim) * 60;
    ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(2); ctx.strokeRect(ix - 30, 532, 60, 46);
    const saat = Math.round(poz * 72);
    const dereceYazi = Number.isInteger(yarim) ? String(yarim) : `${Math.floor(yarim)}–${Math.floor(yarim) + 1}`;
    return metin('lab3Olcum').replace('{s}', sayi(saat)).replace('{d}', dereceYazi);
  }

  /* ── T4 geçirgenlik ───────────────────────────────────────── */
  const tanecik = [];
  function gecir() {
    const { bosluk, gecis } = gecirgenlik(siklik);
    /* basınç odaları */
    kutu(60, 60, 680, 200, 'rgba(61, 79, 154, .25)', R.ince);
    kutu(60, 330, 680, 200, 'rgba(61, 79, 154, .08)', R.ince);
    yazi('p₁', 76, 86); yazi('p₂ < p₁', 76, 356);
    /* kumaş kesiti: atkı kesitleri (daire) + çözgü dalgası */
    const cy = 295, n = Math.round(siklik / 2.2);
    const adim = 680 / n, rr = Math.min(adim * 0.5 * (1 - bosluk * 0.5), 26);
    const merkez = [];
    for (let i = 0; i < n; i++) merkez.push(60 + adim * (i + 0.5));
    ctx.strokeStyle = R.ham; ctx.lineWidth = lw(5); ctx.beginPath();
    merkez.forEach((x, i) => { const y = cy + (i % 2 ? rr : -rr) * 0.9; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    for (const x of merkez) { ctx.beginPath(); ctx.arc(x, cy, rr, 0, Math.PI * 2); ctx.fillStyle = R.laci; ctx.fill(); ctx.strokeStyle = R.ciz; ctx.lineWidth = lw(1); ctx.stroke(); }
    /* tanecikler: yukarıdan gelir, boşluk varsa geçer, yoksa birikir */
    if (!azHareket) {
      uretBirikim += 180 * kareDt;
      const uret = Math.floor(uretBirikim); uretBirikim -= uret;
      for (let k = 0; k < uret; k++) { const gec = Math.random() < Math.min(1, gecis * 2.2); if (gec || Math.random() < 0.35) tanecik.push({ x: 70 + Math.random() * 660, y: 70, v: 140 + Math.random() * 80, gec }); }
    }
    const dt = kareDt;
    for (let i = tanecik.length - 1; i >= 0; i--) {
      const q = tanecik[i];
      if (!azHareket) q.y += q.v * dt;
      if (!q.gec && q.y > cy - rr - 8) { q.y = cy - rr - 8; q.v = 0; q.omur = (q.omur || 0) + dt; if (q.omur > 0.35) { tanecik.splice(i, 1); continue; } }
      if (q.gec && Math.abs(q.y - cy) < rr + 4) {
        /* en yakın boşluğa yönel */
        const en = merkez.reduce((b, x) => (Math.abs(x + adim / 2 - q.x) < Math.abs(b - q.x) ? x + adim / 2 : b), merkez[0] + adim / 2);
        q.x += (en - q.x) * 0.2;
      }
      if (q.y > 520) { tanecik.splice(i, 1); continue; }
      ctx.fillStyle = q.gec ? 'rgba(243, 238, 228, .8)' : 'rgba(226, 88, 90, .7)';
      ctx.beginPath(); ctx.arc(q.x, q.y, lw(2.4), 0, Math.PI * 2); ctx.fill();
    }
    if (tanecik.length > 500) tanecik.splice(0, tanecik.length - 500);
    /* gösterge */
    ctx.fillStyle = R.kirmizi; ctx.fillRect(60, 560, 680 * Math.min(1, gecis * 1.25), 6);
    ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1); ctx.strokeRect(60, 560, 680, 6);
    const oranYuzde = sayi(gecis * 100, 0);   /* ad: içe aktarılan yuzde() gölgelenmesin */
    return metin('lab4Olcum').replace('{s}', String(siklik)).replace('{g}', yuzde(oranYuzde));
  }

  /* ── T5 yanmazlık ─────────────────────────────────────────── */
  function yanmaz() {
    const SURE = 8;
    const faz = azHareket ? 0.8 : (t / SURE) % 1;
    const alevSure = 0.45;                         /* çevrimin alev uygulanan kısmı */
    const uyg = Math.min(faz / alevSure, 1);
    const hasar = 160 * (1 - Math.exp(-uyg * 2.2)) / (1 - Math.exp(-2.2));
    /* askı ve numune */
    kutu(250, 40, 300, 16);
    kutu(320, 56, 160, 26);
    const nx = 330, ny = 82, ng = 140, nh = 400;
    ctx.fillStyle = R.laci; ctx.fillRect(nx, ny, ng, nh);
    ctx.strokeStyle = 'rgba(243,238,228,.08)'; ctx.lineWidth = lw(1);
    for (let y = ny; y < ny + nh; y += 6) { ctx.beginPath(); ctx.moveTo(nx, y); ctx.lineTo(nx + ng, y); ctx.stroke(); }
    /* kömürleşme */
    ctx.save(); ctx.beginPath(); ctx.rect(nx, ny, ng, nh); ctx.clip();
    ctx.fillStyle = '#0b0b10'; ctx.beginPath(); ctx.moveTo(nx, ny + nh);
    for (let x = nx; x <= nx + ng; x += 6) {
      const tepe = hasar * (0.8 + 0.2 * Math.sin(x * 0.11)) * Math.sin(((x - nx) / ng) * Math.PI * 0.9 + 0.15);
      ctx.lineTo(x, ny + nh - tepe);
    }
    ctx.lineTo(nx + ng, ny + nh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(226, 120, 60, .55)'; ctx.lineWidth = lw(2); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = R.ciz; ctx.lineWidth = lw(1.4); ctx.strokeRect(nx, ny, ng, nh);
    /* bek ve alev */
    const alevVar = faz < alevSure;
    kutu(385, 548, 30, 50);
    kutu(350, 596, 100, 10);
    if (alevVar || azHareket) {
      for (let k = 0; k < 3; k++) {
        const boy = 70 - k * 18 + Math.sin(t * 22 + k) * 6;
        const gen = 16 - k * 4;
        ctx.fillStyle = ['rgba(226, 88, 90, .55)', 'rgba(240, 160, 70, .7)', 'rgba(250, 230, 170, .9)'][k];
        ctx.beginPath(); ctx.moveTo(400 - gen, 548);
        ctx.quadraticCurveTo(400 - gen, 548 - boy * 0.6, 400 + Math.sin(t * 15 + k) * 4, 548 - boy);
        ctx.quadraticCurveTo(400 + gen, 548 - boy * 0.6, 400 + gen, 548); ctx.fill();
      }
    }
    /* cetvel ve hasar boyu */
    const rx = 520;
    ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1);
    ctx.beginPath(); ctx.moveTo(rx, ny + nh); ctx.lineTo(rx, ny + nh - 300); ctx.stroke();
    for (let mm = 0; mm <= 300; mm += 10) { ctx.beginPath(); ctx.moveTo(rx, ny + nh - mm); ctx.lineTo(rx + (mm % 50 ? 6 : 12), ny + nh - mm); ctx.stroke(); if (mm % 50 === 0) yazi(String(mm / 2), rx + 18, ny + nh - mm + 4, R.ince, 9); }
    ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(2);
    ctx.beginPath(); ctx.moveTo(nx + ng, ny + nh - hasar); ctx.lineTo(rx + 12, ny + nh - hasar); ctx.stroke();
    yazi('mm', rx + 18, ny + nh - 310, R.ince, 9);
    /* kimyasal dayanım iç paneli: damla numuneye düşer, boncuklanır, ajan izi kalır (temsilî) */
    const kx = 610, ky = 300, kg = 150, kh = 90;
    yazi(metin('lab5Damla'), kx, ky - 96, R.ince, 10);
    ctx.fillStyle = R.laci; ctx.fillRect(kx, ky, kg, kh);
    ctx.strokeStyle = R.ciz; ctx.lineWidth = lw(1.2); ctx.strokeRect(kx, ky, kg, kh);
    const df = azHareket ? 0.9 : (t / SURE) % 1;
    const dx = kx + kg / 2;
    ctx.strokeStyle = R.ince; ctx.lineWidth = lw(1.2); ctx.strokeRect(dx - 6, ky - 78, 12, 22); ctx.beginPath(); ctx.moveTo(dx, ky - 56); ctx.lineTo(dx, ky - 50); ctx.stroke();   /* damlalık */
    if (df < 0.25) {
      const y = ky - 46 + (df / 0.25) * 46;
      ctx.fillStyle = 'rgba(190, 220, 160, .9)';
      ctx.beginPath(); ctx.moveTo(dx, y - 9); ctx.quadraticCurveTo(dx + 7, y, dx, y + 5); ctx.quadraticCurveTo(dx - 7, y, dx, y - 9); ctx.fill();
    } else {
      const yay = Math.min(1, (df - 0.25) / 0.4);
      ctx.fillStyle = `rgba(12, 14, 30, ${0.35 * yay})`;                       /* ajan izi */
      ctx.beginPath(); ctx.ellipse(dx, ky + 30, 14 + 22 * yay, 6 + 9 * yay, 0, 0, Math.PI * 2); ctx.fill();
      const b = 1 - yay * 0.55;                                                   /* boncuk yavaşça yayılır */
      ctx.fillStyle = 'rgba(190, 220, 160, .85)';
      ctx.beginPath(); ctx.ellipse(dx, ky + 26, 12 + (1 - b) * 10, 8 * b, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, .7)'; ctx.beginPath(); ctx.arc(dx - 4, ky + 22 - 4 * b, 2, 0, Math.PI * 2); ctx.fill();
    }
    const sn = Math.round(Math.min(faz, alevSure) / alevSure * 12);
    return metin('lab5Olcum').replace('{s}', String(sn)).replace('{h}', sayi(hasar / 2));
  }

  /* T6 kumaş muayenesi: ayrı modül; tıklama/Boşluk ile hata işaretlenir */
  const muayene = muayeneKur({ lw, yazi, metin, sayi, azHareket });
  /* sınama kancası (yalnız ?olc=1): araclar/uctan-uca.mjs hatanın ekran konumunu okuyup gerçek tıklama gönderir */
  if (new URLSearchParams(location.search).has('olc')) globalThis.__muayene = { hatalar: muayene.hatalar };
  const muayeneCiz = () => muayene.ciz(ctx);
  const CIZICI = { cekme, asinma, haslik, gecirgenlik: gecir, yanmazlik: yanmaz, muayene: muayeneCiz };

  function ciz() {
    if (uc && TESTLER[sira] !== 'muayene') return uc.ciz(sira, t, { siklik, imlec: ucImlec, tazele: tazele || azHareket });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = R.zemin; ctx.fillRect(0, 0, tuval.width, tuval.height);
    const r = tuval.getBoundingClientRect();
    const ox = (r.width - 800 * olcek) / 2, oy = (r.height - 640 * olcek) / 2;
    ctx.setTransform(dpr * olcek, 0, 0, dpr * olcek, dpr * ox, dpr * oy);
    return CIZICI[TESTLER[sira]]();
  }
  function yaz(zorla) {
    const now = performance.now();
    if (!zorla && now - sonYazi < 125) return;
    sonYazi = now;
    olcum.textContent = sonOlcum;
  }
  let sonOlcum = '', tazele = true;   /* tazele: bu karede okuma yazılacak mı (devir rakamı buna uyar) */

  function kare(z) {
    raf = 0;
    if (!gorunur) return;
    const dt = son ? Math.min((z - son) / 1000, 0.05) : 0.016;
    son = z; t += dt; kareDt = dt;
    if (TESTLER[sira] === 'muayene') muayene.adim(dt);
    tazele = performance.now() - sonYazi >= 125;
    sonOlcum = ciz(); yaz(); tazele = true;
    raf = requestAnimationFrame(kare);
  }
  function calistir() { if (azHareket) { sonOlcum = ciz(); yaz(true); return; } if (!raf && gorunur) { son = 0; raf = requestAnimationFrame(kare); } }

  function sec(i, odakla) {
    sira = i; t = 0; iz.length = 0; tuy.length = 0; tanecik.length = 0;
    muayene.sifirla();
    sekmeler.forEach((s, k) => { s.setAttribute('aria-selected', String(k === i)); s.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', sekmeler[i].id);
    if (odakla) sekmeler[i].focus();
    metinleriYaz();
    surguKap.hidden = TESTLER[i] !== 'gecirgenlik';
    ekran.classList.toggle('lab__ekran--duz', !uc || TESTLER[i] === 'muayene');
    sonOlcum = ciz(); yaz(true);
  }
  function metinleriYaz() {
    ad.textContent = metin('test' + (sira + 1));
    aciklama.textContent = metin(`test${sira + 1}Metin`);
    olculen.replaceChildren(...metin(`olculen${sira + 1}`).split('|').map((m) => { const li = document.createElement('li'); li.textContent = m; return li; }));
    surguAd.textContent = metin('lab4Surgu');
    /* dil değişince dilUygula etiketi genel metne döndürür: muayenede talimatlı etiket yeniden yazılır */
    tuval.setAttribute('aria-label', metin(TESTLER[sira] === 'muayene' ? 'lab6TuvalEtiket' : 'labTuvalEtiket'));
  }
  /* dar ekranda sekme şeridi kayar: sona gelince sağdaki solma maskesi kalkar; seçilen sekme görünüme kaydırılır */
  const serit = kok.querySelector('.lab__sekmeler');
  const seritGuncelle = () => serit.classList.toggle('sonda', serit.scrollLeft + serit.clientWidth >= serit.scrollWidth - 4);
  serit.addEventListener('scroll', seritGuncelle, { passive: true }); seritGuncelle();
  sekmeler.forEach((s, i) => {
    s.addEventListener('click', () => { sec(i); if (serit.scrollWidth > serit.clientWidth) s.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: azHareket ? 'instant' : 'smooth' }); });
    s.addEventListener('keydown', (e) => {
      const yon = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (yon) { e.preventDefault(); sec((sira + yon + TESTLER.length) % TESTLER.length, true); }
      if (e.key === 'Home') { e.preventDefault(); sec(0, true); }
      if (e.key === 'End') { e.preventDefault(); sec(TESTLER.length - 1, true); }
    });
  });
  document.addEventListener('dil-degisti', () => { metinleriYaz(); sonOlcum = ciz(); yaz(true); });

  boyutla(); sec(Math.max(0, Math.min(TESTLER.length - 1, +(kok.dataset.istek || 0))));
  /* 3B cihazlar: modül ve three.js inince ekran iki bölmeye geçer (solda cihaz, sağda veri); ?webgl=0 ya da WebGL yoksa 2B kalır */
  if (donanimGpu()) {
    import('./lab3b.mjs').then((m) => {
      uc = m.labUcKur({ ucTuval: kok.querySelector('#lab-uc'), veriTuval: tuval, azHareket, model: { lissajous, gecirgenlik, solma } });
      if (!uc) return;
      /* sec() çağrılmaz: muayenede süren oyun (hatalar, puan) sıfırlanmasın; yalnız düzen ve kare yenilenir */
      ekran.classList.add('lab__ekran--3b');
      ekran.classList.toggle('lab__ekran--duz', TESTLER[sira] === 'muayene');
      boyutla(); sonOlcum = ciz(); yaz(true);
      uc.derlendi.then(() => { sonOlcum = ciz(); yaz(true); });   /* azaltılmış harekette döngü yok: derleme bitince bir kare */
    }).catch((h) => console.warn('lab 3B:', h));
  }
  new ResizeObserver(() => { boyutla(); sonOlcum = ciz(); }).observe(tuval);
  let ioGorunur = false;
  const durdur = () => { gorunur = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver((g) => { ioGorunur = g[g.length - 1].isIntersecting; if (ioGorunur && !document.hidden) { gorunur = true; calistir(); } else durdur(); }).observe(tuval);
  document.addEventListener('visibilitychange', () => { if (document.hidden) durdur(); else if (ioGorunur) { gorunur = true; calistir(); } });
}
