/* HARİTA — faaliyet coğrafyası kanaviçe (çarpı işi) olarak.
 *
 * Kara/su ve eğim ızgarası harita-veri.mjs'ten (NASA Visible Earth türevi maske; üreteç araclar/harita-maske.py).
 * Her kara hücresi bir çarpı ilmeği: düzlükte keten, dağda koyu kahve, kıyıda lacivert iplik. Su hücrelerinde
 * seyrek mavi teyel. Ülke sınırları (Natural Earth 1:50m) hücre kenarlarında kırmızı-kahve gizli dikiş; Türkiye ve beş Türk
 * cumhuriyeti tam tonda, öteki ülkeler soluk iplikle işlenir (faaliyet alanı kendiliğinden öne çıkar).
 * Rotalar ve etiketler HTML/SVG'dedir (index.html); bu modül yalnız kumaşı çizer ve vurgu etkileşimini kurar.
 *
 * Saf yardımcılar (çöz, izdüşüm, mesafe) dışa açıktır; araclar/dogrula.mjs Node'da sınar.
 */
import { MASKE } from './harita-veri.mjs';
import { sayi } from '../ceviri.mjs';

/** base64 → bayt dizisi (tarayıcı ve Node) */
function bayt(b64) {
  const s = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const d = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) d[i] = s.charCodeAt(i);
  return d;
}

/** Izgarayı çözer: kara[i] (0/1), egim[i] (0–3); i = satır * sütun + sütun. */
export function coz(m = MASKE) {
  const v = bayt(m.veri), e = bayt(m.egim), n = m.sutun * m.satir;
  const sn = m.sinir ? bayt(m.sinir) : null, hd = m.hedef ? bayt(m.hedef) : null;
  const kara = new Uint8Array(n), egim = new Uint8Array(n), sinir = new Uint8Array(n), hedef = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    kara[i] = (v[i >> 3] >> (7 - (i & 7))) & 1;
    egim[i] = (e[i >> 2] >> (6 - 2 * (i & 3))) & 3;
    if (sn) sinir[i] = (sn[i >> 2] >> (6 - 2 * (i & 3))) & 3;      /* 2 = sağ kenar, 1 = alt kenar */
    hedef[i] = hd ? (hd[i >> 3] >> (7 - (i & 7))) & 1 : 1;
  }
  return { kara, egim, sinir, hedef, sutun: m.sutun, satir: m.satir };
}

/** Boylam/enlem → ızgara birimi (hücre). */
export const izdusum = (lon, lat, m = MASKE) => [(lon - m.lon0) / m.dlon, (m.lat1 - lat) / m.dlat];

