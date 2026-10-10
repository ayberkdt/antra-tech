/* JAKAR BANDI — alt bilgide "ANTRA TECH" yazısı örgünün kendisiyle dokunur (Canvas 2D, durağan).
 *
 * Yazı bir maskeye çizilir (Fraunces); maskenin içindeki hücreler 5'li atkı saten (atkı yüzlü,
 * açık iplik öne çıkar), dışı 2/1 çözgü yüzlü dimi (koyu). Böylece harfler mürekkeple değil,
 * iplik bağlantısının değişmesiyle görünür: gerçek jakar damask gibi. Üzerine gelince lup.
 */
import { kumasCiz, lupKur } from './numune.mjs';

const mod = (a, b) => ((a % b) + b) % b;

export function jakarKur(kap, { yazi = 'ANTRA TECH' } = {}) {
  const tuval = kap.querySelector('canvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let P = 4;                                      /* iplik aralığı (CSS px); dar ekranda 3 */
  let maske = null, mG = 0, mY = 0;

  function maskeKur(g, y) {
    mG = Math.ceil(g / P); mY = Math.ceil(y / P);
    const c = document.createElement('canvas');
    c.width = mG; c.height = mY;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, mG, mY);
    /* yazı bandın yüksekliğine sığacak en büyük boyutta, ortalı; dar bantta iki satır */
    const satirlar = mG < mY * 4 ? yazi.split(' ') : [yazi];
    let boy = (mY * 0.8) / satirlar.length;
    x.font = `600 ${boy}px Fraunces, Georgia, serif`;
    const olc = Math.max(...satirlar.map((t) => x.measureText(t).width));
    if (olc > mG * 0.9) { boy *= (mG * 0.9) / olc; x.font = `600 ${boy}px Fraunces, Georgia, serif`; }
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    satirlar.forEach((t, k) => x.fillText(t, mG / 2, mY / 2 + (k - (satirlar.length - 1) / 2) * boy * 0.98 + boy * 0.04));
    const d = x.getImageData(0, 0, mG, mY).data;
    maske = new Uint8Array(mG * mY);
    for (let k = 0; k < maske.length; k++) maske[k] = d[k * 4] > 110 ? 1 : 0;
  }
  const icinde = (i, j) => (i >= 0 && j >= 0 && i < mG && j < mY ? maske[j * mG + i] : 0);

  const tanim = () => ({
    P,
    orgu: (i, j) => (icinde(i, j) ? mod(2 * i - j, 5) === 0 : mod(i - j, 3) < 2),
    /* desen: açık atkı (saten yüzü), zemin: lacivert çözgü */
    renk: (i, j) => {
      const ic = icinde(i, j);
      const cozguUst = ic ? mod(2 * i - j, 5) === 0 : mod(i - j, 3) < 2;
      if (cozguUst) return ic ? '#2a3466' : '#1f2850';
      return ic ? '#d9cdb2' : '#121733';
    },
    golge: 0.85,
  });

  function ciz() {
    const g = kap.clientWidth, y = kap.clientHeight;
    if (!g || !y) return;
    P = g < 640 ? 3 : 4;
    maskeKur(g, y);
    tuval.width = Math.round(g * dpr); tuval.height = Math.round(y * dpr);
    kumasCiz(tuval.getContext('2d'), tanim(), 0, 0, g, y, dpr);
  }

  lupKur(kap, tanim);
  ciz();
  let z = 0;
  new ResizeObserver(() => { clearTimeout(z); z = setTimeout(ciz, 150); }).observe(kap);
  document.fonts?.ready.then(ciz);
}
