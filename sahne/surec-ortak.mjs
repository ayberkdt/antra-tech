/* SÜREÇ — 3B sahne (surec3b.mjs) ile 2B yedeğin (surec.mjs) ortak parçaları.
 *
 * Saf fonksiyonlar (kaydırma ilerlemesi, etkin adım, çekme eğrisi) araclar/dogrula.mjs'te Node'da sınanır.
 * adimBagla(): adım listesi düğmeleri, "Adım 03 / 08" sayacı ve ilerleme ipliği (--dolu); iki sahne de aynısını kullanır.
 * Sayaç kaydırma hedefini (pHedef) gösterir; kamera yumuşatılmış ilerlemeyle (p) arkadan gelir.
 */
import { metin } from '../ceviri.mjs';

export const S = 600, ADIM = 8;
export const KOPMA = 0.86;                     /* çekme eğrisinde kopma uzaması (0–1) */

/** Kaydırma izi → 0–1 ilerleme */
export function ilerlemeHesapla(ustKenar, izYuksekligi, ekranYuksekligi) {
  const yol = izYuksekligi - ekranYuksekligi;
  if (yol <= 0) return 0;
  return Math.min(1, Math.max(0, -ustKenar / yol));
}
/** İlerleme → kamera merkezi (2B dünya x) ve etkin adım */
export function kamera(p) {
  const x = S / 2 + p * (ADIM - 1) * S;
  return { x, etkin: Math.min(ADIM - 1, Math.max(0, Math.round(p * (ADIM - 1)))) };
}
/** Temsilî kuvvet–uzama eğrisi (0–1 → 0–1); kopma e = 0.86 */
export function cekmeEgrisi(e) {
  if (e <= 0) return 0;
  if (e >= KOPMA) return Math.max(0, 1 - (e - KOPMA) * 12);
  const x = e / KOPMA;
  return Math.min(1, 1.15 * (1 - Math.exp(-2.4 * x)) * (0.55 + 0.45 * x));
}

/**
 * Adım listesini ve sayacı sahneye bağlar. Dönen guncelle(p) her karede çağrılır; yalnız değişen değeri yazar
 * (her karede 8 öğeye stil yazmak yavaş cihazda stil hesabını tetikler). etkinDegisti(i) etkin adım değişince çağrılır.
 */
export function adimBagla({ iz, adimlar, azHareket, etkinDegisti = () => {}, gitti = () => {} }) {
  const sayac = document.getElementById('surec-sayac'), sayacNo = document.getElementById('surec-sayac-no');
  const doluOnceki = [];
  let etkin = -1;
  function guncelle(p) {
    const c = kamera(p);
    if (c.etkin !== etkin) {
      etkin = c.etkin;
      adimlar.forEach((li, i) => li.classList.toggle('etkin', i === etkin));
      if (sayac) { sayac.setAttribute('aria-valuenow', String(etkin + 1)); sayacNo.textContent = String(etkin + 1).padStart(2, '0'); }
      etkinDegisti(etkin);
    }
    const a = p * (ADIM - 1);
    adimlar.forEach((li, i) => {
      const v = Math.min(1, Math.max(0, a - i + 0.5)).toFixed(2);
      if (doluOnceki[i] !== v) { doluOnceki[i] = v; li.style.setProperty('--dolu', v); }
    });
  }
  /* adım listesi: her adımı kaplayan gerçek düğme (liste anlamı korunur, klavyeyle erişilir) */
  const git = (i) => {
    const r = iz.getBoundingClientRect();
    const yol = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + yol * (i / (ADIM - 1)) + 2, behavior: azHareket ? 'instant' : 'smooth' });
    if (azHareket) gitti(i);   /* anlık kaydırmada sayaç kaydırma olayını beklemeden hedef adımı gösterir */
  };
  adimlar.forEach((li, i) => {
    if (li.querySelector('.adim__git')) return;
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'adim__git';
    const etiketle = () => d.setAttribute('aria-label', metin('adimaGit').replace('{n}', String(i + 1)).replace('{ad}', li.querySelector('b').textContent));
    etiketle(); document.addEventListener('dil-degisti', etiketle);
    d.addEventListener('click', () => git(i));
    li.append(d);
  });
  return { guncelle, etkin: () => etkin };
}