/** Büyük daire mesafesi (km), haversine; Dünya ortalama yarıçapı 6371,0088 km. */
export function mesafe([lat1, lon1], [lat2, lon2]) {
  const r = Math.PI / 180, R = 6371.0088;
  const h = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Çorlu ve başkentler (enlem, boylam), iki ondalık: İngilizce Vikipedi şehir maddelerinin koordinat satırından, 10 Ekim 2026'da okundu */
export const KONUM = { corlu: [41.15, 27.80], az: [40.38, 49.83], tm: [37.94, 58.38], uz: [41.31, 69.28], kg: [42.87, 74.61], kz: [51.13, 71.43] };

const RENK = {
  bez: '#f1eadb', delik: 'rgba(160, 140, 105, .28)', izgara: 'rgba(150, 128, 92, .22)',
  kara: ['#dacdb0', '#c7b694', '#ab9773', '#86745a'], soluk: ['#e7dfcc', '#ddd2bb', '#cfc1a5', '#bcab8c'], kiyi: '#283467', su: 'rgba(84, 112, 160, .55)', kenar: '#b8292b',
  sinir: '#8e2f2b',
};
/* tekrarlanabilir küçük ton farkı (her ilmek elde işlenmiş gibi) */
const h1 = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

function ciz(tuval, z) {
  const g = tuval.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = tuval.clientWidth, H = tuval.clientHeight;
  if (!W || !H) return;
  tuval.width = Math.round(W * dpr); tuval.height = Math.round(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = W / z.sutun;                      /* hücre kenarı (CSS px) */
  g.fillStyle = RENK.bez; g.fillRect(0, 0, W, H);

  /* kanaviçe delikleri (yalnız ilmek seçilebilecek büyüklükte) */
  if (s >= 4) {
    g.fillStyle = RENK.delik;
    for (let r = 0; r <= z.satir; r++) for (let c = 0; c <= z.sutun; c++) g.fillRect(c * s - 0.5, r * s - 0.5, 1, 1);
  }
  /* enlem/boylam teyeli: 10° boylam, 5° enlem */
  g.strokeStyle = RENK.izgara; g.lineWidth = 1; g.setLineDash([3, 4]);
  g.beginPath();
  for (let lon = 30; lon <= 80; lon += 10) { const [x] = izdusum(lon, 0); g.moveTo(x * s, 0); g.lineTo(x * s, H); }
  for (let lat = 35; lat <= 55; lat += 5) { const [, y] = izdusum(0, lat); g.moveTo(0, y * s); g.lineTo(W, y * s); }
  g.stroke(); g.setLineDash([]);

  const kara = (c, r) => c < 0 || r < 0 || c >= z.sutun || r >= z.satir ? 1 : z.kara[r * z.sutun + c];
  /* ilmekler renk kovalarında toplanır: her renk tek yol, tek çizim */
  const kova = new Map();
  const ekle = (renk, f) => { let p = kova.get(renk); if (!p) kova.set(renk, (p = new Path2D())); f(p); };
  const ic = s * 0.16, kalin = Math.max(0.9, s * 0.3);
  for (let r = 0; r < z.satir; r++) {
    for (let c = 0; c < z.sutun; c++) {
      const i = r * z.sutun + c, x = c * s, y = r * s;
      if (z.kara[i]) {
        const kiyi = !kara(c - 1, r) || !kara(c + 1, r) || !kara(c, r - 1) || !kara(c, r + 1);
        const renk = kiyi ? RENK.kiyi : (z.hedef[i] ? RENK.kara : RENK.soluk)[z.egim[i]];
        if (s < 3.2) { ekle(renk, (p) => p.rect(x, y, s, s)); continue; }   /* çok dar ekran: düz kare */
        ekle(renk, (p) => { p.moveTo(x + ic, y + ic); p.lineTo(x + s - ic, y + s - ic); p.moveTo(x + s - ic, y + ic); p.lineTo(x + ic, y + s - ic); });
      } else if (r % 2 === 0 && (c + (r >> 1)) % 3 === 0) {
        ekle(RENK.su, (p) => { p.moveTo(x + s * 0.15, y + s * 0.5); p.lineTo(x + s * 1.85, y + s * 0.5); });   /* teyel: iki hücre boyu */
      }
    }
  }
  g.lineCap = 'round';
  for (const [renk, p] of kova) {
    if (s < 3.2 && renk !== RENK.su) { g.fillStyle = renk; g.fill(p); continue; }
    g.strokeStyle = renk; g.lineWidth = renk === RENK.su ? Math.max(0.8, s * 0.16) : kalin; g.stroke(p);
  }
  /* ülke sınırları: hücre kenarı boyunca gizli dikiş (kısa ilmek, kısa ara) */
  const sinir = new Path2D();
  for (let r = 0; r < z.satir; r++) for (let c = 0; c < z.sutun; c++) {
    const b = z.sinir[r * z.sutun + c];
    if (b & 2) { sinir.moveTo((c + 1) * s, r * s); sinir.lineTo((c + 1) * s, (r + 1) * s); }
    if (b & 1) { sinir.moveTo(c * s, (r + 1) * s); sinir.lineTo((c + 1) * s, (r + 1) * s); }
  }
  g.strokeStyle = RENK.sinir; g.lineWidth = Math.max(1.1, s * 0.2); g.lineCap = 'butt';
  g.setLineDash([Math.max(2, s * 0.62), Math.max(1.5, s * 0.38)]); g.stroke(sinir); g.setLineDash([]); g.lineCap = 'round';
  /* ilmek ışığı: her çarpının üst kolunda ince açık iz (iplik parlaklığı), tona göre seyrek */
  if (s >= 4) {
    g.strokeStyle = 'rgba(255, 252, 240, .28)'; g.lineWidth = Math.max(0.5, s * 0.08);
    g.beginPath();
    for (let r = 0; r < z.satir; r++) for (let c = 0; c < z.sutun; c++) {
      const i = r * z.sutun + c;
      if (!z.kara[i] || h1(i) < 0.35) continue;
      const x = c * s, y = r * s;
      g.moveTo(x + s - ic * 1.4, y + ic * 1.4); g.lineTo(x + s * 0.55, y + s * 0.45);
    }
    g.stroke();
  }
  /* kenar: kumaş kenarında kırmızı teyel */
  g.strokeStyle = RENK.kenar; g.globalAlpha = 0.55; g.lineWidth = 1.2; g.setLineDash([6, 5]);
  g.strokeRect(7.5, 7.5, W - 15, H - 15);
  g.setLineDash([]); g.globalAlpha = 1;
}

export function haritaKur(kok, { azHareket = false } = {}) {
  const tuval = kok.querySelector('.harita__tuval');
  const z = coz();
  const sahneEl = kok.querySelector('.harita__sahne');
  /* telefonda harita yatay kayar: o zaman klavyeyle de odaklanıp oklarla kaydırılabilsin */
  const yenile = () => { ciz(tuval, z); sahneEl.tabIndex = sahneEl.scrollWidth > sahneEl.clientWidth + 2 ? 0 : -1; };
  yenile();
  let son = tuval.clientWidth;
  new ResizeObserver(() => { if (Math.abs(tuval.clientWidth - son) > 1) { son = tuval.clientWidth; yenile(); } }).observe(tuval);
  matchMedia('(resolution: 1dppx), (resolution: 2dppx)').addEventListener?.('change', yenile);

  /* vurgu: listede ya da haritada bir ülkenin üstüne gelince onun ipliği öne çıkar, ötekiler soluklaşır */
  const sec = (u) => {
    kok.classList.toggle('harita--secim', !!u);
    for (const el of kok.querySelectorAll('[data-ulke]')) el.classList.toggle('etkin', el.dataset.ulke === u);
  };
  for (const el of kok.querySelectorAll('[data-ulke]')) {
    el.addEventListener('pointerenter', () => sec(el.dataset.ulke));
    el.addEventListener('pointerleave', () => sec(null));
  }
  /* mesafe rakamları dile göre biçimlenir (HTML'de Türkçe biçimle yazılı) */
  const kmYaz = () => kok.querySelectorAll('[data-km]').forEach((el) => { el.textContent = sayi(+el.dataset.km); });
  kmYaz(); document.addEventListener('dil-degisti', kmYaz);
  if (azHareket) kok.classList.add('gorundu');
  return { yenile };
}
