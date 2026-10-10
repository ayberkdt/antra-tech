/* ÖRGÜ ATÖLYESİ — desen kâğıdında örgü raporu çiz, kumaşı canlı gör, mühendislik analizini oku.
 *
 * Desen kâğıdı en çok 8 × 8 hücre (hazır 2/1 dimi 6 × 6, saten 5 × 5): dolu kare = çözgü üstte (dokuma tasarımında "işaretli" kare).
 * Rapor kumaşta tekrar edilir; önizleme numune.mjs'in iplik çizicisini kullanır.
 * Analiz (saf, Node'da sınanır): çözgü yüzü oranı, en uzun çözgü/atkı atlaması (döngüsel),
 * bağlantısız satır/sütun (iplik kumaşa bağlanmaz), en küçük rapor.
 * Erişilebilirlik: desen kâğıdı odaklanabilir tuval; ok tuşları imleci gezdirir, Boşluk/Enter
 * hücreyi çevirir, değişiklik canlı bölgede okunur.
 */
import { kumasCiz, lupKur } from './numune.mjs';
import { metin, yuzde as yuzdeYaz } from '../ceviri.mjs';

export const N = 8;

/** Hazır raporlar: (i sütun/çözgü, j satır/atkı) → çözgü üstte mi */
export const HAZIR = {
  bez: (i, j) => (i + j) % 2 === 0,
  dimi21: (i, j) => ((i - j) % 3 + 3) % 3 < 2,
  dimi22: (i, j) => ((i - j) % 4 + 4) % 4 < 2,
  saten: (i, j) => ((2 * i - j) % 5 + 5) % 5 === 0,
  sepet: (i, j) => (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0,
};
export function hazirMatris(ad, n = N) {
  /* 3'lü ve 5'li raporlar 8'e bölünmez: kâğıt, rapor boyunun katına kırpılır */
  const boy = ad === 'dimi21' ? 6 : ad === 'saten' ? 5 : n;
  return Array.from({ length: boy }, (_, j) => Array.from({ length: boy }, (_, i) => HAZIR[ad](i, j)));
}

/** En uzun döngüsel ardışık dizi (değer = d); hepsi d ise Infinity */
function enUzun(dizi, d) {
  const n = dizi.length;
  if (dizi.every((v) => v === d)) return Infinity;
  let en = 0, say = 0;
  for (let k = 0; k < 2 * n; k++) { if (dizi[k % n] === d) { say++; en = Math.max(en, say); } else say = 0; }
  return Math.min(en, n);
}
/** Matris için en küçük dönem (yatay ve dikey) */
function donem(m) {
  const h = m.length, w = m[0].length;
  const yatay = [...Array(w)].map((_, k) => k + 1).find((p) => w % p === 0 && m.every((s) => s.every((v, i) => v === s[i % p])));
  const dikey = [...Array(h)].map((_, k) => k + 1).find((p) => h % p === 0 && m.every((s, j) => s.every((v, i) => v === m[j % p][i])));
  return [yatay, dikey];
}
/** m[j][i] (true = çözgü üstte) → analiz */
export function analiz(m) {
  const h = m.length, w = m[0].length;
  let ust = 0;
  for (const s of m) for (const v of s) if (v) ust++;
  const sutun = (i) => m.map((s) => s[i]);
  const cozguAtlama = Math.max(...[...Array(w)].map((_, i) => enUzun(sutun(i), true)));
  const atkiAtlama = Math.max(...m.map((s) => enUzun(s, false)));
  const bagsizSutun = [...Array(w)].map((_, i) => i).filter((i) => { const c = sutun(i); return c.every(Boolean) || c.every((v) => !v); });
  const bagsizSatir = m.map((s, j) => j).filter((j) => m[j].every(Boolean) || m[j].every((v) => !v));
  const [rx, ry] = donem(m);
  return { cozguYuzu: ust / (w * h), cozguAtlama, atkiAtlama, bagsizSutun, bagsizSatir, rapor: [rx, ry] };
}

/** Tahar ve armür planı: aynı kalkış dizisine sahip çözgüler aynı gücü çerçevesine taharlanır (ilk görülme sırasıyla).
 *  tahar[i] = i. çözgünün çerçevesi · plan[j][c] = j. atkıda c. çerçeve kalkık mı · cerceve = gereken çerçeve sayısı */
export function armurPlani(m) {
  const w = m[0].length, anahtarlar = [], tahar = [];
  for (let i = 0; i < w; i++) {
    const k = m.map((s) => (s[i] ? 1 : 0)).join('');
    let c = anahtarlar.indexOf(k);
    if (c < 0) { c = anahtarlar.length; anahtarlar.push(k); }
    tahar.push(c);
  }
  const plan = m.map((_, j) => anahtarlar.map((k) => k[j] === '1'));
  return { tahar, plan, cerceve: anahtarlar.length };
}

const RENKLER = {
  lacivert: { cozgu: '#24305e', atki: '#e7dfcd' },
  haki: { cozgu: '#5b6142', atki: '#2a2b22' },
  ham: { cozgu: '#ece5d4', atki: '#d9cfb9' },
  kirmizi: { cozgu: '#b8292b', atki: '#1f2850' },
};

export function atolyeKur(kok) {
  const kagit = kok.querySelector('#atolye-kagit');
  const onizleme = kok.querySelector('#atolye-onizleme');
  const sonuc = kok.querySelector('#atolye-analiz');
  const uyari = kok.querySelector('#atolye-uyari');
  const canli = kok.querySelector('#atolye-canli');
  let dpr = Math.min(devicePixelRatio || 1, 2);   /* çizimlerde yenilenir: yakınlaştırmada bulanıklaşmasın */
  let m = hazirMatris('dimi21');
  let renk = 'lacivert';
  let imlec = [0, 0], klavye = false;

  function kagitCiz() {
    const r = { width: kagit.clientWidth, height: kagit.clientHeight };
    dpr = Math.min(devicePixelRatio || 1, 2);
    kagit.width = Math.round(r.width * dpr); kagit.height = Math.round(r.height * dpr);
    const c = kagit.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = m.length, h = r.width / n;
    c.fillStyle = '#fbf8f2'; c.fillRect(0, 0, r.width, r.height);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      if (m[j][i]) { c.fillStyle = '#1f2850'; c.fillRect(i * h + 2, j * h + 2, h - 4, h - 4); }
    }
    /* desen kâğıdı çizgileri: ince her hücrede, kalın rapor sınırında */
    c.strokeStyle = 'rgba(184, 41, 43, .35)'; c.lineWidth = 1;
    for (let k = 0; k <= n; k++) {
      c.beginPath(); c.moveTo(k * h + 0.5, 0); c.lineTo(k * h + 0.5, r.height); c.stroke();
      c.beginPath(); c.moveTo(0, k * h + 0.5); c.lineTo(r.width, k * h + 0.5); c.stroke();
    }
    c.strokeStyle = 'rgba(184, 41, 43, .9)'; c.lineWidth = 2; c.strokeRect(1, 1, r.width - 2, r.height - 2);
    if (klavye) { c.strokeStyle = '#b8292b'; c.lineWidth = 3; c.strokeRect(imlec[0] * h + 2.5, imlec[1] * h + 2.5, h - 5, h - 5); }
  }

  const kumasTanimi = () => {
    const n = m.length;
    return { orgu: (i, j) => m[((j % n) + n) % n][((i % n) + n) % n], rapor: [n, n], P: 9, ...RENKLER[renk], golge: renk === 'ham' ? 0.5 : 1 };
  };
  const lup = lupKur(kok.querySelector('#atolye-lup-kap'), kumasTanimi);

  /* önizleme: kumaş bellekte çizilir; dok=true ise tezgâhtaki gibi alttan yukarı sıra sıra dokunarak belirir (420 ms) */
  const taban = document.createElement('canvas');
  const azHareket = document.documentElement.classList.contains('az') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dokuma = 0;
  function onizlemeCiz(dok = false) {
    const r = { width: onizleme.clientWidth, height: onizleme.clientHeight }; dpr = Math.min(devicePixelRatio || 1, 2);
    if (!r.width) return;
    onizleme.width = taban.width = Math.round(r.width * dpr); onizleme.height = taban.height = Math.round(r.height * dpr);
    kumasCiz(taban.getContext('2d'), kumasTanimi(), 0, 0, r.width, r.height, dpr);
    const c = onizleme.getContext('2d');
    cancelAnimationFrame(dokuma);
    if (!dok || azHareket) { c.drawImage(taban, 0, 0); return; }
    const W = onizleme.width, H = onizleme.height, P = 9 * dpr, { cozgu } = RENKLER[renk], t0 = performance.now();
    const kare = (t) => {
      const p = Math.min(1, (t - t0) / 420), dolu = Math.round(H * p / P) * P;
      /* henüz dokunmamış bölge: gergin çıplak çözgüler */
      c.fillStyle = '#121733'; c.fillRect(0, 0, W, H - dolu);
      c.fillStyle = cozgu;
      for (let x = 0; x < W; x += P) c.fillRect(x + P * 0.12, 0, P * 0.76, H - dolu);
      c.drawImage(taban, 0, H - dolu, W, dolu, 0, H - dolu, W, dolu);
      if (p < 1) {
        c.fillStyle = 'rgba(243, 238, 228, .85)'; c.fillRect(0, H - dolu - 2 * dpr, W, 2 * dpr);   /* kumaş ağzı + tarak */
        dokuma = requestAnimationFrame(kare);
      }
    };
    dokuma = requestAnimationFrame(kare);
  }

  function analizYaz() {
    const a = analiz(m);
    const yuzde = Math.round(a.cozguYuzu * 100);
    const atla = (x) => (x === Infinity ? '∞' : String(x));
    sonuc.innerHTML = `
      <div><dt>${metin('atolyeYuz')}</dt><dd>${yuzdeYaz(yuzde)} <small>${yuzde > 55 ? metin('atolyeCozguYuzlu') : yuzde < 45 ? metin('atolyeAtkiYuzlu') : metin('atolyeDengeli')}</small></dd></div>
      <div><dt>${metin('atolyeAtlama')}</dt><dd>${atla(a.cozguAtlama)} / ${atla(a.atkiAtlama)}</dd></div>
      <div><dt>${metin('atolyeRapor')}</dt><dd>${a.rapor[0]} × ${a.rapor[1]}</dd></div>`;
    const uyarilar = [];
    if (a.bagsizSutun.length || a.bagsizSatir.length) uyarilar.push(metin('atolyeBagsiz'));
    else if (Math.max(a.cozguAtlama, a.atkiAtlama) >= 5) uyarilar.push(metin('atolyeUzun'));
    uyari.textContent = uyarilar.join(' ') || metin('atolyeTamam');
    uyari.classList.toggle('atolye__uyari--var', uyarilar.length > 0);
  }

  let kesitSatir = 0;   /* kâğıtta üstüne gelinen atkı: armür planında o satır çerçevelenir */

  /* tahar (üstte: çerçeve × çözgü) ve armür planı (sağda: atkı × çerçeve) */
  const armur = kok.querySelector('#atolye-armur'), cerceveAd = kok.querySelector('#atolye-cerceve'), tezgah = kok.querySelector('#atolye-tezgah');
  function armurCiz() {
    const W = armur.clientWidth, H = armur.clientHeight;
    if (!W) return;
    armur.width = Math.round(W * dpr); armur.height = Math.round(H * dpr);
    const c = armur.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { tahar, plan, cerceve } = armurPlani(m);
    const n = m.length, S = cerceve;
    const h = Math.min((W - 6) / (n + S + 1), (H - 6) / (n + S + 1));
    const x0 = (W - h * (n + S + 1)) / 2, y0 = (H - h * (n + S + 1)) / 2;
    c.clearRect(0, 0, W, H);
    const kare = (x, y, dolu, renk2) => { c.fillStyle = dolu ? renk2 : '#fbf8f2'; c.fillRect(x + 1, y + 1, h - 2, h - 2); };
    c.fillStyle = 'rgba(184, 41, 43, .28)'; c.fillRect(x0, y0, h * n, h * S); c.fillRect(x0 + h * (n + 1), y0 + h * (S + 1), h * S, h * n);
    for (let s2 = 0; s2 < S; s2++) for (let i = 0; i < n; i++) kare(x0 + i * h, y0 + (S - 1 - s2) * h, tahar[i] === s2, '#1f2850');
    for (let j = 0; j < n; j++) for (let s2 = 0; s2 < S; s2++) kare(x0 + (n + 1 + s2) * h, y0 + (S + 1 + j) * h, plan[j][s2], '#b8292b');
    /* örgü (dolu kare = çözgü üstte): tahar × armürün sonucu */
    c.fillStyle = 'rgba(184, 41, 43, .18)'; c.fillRect(x0, y0 + h * (S + 1), h * n, h * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) kare(x0 + i * h, y0 + (S + 1 + j) * h, m[j][i], '#4b4f66');
    if (kesitSatir < n) { c.strokeStyle = '#b8292b'; c.lineWidth = 1.5; c.strokeRect(x0 + 0.75, y0 + (S + 1 + kesitSatir) * h + 0.75, h * (n + 1 + S) - 1.5, h - 1.5); }
    /* üretilebilirlik: bağlantısız iplik varsa dokunamaz (çerçeve sayısı da anlamsız: "—"); yoksa gereken gücü çerçevesi sayısıyla armürlü tezgâh */
    const a = analiz(m), dokunamaz = a.bagsizSutun.length || a.bagsizSatir.length;
    cerceveAd.textContent = dokunamaz ? '—' : metin('atolyeCerceve').replace('{n}', String(S));
    tezgah.textContent = dokunamaz ? metin('atolyeTezgahYok') : metin('atolyeTezgah').replace('{n}', String(S));
  }

  const boyut = kok.querySelector('#atolye-boyut');
  function hepsi(dok = false) { boyut.textContent = `${m.length} × ${m.length}`; kagitCiz(); onizlemeCiz(dok); analizYaz(); armurCiz(); lup.yenile(); }

  function hucreCevir(i, j, duyur) {
    m[j][i] = !m[j][i];
    for (const r of kok.querySelectorAll('input[name="orgu"]')) r.checked = false;
    hepsi();
    if (duyur) canli.textContent = metin(m[j][i] ? 'atolyeHucreCozgu' : 'atolyeHucreAtki').replace('{s}', String(j + 1)).replace('{k}', String(i + 1));
  }

  let surukle = null;   /* sürükleyerek boyama: ilk hücrenin yeni değeri */
  const hucre = (e) => {
    /* offsetX dönüşümü (kartın -2° eğimi) hesaba katar; getBoundingClientRect katmaz */
    const n = m.length;
    const i = Math.floor(e.offsetX / (kagit.clientWidth / n)), j = Math.floor(e.offsetY / (kagit.clientHeight / n));
    return i >= 0 && j >= 0 && i < n && j < n ? [i, j] : null;
  };
  /* dokunmatikte kâğıt dikey kaydırmayı tarayıcıya bırakır (touch-action: pan-y; tam genişlik kâğıt kaydırma tuzağı olmasın):
   * ilk kare hemen değil, dokunma bitince ya da yatay sürükleme başlayınca çevrilir; kaydırma (pointercancel) olursa hiçbir kare değişmez */
  let bekleyen = null, basX = 0, basY = 0;
  kagit.addEventListener('pointerdown', (e) => {
    const h = hucre(e); if (!h) return;
    klavye = false;
    kagit.setPointerCapture(e.pointerId);
    surukle = !m[h[1]][h[0]];
    if (e.pointerType === 'touch') { bekleyen = h; basX = e.clientX; basY = e.clientY; }
    else hucreCevir(h[0], h[1], false);
  });
  kagit.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') { const h = hucre(e); if (h && h[1] !== kesitSatir) { kesitSatir = h[1]; armurCiz(); } }
    if (surukle === null) return;
    if (bekleyen) {
      /* 8 px'ten kısa ya da dikey baskın hareket: kaydırma olabilir, karar tarayıcının (pointercancel) */
      const dx = Math.abs(e.clientX - basX), dy = Math.abs(e.clientY - basY);
      if (Math.max(dx, dy) < 8 || dy >= dx) return;
      hucreCevir(bekleyen[0], bekleyen[1], false); bekleyen = null;
    }
    const h = hucre(e); if (!h || m[h[1]][h[0]] === surukle) return;
    hucreCevir(h[0], h[1], false);
  });
  kagit.addEventListener('pointerup', () => { if (bekleyen) hucreCevir(bekleyen[0], bekleyen[1], false); bekleyen = null; surukle = null; });
  kagit.addEventListener('pointercancel', () => { bekleyen = null; surukle = null; });
  kagit.addEventListener('keydown', (e) => {
    const n = m.length;
    const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (d) { e.preventDefault(); klavye = true; imlec = [(imlec[0] + d[0] + n) % n, (imlec[1] + d[1] + n) % n]; kesitSatir = imlec[1]; kagitCiz(); armurCiz(); canli.textContent = metin(m[imlec[1]][imlec[0]] ? 'atolyeHucreCozgu' : 'atolyeHucreAtki').replace('{s}', String(imlec[1] + 1)).replace('{k}', String(imlec[0] + 1)); }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); klavye = true; hucreCevir(imlec[0], imlec[1], true); }
  });
  kagit.addEventListener('focus', () => { klavye = kagit.matches(':focus-visible'); kagitCiz(); });
  kagit.addEventListener('blur', () => { klavye = false; kagitCiz(); });

  for (const r of kok.querySelectorAll('input[name="orgu"]')) r.addEventListener('change', () => { m = hazirMatris(r.value); imlec = [0, 0]; kesitSatir = 0; hepsi(true); });
  kok.querySelector('#atolye-temizle').addEventListener('click', () => {
    m = Array.from({ length: N }, () => Array(N).fill(false));
    for (const r of kok.querySelectorAll('input[name="orgu"]')) r.checked = false;
    hepsi();
  });
  /* "Deseninizi anlatın": iletişim formuna götürür, konu "Bilgi edinme", mesaj alanı yol gösteren ipucuyla odak alır.
     Rapor mesaja kopyalanmaz (atölye özel desen yapılabildiğini göstermek için; ayrıntı konuşmada netleşir) */
  const ipucuYaz = () => { const ta = document.getElementById('f-mesaj'); if (ta?.dataset.atolye) ta.placeholder = metin('atolyeIpucu'); };
  kok.querySelector('#atolye-danis').addEventListener('click', (e) => {
    const ta = document.getElementById('f-mesaj'), hedef = document.getElementById('iletisim');
    const bilgi = document.querySelector('input[name="konu"][value="Bilgi edinme"]');
    if (bilgi) bilgi.checked = true;
    if (!ta || !hedef) return;                       /* JS yarım kalırsa bağlantı #iletisim'e normal gider */
    /* çapa gidişi kendimiz: varsayılan fragment gidişinde odak mesaj alanında kalmıyordu (sayfa #atolye ile açılınca) */
    e.preventDefault();
    hedef.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('az') ? 'instant' : 'smooth' });
    history.pushState(null, '', '#iletisim');
    ta.dataset.atolye = '1'; ipucuYaz(); ta.focus({ preventScroll: true });
  });
  document.addEventListener('dil-degisti', ipucuYaz);
  document.addEventListener('dil-degisti', () => { analizYaz(); armurCiz(); });

  hepsi();
  let z = 0;
  new ResizeObserver(() => { clearTimeout(z); z = setTimeout(() => hepsi(), 80); }).observe(kok);
}
