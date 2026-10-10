/* SÜREÇ HATTI — elyaftan sevkiyata 8 istasyon, tek kırmızı iplik (Canvas 2D).
 *
 * Dünya: istasyon genişliği S = 600 birim, zemin y = 470. Kamera kaydırma ilerlemesiyle
 * (yapışkan bölüm, kaydırma kaçırılmaz) istasyondan istasyona kayar; τ = 90 ms yumuşatma.
 * Çizim dili teknik resim: krem çizgi, lacivert dolgu, tek renk kırmızı iplik. İplik
 * 1–3. istasyonda lif → iplik → çözgü, 4. istasyondan sonra kumaşın ortasındaki kırmızı
 * kenar ipliğidir; akış yönü kesik çizgi kaymasıyla gösterilir.
 * Her istasyonun üstünde Antra Tech kontrol mührü; istasyon etkinleşince basılır.
 *
 * Saf fonksiyonlar (ilerleme, kamera, çekme eğrisi) dışa açık; araclar/dogrula.mjs sınar.
 */

/* 2B YEDEK: WebGL yoksa ya da 3B sahne kurulamazsa site.mjs bunu yükler (3B sahne: surec3b.mjs) */
import { metin, buyuk } from '../ceviri.mjs';
import { S, ADIM, KOPMA, ilerlemeHesapla, kamera, cekmeEgrisi, adimBagla } from './surec-ortak.mjs';

export { S, ADIM, KOPMA, ilerlemeHesapla, kamera, cekmeEgrisi };
export const ZEMIN = 470;
const UST = 110, ALT = 545;                           /* dikeyde görünen dünya aralığı */

const R = {
  ciz: 'rgba(243, 238, 228, .80)',
  ince: 'rgba(243, 238, 228, .30)',
  silik: 'rgba(243, 238, 228, .10)',
  dolgu: '#1d2550',
  dolgu2: '#26305e',
  kirmizi: '#e2585a',
  pirinc: '#b4967b',
  ham: '#e9e1cf',
  hamGolge: '#c9bfa8',
  laci: '#4a5ca8',
  boya: '#2b3c94',
};

const OLC = typeof location !== 'undefined' && new URLSearchParams(location.search).has('olc');
const OLCUM = {};
function olc(ad, t0) { const o = (OLCUM[ad] ??= { n: 0, ms: 0 }); o.n++; o.ms += performance.now() - t0; }
if (OLC) globalThis.__surecOlcum = OLCUM;

export function surecKur({ iz, tuval, adimlar, azHareket }) {
  const ctx = tuval.getContext('2d');
  let dpr = Math.min(devicePixelRatio || 1, 1.5);     /* boyutla() yeniler: yakınlaştırmada tuval bulanıklaşmasın */
  let G = 0, Y = 0, k = 1, ox = 0, oy = 0;
  let p = 0, pHedef = 0, t = 0, son = 0, calisiyor = false, raf = 0;
  let etkin = -1, atla = false;
  const adim = adimBagla({ iz, adimlar, azHareket, etkinDegisti: (i) => { etkin = i; muhurZamani[i] = t; }, gitti: (i) => { pHedef = i / (ADIM - 1); adim.guncelle(pHedef); } });
  const muhurZamani = new Array(ADIM).fill(-10);
  let adlar = adimlar.map((li) => li.querySelector('b').textContent);
  let kontrol = adimlar.map((_, i) => metin(`kontrol${i + 1}`));
  document.addEventListener('dil-degisti', () => {
    adlar = adimlar.map((li) => li.querySelector('b').textContent);
    kontrol = adimlar.map((_, i) => metin(`kontrol${i + 1}`));
    if (!calisiyor) ciz();
  });

  function boyutla() {
    const r = tuval.getBoundingClientRect();
    G = r.width; Y = r.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
    tuval.width = Math.max(1, Math.round(G * dpr)); tuval.height = Math.max(1, Math.round(Y * dpr));
    /* dar ekranda istasyonun bir kısmı taşabilir: yükseklik daha iyi kullanılsın */
    k = Math.min(Y / (ALT - UST), G / (S * (G < 640 ? 0.78 : 1.08)));
    /* dar ekranda adım metni üstte (CSS); çizim metnin hemen altında, alttaki yüzer çubuğa yer kalır */
    oy = (G < 640 ? (Y - (ALT - UST) * k) * 0.35 : (Y - (ALT - UST) * k) / 2) - UST * k;
  }

  const lw = (px) => px / k;
  const cizgi = (renk = R.ciz, px = 1.5) => { ctx.strokeStyle = renk; ctx.lineWidth = lw(px); };
  function yol(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
  function egri(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]); }
  function kutu(x, y, g, h, dolgu = R.dolgu, renk = R.ciz) { ctx.fillStyle = dolgu; ctx.fillRect(x, y, g, h); cizgi(renk); ctx.strokeRect(x, y, g, h); }
  function silindir(x, y, r, aci, dolgu = R.dolgu2, kol = 6) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = dolgu; ctx.fill(); cizgi(); ctx.stroke();
    cizgi(R.ince, 1);
    for (let i = 0; i < kol; i++) {
      const a = aci + (i / kol) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25); ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, Math.max(2, r * 0.14), 0, Math.PI * 2); ctx.fillStyle = R.ciz; ctx.fill();
  }
  /* kırmızı iplik: akış yönünde kayan kesikli çizgi */
  /* iplik yolculuğu: kameranın geçtiği yere kadar parlak, ilerisi soluk (yerel koordinatta, istasyon başına) */
  let yerelX0 = 0;
  const ipBoyasi = () => {
    const bas = cam.x - yerelX0 + S * 0.05, son = bas + S * 0.45;
    const g = ctx.createLinearGradient(bas, 0, son, 0);
    g.addColorStop(0, R.kirmizi); g.addColorStop(1, 'rgba(226, 88, 90, .28)');
    return g;
  };
  function iplik(cizFn, px = 2.2) {
    cizFn();
    ctx.strokeStyle = azHareket ? R.kirmizi : ipBoyasi(); ctx.lineWidth = lw(px); ctx.lineCap = 'round';
    ctx.setLineDash([lw(16), lw(5)]); ctx.lineDashOffset = -t * 60 / k;
    ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
  }
  /* kumaş şeridi: ham (ya da boyalı) kalın bant + ortada kırmızı iplik */
  function serit(cizFn, renk = R.ham, kalin = 12) {
    cizFn(); ctx.strokeStyle = R.hamGolge; ctx.lineWidth = kalin + lw(2); ctx.lineJoin = 'round'; ctx.stroke();
    cizFn(); ctx.strokeStyle = renk; ctx.lineWidth = kalin; ctx.stroke();
    /* atkı izleri: kumaş akıyor */
    cizFn(); ctx.strokeStyle = 'rgba(22, 26, 46, .16)'; ctx.lineWidth = kalin * 0.8; ctx.setLineDash([lw(1.2), lw(4)]); ctx.lineDashOffset = -t * 40; ctx.stroke(); ctx.setLineDash([]);
    iplik(cizFn, 1.6);
  }
  function muhur(cx, cy, i) {
    const ge = t - muhurZamani[i];
    const a = Math.min(1, ge / 0.35);
    const olcek = azHareket ? 1 : 1 + (1 - a) * 0.6;
    const opak = i === etkin ? 1 : 0.38;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.18 + (1 - a) * 0.3); ctx.scale(olcek, olcek);
    ctx.globalAlpha = opak * (azHareket ? 1 : Math.max(0.25, a));
    ctx.strokeStyle = i === etkin ? R.kirmizi : R.pirinc; ctx.lineWidth = lw(1.5);
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([lw(2), lw(3)]); ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle; ctx.font = `700 ${11}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AT', 0, -5);
    ctx.lineWidth = lw(2); ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-1.5, 9); ctx.lineTo(7, 1); ctx.stroke();
    ctx.restore();
  }

  /* ─────────── istasyonlar (yerel koordinat: x 0–600) ─────────── */
  const ISTASYON = [
    /* 01 hammadde: balyalar → açıcı; lif tutamları uçar */
    function hammadde() {
      kutu(50, 455, 230, 12, R.dolgu2);
      for (const x of [62, 128, 194, 260]) kutu(x - 6, 467, 12, 3, R.ciz);
      const balya = (x, y, g, h) => {
        kutu(x, y, g, h, R.ham, R.ciz);
        /* sıkıştırılmış lif katmanları */
        ctx.strokeStyle = 'rgba(22, 26, 46, .14)'; ctx.lineWidth = lw(1);
        for (let yy = y + 7; yy < y + h; yy += 7) { ctx.beginPath(); ctx.moveTo(x + 2, yy); for (let xx = x + 2; xx <= x + g - 2; xx += 8) ctx.lineTo(xx, yy + Math.sin(xx * 0.7 + yy) * 1.2); ctx.stroke(); }
        /* çelik çemberler */
        ctx.strokeStyle = '#4a5ca8'; ctx.lineWidth = lw(2.2);
        for (const s of [0.22, 0.5, 0.78]) { ctx.beginPath(); ctx.moveTo(x + g * s, y); ctx.lineTo(x + g * s, y + h); ctx.stroke(); }
        /* balya etiketi */
        ctx.fillStyle = R.kirmizi; ctx.fillRect(x + g * 0.56, y + h * 0.3, g * 0.16, h * 0.18);
      };
      balya(58, 375, 104, 80); balya(168, 375, 104, 80); balya(112, 298, 104, 77);
      /* açıcı */
      kutu(340, 330, 150, 140);
      yol([[350, 330], [330, 270], [500, 270], [480, 330]]); ctx.fillStyle = R.dolgu2; ctx.fill(); cizgi(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(360, 350, 110, 70); ctx.clip();
      const a = t * 3;
      ctx.beginPath(); ctx.arc(415, 385, 28, 0, Math.PI * 2); ctx.fillStyle = R.dolgu; ctx.fill(); cizgi(); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const b = a + i * Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(415 + Math.cos(b) * 28, 385 + Math.sin(b) * 28); ctx.lineTo(415 + Math.cos(b + 0.15) * 36, 385 + Math.sin(b + 0.15) * 36); ctx.stroke();
      }
      ctx.restore();
      cizgi(R.ince, 1); ctx.strokeRect(360, 350, 110, 70);
      /* tutamlar: balyadan hazneye */
      for (let i = 0; i < 12; i++) {
        const s = ((t * 0.22 + i / 12) % 1);
        const x = 190 + (415 - 190) * s, y = 300 - Math.sin(s * Math.PI) * 90 - s * 10;
        const al = Math.sin(s * Math.PI);
        ctx.fillStyle = `rgba(233, 225, 207, ${0.75 * al})`;
        for (const [dx, dy, r] of [[0, 0, 5], [5, 2, 4], [-4, 3, 3.5], [2, -4, 3]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
      }
      /* çıkış: dağınık lifler kırmızı şeride toplanır */
      for (let n = 0; n < 5; n++) {
        ctx.strokeStyle = `rgba(226, 88, 90, ${0.25 + n * 0.08})`; ctx.lineWidth = lw(1);
        ctx.beginPath();
        for (let s = 0; s <= 1.0001; s += 0.05) {
          const x = 490 + s * 110;
          const yay = (1 - s) * (n - 2) * 9 + Math.sin(s * 14 + t * 3 + n) * (1 - s) * 4;
          const y = 400 + (300 - 400) * (s * s * (3 - 2 * s)) + yay;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      iplik(() => egri([540, 340], [565, 315], [585, 302], [600, 300]), 2);
    },

    /* 02 iplik: tarak silindiri → çekim silindirleri → ring iğ, balon */
    function iplikEgirme() {
      iplik(() => egri([0, 300], [40, 300], [70, 286], [110, 288]), 2.6);
      silindir(130, 370, 78, t * 1.6, R.dolgu2, 10);
      cizgi(R.ince, 1);
      for (let i = 0; i < 36; i++) { const a = t * 1.6 + i * Math.PI / 18; ctx.beginPath(); ctx.moveTo(130 + Math.cos(a) * 78, 370 + Math.sin(a) * 78); ctx.lineTo(130 + Math.cos(a) * 84, 370 + Math.sin(a) * 84); ctx.stroke(); }
      silindir(238, 395, 30, -t * 3, R.dolgu, 5);
      kutu(70, 448, 200, 22, R.dolgu2);
      /* tülbent → bant */
      iplik(() => { ctx.beginPath(); ctx.arc(130, 370, 82, -Math.PI * 0.62, -Math.PI * 0.08); }, 3);
      iplik(() => egri([207, 345], [240, 360], [262, 330], [290, 251]), 2.6);
      /* çekim silindirleri */
      for (const x of [300, 334, 368]) { silindir(x, 240, 10, t * (4 + x / 100), R.dolgu2, 4); silindir(x, 262, 10, -t * (4 + x / 100), R.dolgu2, 4); }
      iplik(() => yol([[290, 251], [380, 251]]), 2);
      /* iğ: kılavuz göz, balon, bilezik, masura */
      const ix = 450;
      cizgi(); ctx.beginPath(); ctx.arc(ix, 300, 4, 0, Math.PI * 2); ctx.stroke();
      iplik(() => egri([380, 251], [410, 255], [440, 280], [ix, 296]), 1.8);
      const genis = azHareket ? 18 : 18 + 4 * Math.sin(t * 9);
      for (const yon of [1, -1]) {
        ctx.strokeStyle = yon > 0 ? R.kirmizi : 'rgba(226, 88, 90, .45)'; ctx.lineWidth = lw(1.4);
        ctx.beginPath(); ctx.moveTo(ix, 304);
        ctx.bezierCurveTo(ix + yon * genis * Math.cos(t * 18), 330, ix + yon * genis * Math.cos(t * 18), 360, ix, 378); ctx.stroke();
      }
      cizgi(); ctx.beginPath(); ctx.ellipse(ix, 380, 30, 6, 0, 0, Math.PI * 2); ctx.stroke();
      const gez = t * 14;
      ctx.fillStyle = R.ciz; ctx.beginPath(); ctx.arc(ix + Math.cos(gez) * 30, 380 + Math.sin(gez) * 6, 2.5, 0, Math.PI * 2); ctx.fill();
      /* masura: sarılmış kırmızı iplik katları döner */
      ctx.save();
      yol([[ix - 8, 370], [ix + 8, 370], [ix + 16, 438], [ix - 16, 438]]); ctx.closePath(); ctx.fillStyle = '#7d2f35'; ctx.fill(); ctx.clip();
      ctx.strokeStyle = 'rgba(226, 88, 90, .8)'; ctx.lineWidth = lw(1.2);
      for (let i = -6; i < 14; i++) { const y = 370 + ((i * 6 + t * 40) % 72); ctx.beginPath(); ctx.moveTo(ix - 18, y); ctx.lineTo(ix + 18, y - 5); ctx.stroke(); }
      ctx.restore();
      cizgi(); yol([[ix - 8, 370], [ix + 8, 370], [ix + 16, 438], [ix - 16, 438]]); ctx.closePath(); ctx.stroke();
      kutu(ix - 3, 438, 6, 20, R.ciz); kutu(ix - 40, 458, 80, 12, R.dolgu2);
      iplik(() => egri([ix + 14, 410], [520, 400], [560, 310], [600, 300]), 2);
    },

    /* 03 çözgü: cağlık (bobin rafı) → tarak → levent */
    function cozgu() {
      kutu(40, 220, 150, 250, R.dolgu);
      const satir = [252, 302, 352, 402], sutun = [70, 110, 150];
      const uclar = [];
      for (const y of satir) for (const x of sutun) {
        const kirmizi = y === 302 && x === 150;
        yol([[x - 9, y - 12], [x + 9, y - 12], [x + 13, y + 12], [x - 13, y + 12]]); ctx.closePath();
        ctx.fillStyle = kirmizi ? '#9b3539' : R.ham; ctx.fill(); cizgi(); ctx.stroke();
        uclar.push([x + 13, y, kirmizi]);
      }
      iplik(() => egri([0, 300], [40, 300], [80, 270], [150, 290]), 1.6);
      /* teller: bobinlerden tarağa, taraktan levende */
      const tx = 330, lx = 470, ly = 330, lr = 64;
      uclar.forEach(([x, y, kirmizi], n) => {
        const ty = 270 + n * 6;
        const ust = ly - lr + n * 1.2;
        if (kirmizi) {
          iplik(() => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(lx, ust); }, 1.6);
        } else {
          cizgi(R.ince, 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(lx, ust); ctx.stroke();
        }
      });
      /* genişleyen tarak */
      kutu(tx - 4, 252, 8, 96, R.dolgu2);
      cizgi(R.ince, 1); for (let y = 256; y < 346; y += 5) { ctx.beginPath(); ctx.moveTo(tx - 4, y); ctx.lineTo(tx + 4, y); ctx.stroke(); }
      /* levent: sarılı katlar */
      ctx.beginPath(); ctx.arc(lx, ly, lr + 8, 0, Math.PI * 2); ctx.fillStyle = R.dolgu; ctx.fill(); cizgi(R.ince, 1); ctx.stroke();
      ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fillStyle = R.ham; ctx.fill(); cizgi(); ctx.stroke();
      ctx.strokeStyle = 'rgba(22, 26, 46, .25)'; ctx.lineWidth = lw(1);
      for (let r = 28; r < lr; r += 5) { ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.4); ctx.beginPath(); ctx.arc(lx, ly, lr - 3, t * 2, t * 2 + 1.2); ctx.stroke();
      silindir(lx, ly, 22, t * 2, R.dolgu2, 6);
      kutu(lx - 60, 440, 120, 30, R.dolgu2);
      yol([[lx - 40, 440], [lx, ly], [lx + 40, 440]]); cizgi(R.ince, 1); ctx.stroke();
      iplik(() => egri([lx + lr * 0.7, ly + lr * 0.7], [560, 420], [585, 320], [600, 300]), 1.8);
    },

    /* 04 dokuma: levent → gücü çerçeveleri (ağızlık) → tarak vuruşu → kumaş → top */
    function dokuma() {
      const faz = (t * 0.9) % 1;
      const agiz = azHareket ? 18 : 18 * Math.sin(faz * Math.PI * 2);
      const vurus = azHareket ? 0 : Math.max(0, Math.sin((faz - 0.25) * Math.PI * 4)) * (faz > 0.25 && faz < 0.5 ? 1 : 0);
      /* gövde */
      cizgi(R.ince, 1.2);
      yol([[60, 470], [80, 230], [520, 230], [540, 470]]); ctx.stroke();
      kutu(70, 226, 470, 8, R.dolgu2);
      /* çözgü levendi */
      iplik(() => egri([0, 300], [30, 300], [50, 360], [86, 380]), 1.6);
      silindir(100, 400, 38, -t * 0.4, R.dolgu2, 6);
      ctx.beginPath(); ctx.arc(100, 400, 30, 0, Math.PI * 2); ctx.fillStyle = R.ham; ctx.fill();
      silindir(100, 400, 12, -t * 0.4, R.dolgu, 4);
      silindir(150, 300, 9, t, R.dolgu2, 3);
      const cer1 = 250, cer2 = 300, agizX = 420;
      /* çözgü tabakası: iki takım */
      for (let n = 0; n < 6; n++) {
        const d = n * 1.6;
        const y1 = 300 - agiz + d - 4, y2 = 300 + agiz + d - 4;
        cizgi(R.ince, 1);
        ctx.beginPath(); ctx.moveTo(130, 384 - n * 4); ctx.lineTo(150, 300 + d - 4); ctx.lineTo(cer1, y1); ctx.lineTo(agizX, 300); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(150, 300 + d - 4); ctx.lineTo(cer2, y2); ctx.lineTo(agizX, 300); ctx.stroke();
      }
      iplik(() => yol([[86, 380], [150, 296], [cer1, 296 - agiz], [agizX, 300]]), 1.6);
      /* gücü çerçeveleri */
      for (const [x, y] of [[cer1, -agiz], [cer2, agiz]]) {
        kutu(x - 4, 236 + y, 8, 128, R.dolgu2);
        cizgi(R.ince, 1); for (let yy = 246 + y; yy < 356 + y; yy += 7) { ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x + 4, yy); ctx.stroke(); }
      }
      /* tarak (vurgu) */
      const tx = 395 + vurus * 22;
      cizgi(); ctx.beginPath(); ctx.moveTo(tx, 250); ctx.lineTo(tx, 350); ctx.stroke();
      cizgi(R.ince, 1); for (let y = 254; y < 348; y += 4) { ctx.beginPath(); ctx.moveTo(tx - 3, y); ctx.lineTo(tx + 3, y); ctx.stroke(); }
      kutu(tx - 6, 350, 12, 6, R.ciz);
      cizgi(R.ince, 1); ctx.beginPath(); ctx.moveTo(tx, 356); ctx.lineTo(395, 470); ctx.stroke();
      /* atkı atımı: ağızlıkta parlayan nokta */
      if (!azHareket && faz < 0.25) {
        const s = faz / 0.25;
        ctx.fillStyle = `rgba(243, 238, 228, ${Math.sin(s * Math.PI)})`;
        ctx.beginPath(); ctx.ellipse(408, 300, 3 + 6 * Math.sin(s * Math.PI), 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      /* kumaş → göğüs levendi → kumaş topu */
      const topR = 30 + ((t * 0.6) % 6);
      serit(() => yol([[agizX, 300], [490, 300], [500, 312], [475 + topR, 420]]), R.ham, 10);
      ctx.beginPath(); ctx.arc(475, 420, topR, 0, Math.PI * 2); ctx.fillStyle = R.ham; ctx.fill(); cizgi(); ctx.stroke();
      ctx.strokeStyle = 'rgba(22, 26, 46, .22)'; ctx.lineWidth = lw(1); for (let r = 10; r < topR; r += 4) { ctx.beginPath(); ctx.arc(475, 420, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.4); ctx.beginPath(); ctx.arc(475, 420, topR - 2, -t * 1.5, -t * 1.5 + 1); ctx.stroke();
      serit(() => egri([475 + topR, 420], [540, 420], [570, 310], [600, 300]), R.ham, 10);
    },

    /* 05 boya ve apre: banyo → sıkma silindirleri → ramöz (kurutma) */
    function boya() {
      serit(() => yol([[0, 300], [70, 300], [125, 440]]), R.ham, 10);
      serit(() => yol([[200, 440], [255, 316]]), R.boya, 10);
      /* banyo teknesi */
      kutu(90, 380, 150, 90, R.dolgu2);
      ctx.save(); ctx.beginPath(); ctx.rect(92, 382, 146, 86); ctx.clip();
      ctx.fillStyle = R.boya; ctx.beginPath(); ctx.moveTo(92, 470);
      for (let x = 92; x <= 238; x += 4) ctx.lineTo(x, 404 + Math.sin(x * 0.08 + t * 3) * 3);
      ctx.lineTo(238, 470); ctx.closePath(); ctx.fill();
      ctx.restore();
      serit(() => yol([[125, 440], [200, 440]]), R.boya, 10);
      silindir(125, 440, 9, t * 2, R.dolgu, 3); silindir(200, 440, 9, t * 2, R.dolgu, 3); silindir(70, 300, 9, t * 2, R.dolgu2, 3);
      /* damlalar */
      for (let i = 0; i < 4; i++) {
        const s = (t * 0.9 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(74, 92, 168, ${1 - s})`;
        ctx.beginPath(); ctx.arc(230 + i * 5, 360 + s * 40, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      /* sıkma silindirleri */
      silindir(266, 292, 22, -t * 2, R.dolgu2, 6); silindir(266, 340, 22, t * 2, R.dolgu2, 6);
      kutu(236, 362, 60, 108, R.dolgu);
      /* ramöz: sıcak hava kutusu */
      kutu(310, 236, 230, 128, R.dolgu);
      for (let x = 330; x < 530; x += 40) { kutu(x, 236, 22, 8, R.dolgu2, R.ince); }
      ctx.save(); ctx.beginPath(); ctx.rect(312, 246, 226, 116); ctx.clip();
      ctx.strokeStyle = 'rgba(226, 88, 90, .35)'; ctx.lineWidth = lw(1.2);
      for (let n = 0; n < 6; n++) {
        const x0 = 330 + n * 36;
        ctx.beginPath();
        for (let y = 360; y > 246; y -= 4) {
          const x = x0 + Math.sin(y * 0.09 + t * 4 + n) * 4;
          y === 360 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      serit(() => yol([[288, 316], [600, 316]]), R.laci, 10);
      cizgi(R.ince, 1); for (const x of [340, 400, 460, 520]) { ctx.beginPath(); ctx.moveTo(x, 324); ctx.lineTo(x, 470); ctx.stroke(); }
      kutu(300, 362, 240, 8, R.dolgu2);
    },

    /* 06 laboratuvar: çekme cihazı + kuvvet–uzama ekranı */
    function laboratuvar() {
      serit(() => yol([[0, 316], [40, 316], [80, 462], [530, 462], [580, 316], [600, 316]]), R.laci, 10);
      /* kumaştan numune kesimi */
      ctx.save(); ctx.setLineDash([lw(4), lw(3)]); ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.2);
      ctx.strokeRect(258, 452, 34, 20); ctx.setLineDash([]);
      const ac = azHareket ? 0.3 : 0.25 + 0.2 * Math.sin(t * 6);
      ctx.translate(250, 440); ctx.strokeStyle = R.ciz; ctx.lineWidth = lw(1.4);
      for (const yon of [1, -1]) {
        ctx.save(); ctx.rotate(yon * ac);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(-7, 0, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      const faz = azHareket ? 0.7 : (t / 5) % 1;
      const e = Math.min(faz / 0.8, 1);           /* uzama */
      const koptu = e >= KOPMA;
      const uzama = e * 46;
      /* cihaz */
      kutu(70, 410, 190, 40, R.dolgu2);
      kutu(86, 170, 12, 240, R.dolgu); kutu(232, 170, 12, 240, R.dolgu);
      kutu(70, 158, 190, 14, R.dolgu2);
      const ustCene = 214 - uzama;
      kutu(86, ustCene - 14, 158, 12, R.dolgu2);
      kutu(146, ustCene - 2, 38, 22, R.dolgu2);
      kutu(146, 360, 38, 22, R.dolgu2);
      /* numune şeridi */
      const ust = ustCene + 20, alt = 360;
      const daral = e * 4;
      const ciz = (y0, y1, kirik) => {
        ctx.beginPath();
        ctx.moveTo(152, y0); ctx.lineTo(178, y0);
        ctx.quadraticCurveTo(178 - daral, (y0 + y1) / 2, 178, y1);
        if (kirik) { for (let x = 178; x >= 152; x -= 4) ctx.lineTo(x, y1 + ((x / 4) % 2 ? 4 : -2)); }
        else ctx.lineTo(152, y1);
        ctx.quadraticCurveTo(152 + daral, (y0 + y1) / 2, 152, y0);
        ctx.closePath(); ctx.fillStyle = R.laci; ctx.fill(); cizgi(R.ince, 1); ctx.stroke();
      };
      if (!koptu) {
        ciz(ust, alt, false);
        iplik(() => yol([[165, ust], [165, alt]]), 1.6);
      } else {
        const geri = Math.min(1, (faz - KOPMA * 0.8) * 8) * 10;
        const orta = (ust + alt) / 2;
        ctx.save(); ctx.translate(0, -geri); ciz(ust, orta - 3, true); ctx.restore();
        ctx.save(); ctx.translate(0, geri); ctx.beginPath(); ctx.rect(140, orta + 3, 60, alt); ctx.clip(); ciz(orta + 3, alt, false); ctx.restore();
        iplik(() => yol([[165, ust - geri], [165, orta - 4 - geri]]), 1.6);
        iplik(() => yol([[165, orta + 4 + geri], [165, alt]]), 1.6);
      }
      /* ekran */
      kutu(300, 210, 220, 150, R.dolgu2);
      kutu(312, 222, 196, 126, '#141a3a', R.ince);
      cizgi(R.ince, 1); yol([[326, 236], [326, 334], [498, 334]]); ctx.stroke();
      ctx.fillStyle = R.ince; ctx.font = `500 9px "JetBrains Mono", monospace`; ctx.textAlign = 'left';
      ctx.fillText('F', 316, 242); ctx.fillText('ε', 492, 344);
      ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.8); ctx.beginPath();
      const son = Math.min(e, 0.95);
      for (let s = 0; s <= son + 1e-6; s += 0.01) {
        const x = 326 + s * 170, y = 334 - cekmeEgrisi(s) * 88;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      const sx = 326 + son * 170, sy = 334 - cekmeEgrisi(son) * 88;
      ctx.fillStyle = R.kirmizi; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      kutu(380, 360, 60, 30, R.dolgu2); kutu(350, 390, 120, 8, R.dolgu2);
    },

    /* 07 kalite kontrol: ışıklı eğik muayene masası, hata işaretleme */
    function kalite() {
      serit(() => yol([[0, 316], [60, 316], [130, 452]]), R.laci, 10);
      /* ışık masası */
      const A = [140, 452], B = [330, 222];
      ctx.save();
      const isik = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
      isik.addColorStop(0, 'rgba(243, 238, 228, .10)'); isik.addColorStop(0.5, 'rgba(243, 238, 228, .38)'); isik.addColorStop(1, 'rgba(243, 238, 228, .10)');
      yol([[A[0] - 20, A[1]], [B[0] - 20, B[1]], [B[0] + 20, B[1]], [A[0] + 20, A[1]]]); ctx.closePath(); ctx.fillStyle = isik; ctx.fill();
      ctx.restore();
      cizgi(); yol([[A[0] - 22, A[1] + 4], [B[0] - 22, B[1] - 4]]); ctx.stroke(); yol([[A[0] + 22, A[1] + 4], [B[0] + 22, B[1] - 4]]); ctx.stroke();
      /* kumaş masa üstünde geniş görünür */
      serit(() => yol([[A[0], A[1]], [B[0], B[1]]]), R.laci, 26);
      silindir(A[0], A[1], 11, t * 3, R.dolgu2, 4); silindir(B[0], B[1], 11, t * 3, R.dolgu2, 4);
      /* hata: kumaşla birlikte yukarı akar, ortada işaretlenir */
      const s = azHareket ? 0.62 : (t * 0.18) % 1;
      const hx = A[0] + (B[0] - A[0]) * s, hy = A[1] + (B[1] - A[1]) * s;
      ctx.fillStyle = 'rgba(14, 18, 41, .9)'; ctx.beginPath(); ctx.ellipse(hx + 6, hy, 3.5, 2.2, -0.9, 0, Math.PI * 2); ctx.fill();
      if (s > 0.5) {
        ctx.fillStyle = R.kirmizi; ctx.beginPath(); ctx.arc(hx - 6, hy - 6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1); ctx.beginPath(); ctx.moveTo(hx - 6, hy - 6); ctx.lineTo(hx - 36, hy - 40); ctx.stroke();
        ctx.fillStyle = R.kirmizi; ctx.font = '700 10px "JetBrains Mono", monospace'; ctx.textAlign = 'right'; ctx.fillText('!', hx - 38, hy - 44);
      }
      /* lamba */
      kutu(212, 140, 8, 40, R.dolgu2);
      yol([[196, 180], [236, 180], [228, 192], [204, 192]]); ctx.closePath(); ctx.fillStyle = R.dolgu2; ctx.fill(); cizgi(); ctx.stroke();
      ctx.fillStyle = 'rgba(243, 238, 228, .06)'; yol([[204, 192], [228, 192], [300, 330], [150, 330]]); ctx.closePath(); ctx.fill();
      /* gövde ayakları */
      cizgi(R.ince, 1.2); yol([[110, 470], [150, 452]]); ctx.stroke(); yol([[350, 470], [330, 230]]); ctx.stroke();
      /* sarma */
      serit(() => egri([B[0], B[1]], [380, 200], [420, 300], [440, 392]), R.laci, 10);
      const r = 34 + ((t * 0.5) % 6);
      ctx.beginPath(); ctx.arc(462, 420, r, 0, Math.PI * 2); ctx.fillStyle = R.laci; ctx.fill(); cizgi(); ctx.stroke();
      ctx.strokeStyle = 'rgba(14, 18, 41, .3)'; ctx.lineWidth = lw(1); for (let rr = 10; rr < r; rr += 4) { ctx.beginPath(); ctx.arc(462, 420, rr, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.4); ctx.beginPath(); ctx.arc(462, 420, r - 2, -t * 1.5, -t * 1.5 + 1); ctx.stroke();
      serit(() => egri([462 + r, 420], [540, 420], [570, 316], [600, 316]), R.laci, 10);
    },

    /* 08 sevkiyat: top sarma, etiketli toplar paletde, kamyon */
    function sevkiyat() {
      serit(() => egri([0, 316], [50, 316], [80, 360], [100, 386]), R.laci, 10);
      const r = 30 + ((t * 0.7) % 1) * 18;
      ctx.beginPath(); ctx.arc(130, 418, r, 0, Math.PI * 2); ctx.fillStyle = R.laci; ctx.fill(); cizgi(); ctx.stroke();
      ctx.strokeStyle = 'rgba(14, 18, 41, .3)'; ctx.lineWidth = lw(1); for (let rr = 8; rr < r; rr += 4) { ctx.beginPath(); ctx.arc(130, 418, rr, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.4); ctx.beginPath(); ctx.arc(130, 418, r - 2, -t * 2, -t * 2 + 1.2); ctx.stroke();
      silindir(130, 418, 7, t, R.dolgu2, 3);
      /* palet ve toplar */
      kutu(214, 455, 200, 12, R.dolgu2);
      for (const x of [226, 300, 390]) kutu(x - 6, 467, 12, 3, R.ciz);
      const toplar = [[254, 422], [314, 422], [374, 422], [284, 362], [344, 362]];
      toplar.forEach(([x, y], i) => {
        ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? '#3d4f9a' : R.laci; ctx.fill(); cizgi(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = R.dolgu; ctx.fill(); cizgi(R.ince, 1); ctx.stroke();
        ctx.strokeStyle = R.kirmizi; ctx.lineWidth = lw(1.4); ctx.beginPath(); ctx.arc(x, y, 27, 0.4, 1.2); ctx.stroke();
      });
      /* etiket: barkod + kırmızı şerit, hafifçe sallanır */
      const sal = azHareket ? 0 : Math.sin(t * 2.2) * 0.08;
      ctx.save(); ctx.translate(344, 334); ctx.rotate(sal);
      cizgi(R.ince, 1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -28); ctx.stroke();
      ctx.fillStyle = R.ham; ctx.fillRect(-22, -64, 44, 36);
      ctx.fillStyle = R.kirmizi; ctx.fillRect(-22, -64, 44, 6);
      ctx.fillStyle = '#161a2e';
      for (let i = 0; i < 16; i++) ctx.fillRect(-18 + i * 2.3, -52, (i * 7) % 3 === 0 ? 1.6 : 0.8, 16);
      ctx.restore();
      /* kamyon */
      const yolcu = cam.etkin === 7 && !azHareket ? Math.min(1, Math.max(0, (t - muhurZamani[7] - 1.2) / 2.4)) : 0;
      const kx = 440 + yolcu * yolcu * 220, sars = azHareket ? 0 : Math.sin(t * 20) * 0.6;
      ctx.save(); ctx.translate(0, sars);
      kutu(kx, 330, 110, 100, R.dolgu2);
      yol([[kx + 110, 360], [kx + 140, 360], [kx + 156, 392], [kx + 156, 430], [kx + 110, 430]]); ctx.closePath(); ctx.fillStyle = R.dolgu; ctx.fill(); cizgi(); ctx.stroke();
      kutu(kx + 118, 368, 22, 20, '#2f3a6e', R.ince);
      ctx.fillStyle = R.kirmizi; ctx.fillRect(kx, 412, 110, 3);
      ctx.restore();
      for (const x of [kx + 26, kx + 128]) silindir(x, 440, 14, t * 4 + yolcu * 20, R.dolgu, 4);
      /* yüklenen toplar kamyon kasasında */
      if (yolcu > 0) { ctx.save(); ctx.beginPath(); ctx.rect(kx, 330, 110, 100); ctx.clip(); for (const [x, y] of [[kx + 30, 400], [kx + 80, 400], [kx + 55, 356]]) { ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fillStyle = R.laci; ctx.fill(); cizgi(R.ince, 1); ctx.stroke(); } ctx.restore(); }
    },
  ];

  function arkaPlan(sol, sag) {
    /* teknik çizim ızgarası (kamerayla yarı hızda kayar) */
    ctx.fillStyle = R.silik;
    const adim = 40, kay = (cam.x * 0.5) % adim;
    for (let x = Math.floor(sol / adim) * adim; x < sag + adim; x += adim) {
      for (let y = UST; y < ALT; y += adim) ctx.fillRect(x + kay - 1, y, lw(1.5), lw(1.5));
    }
    /* zemin ve mezura çentikleri */
    cizgi(R.ince, 1);
    ctx.beginPath(); ctx.moveTo(sol, ZEMIN); ctx.lineTo(sag, ZEMIN); ctx.stroke();
    for (let x = Math.floor(sol / 20) * 20; x < sag; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, ZEMIN); ctx.lineTo(x, ZEMIN + (x % 100 === 0 ? 9 : 4)); ctx.stroke();
    }
  }

  /* hattın başı: hammadde getiren kamyon (sondaki sevkiyat kamyonunun aynası) */
  function girisKamyonu() {
    const kx = -330;
    kutu(kx + 46, 330, 130, 100, R.dolgu2);
    yol([[kx + 46, 360], [kx + 16, 360], [kx, 392], [kx, 430], [kx + 46, 430]]); ctx.closePath(); ctx.fillStyle = R.dolgu; ctx.fill(); cizgi(); ctx.stroke();
    kutu(kx + 14, 368, 22, 20, '#2f3a6e', R.ince);
    /* açık kasada balyalar */
    for (const [x, y] of [[kx + 56, 384], [kx + 112, 384], [kx + 84, 338]]) {
      kutu(x, y, 52, 44, R.ham, R.ciz);
      ctx.strokeStyle = '#4a5ca8'; ctx.lineWidth = lw(2); for (const s of [0.3, 0.7]) { ctx.beginPath(); ctx.moveTo(x + 52 * s, y); ctx.lineTo(x + 52 * s, y + 44); ctx.stroke(); }
    }
    for (const x of [kx + 30, kx + 140]) silindir(x, 440, 14, 0, R.dolgu, 4);
    /* rampa */
    cizgi(R.ince, 1); yol([[kx + 176, 430], [-20, ZEMIN]]); ctx.stroke();
  }

  let cam = { x: S / 2, etkin: 0 };
  function ciz() {
    cam = kamera(p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, tuval.width, tuval.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (G / 2 - cam.x * k), dpr * oy);
    const yarim = G / 2 / k;
    const sol = cam.x - yarim, sag = cam.x + yarim;
    const T = OLC ? performance.now() : 0;
    arkaPlan(sol, sag);
    if (OLC) olc('arkaPlan', T);
    if (sol < 0) {
      girisKamyonu();
      const uzak = Math.min(1, Math.abs(-240 - cam.x) / S);       /* kamyon da spot ışığına uyar */
      ctx.fillStyle = `rgba(21, 27, 56, ${(0.5 * uzak * uzak * (3 - 2 * uzak)).toFixed(3)})`; ctx.fillRect(-S, UST, S, ALT - UST);
    }
    for (let i = 0; i < ADIM; i++) {
      const x0 = i * S;
      if (x0 + S < sol - 20 || x0 > sag + 20) continue;
      ctx.save(); ctx.translate(x0, 0); yerelX0 = x0;
      /* arka plan numarası */
      ctx.fillStyle = 'rgba(243, 238, 228, .045)';
      ctx.font = `300 ${230}px Fraunces, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const T1 = OLC ? performance.now() : 0;
      ctx.fillText(String(i + 1).padStart(2, '0'), S / 2, ZEMIN - 6);
      if (OLC) olc('numara', T1);
      const T2 = OLC ? performance.now() : 0;
      ISTASYON[i]();
      if (OLC) olc('ist' + (i + 1), T2);
      muhur(S / 2, 150, i);
      /* kontrol noktası: mührün sağında ne ölçüldüğü */
      const kp = kontrol[i];
      if (kp) {
        const a = i === cam.etkin ? Math.min(1, (t - muhurZamani[i]) / 0.4) : 0.35;
        ctx.save(); ctx.globalAlpha = azHareket ? (i === cam.etkin ? 1 : 0.35) : a;
        ctx.strokeStyle = i === cam.etkin ? R.kirmizi : R.pirinc; ctx.lineWidth = lw(1);
        ctx.fillStyle = i === cam.etkin ? 'rgba(243, 238, 228, .9)' : 'rgba(243, 238, 228, .45)';
        ctx.font = `500 ${lw(10.5)}px "JetBrains Mono", monospace`; ctx.textBaseline = 'middle';
        const etiket = buyuk(kp);
        if (G < 640) {          /* dar ekranda yanda yer yok: mührün altında ortalı */
          ctx.textAlign = 'center'; ctx.fillText(etiket, S / 2, 150 + 25 + lw(14));
        } else {
          ctx.setLineDash([lw(2), lw(3)]); ctx.beginPath(); ctx.moveTo(S / 2 + 30, 150); ctx.lineTo(S / 2 + 58, 150); ctx.stroke(); ctx.setLineDash([]);
          ctx.textAlign = 'left'; ctx.fillText(etiket, S / 2 + 64, 150);
        }
        ctx.restore();
      }
      ctx.fillStyle = i === cam.etkin ? 'rgba(243, 238, 228, .85)' : 'rgba(243, 238, 228, .4)';
      ctx.font = `500 ${lw(11)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center';
      ctx.fillText(`${String(i + 1).padStart(2, '0')} · ${buyuk(adlar[i])}`, S / 2, ZEMIN + lw(26));
      /* spot ışığı: kamera merkezinden uzaklaştıkça istasyon zemin rengine doğru kararır */
      const uzak = Math.min(1, Math.abs(x0 + S / 2 - cam.x) / S);
      if (uzak > 0.02) { ctx.fillStyle = `rgba(21, 27, 56, ${(0.5 * uzak * uzak * (3 - 2 * uzak)).toFixed(3)})`; ctx.fillRect(0, UST, S, ALT - UST); }
      ctx.restore();
    }
    kenarYumusat();
  }

  /* kenar yumuşatması: komşu makineler tuval kenarında sert kesilmesin. CSS maskesi yerine tuvalde (stil bütçesinde degrade
   * yeri yok); iki degrade yalnız genişlik değişince yeniden kurulur */
  let kenarG = null;
  function kenarYumusat() {
    const w = tuval.width, h = tuval.height;
    if (!kenarG || kenarG.w !== w) {
      const e = Math.round(Math.min(w * 0.08, 110 * dpr));
      const sol = ctx.createLinearGradient(0, 0, e, 0); sol.addColorStop(0, 'rgba(21, 27, 56, 1)'); sol.addColorStop(1, 'rgba(21, 27, 56, 0)');
      const sag = ctx.createLinearGradient(w - e, 0, w, 0); sag.addColorStop(0, 'rgba(21, 27, 56, 0)'); sag.addColorStop(1, 'rgba(21, 27, 56, 1)');
      kenarG = { w, e, sol, sag };
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = kenarG.sol; ctx.fillRect(0, 0, kenarG.e, h);
    ctx.fillStyle = kenarG.sag; ctx.fillRect(w - kenarG.e, 0, kenarG.e, h);
  }

  const adimlariGuncelle = () => adim.guncelle(p);

  function hedefOku() {
    const r = iz.getBoundingClientRect();
    pHedef = ilerlemeHesapla(r.top, r.height, innerHeight);
  }

  function kare(zm) {
    raf = 0;
    if (!calisiyor) return;
    const dt = son ? Math.min((zm - son) / 1000, 0.05) : 0.016;
    son = zm; t += dt;
    const hareket = Math.abs(pHedef - p) > 1e-4;
    p += (pHedef - p) * (1 - Math.exp(-dt / 0.09));
    adimlariGuncelle();
    /* kamera dururken 30 kare/sn yeter (makineler yavaş döner); kaydırırken her kare */
    atla = !hareket && !atla;
    if (!atla) ciz();
    raf = requestAnimationFrame(kare);
  }

  boyutla(); hedefOku(); p = pHedef; adimlariGuncelle(); ciz(); tuval.dataset.cizildi = '2b';
  addEventListener('scroll', () => { hedefOku(); if (azHareket) { p = pHedef; adimlariGuncelle(); ciz(); } }, { passive: true });   /* hedefOku ucuz: yalnız bir getBoundingClientRect */
  new ResizeObserver(() => { boyutla(); hedefOku(); ciz(); }).observe(tuval);
  if (!azHareket) {
    /* tek döngü kuralı: yalnız IO "görünür" ve sekme açıkken; rAF kimliği her durdurmada iptal */
    let ioGorunur = false;
    const baslat = () => { if (ioGorunur && !document.hidden && !calisiyor) { calisiyor = true; son = 0; if (!raf) raf = requestAnimationFrame(kare); } };
    const durdur = () => { calisiyor = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver((g) => { ioGorunur = g[g.length - 1].isIntersecting; ioGorunur ? baslat() : durdur(); }).observe(tuval);
    document.addEventListener('visibilitychange', () => (document.hidden ? durdur() : baslat()));
  }
}
