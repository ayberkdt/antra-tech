/* VİZYON — üç ilkenin anahtar kelimelerine dokunmuş kumaş dokusu (harfler kumaşla dolu: background-clip: text).
 * Doku numune.mjs'in iplik çizicisiyle bir kez çizilir, satıra --doku değişkeni olarak verilir (dil değişince <em> yeniden
 * kurulsa da değişken satırda kalır). 150 px döşeme = 30 hücre (P 5): dimi (3) ve bezayağı (2) raporları dikişsiz tekrarlanır. */
import { kumasCiz } from './numune.mjs';

const DOKULAR = [
  { orgu: 'dimi21', P: 5, cozgu: '#e2585a', atki: '#f6efe2' },
  { orgu: 'bez', P: 5, cozgu: '#efe4cc', atki: '#c9a774' },
  { orgu: (i, j) => (((i + j) % 3) + 3) % 3 < 2, P: 5, cozgu: '#cfd9ea', atki: '#8fa3c4' },
];

export function vizyonKur(kok) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  kok.querySelectorAll('.ilke-satir').forEach((satir, k) => {
    const t = document.createElement('canvas');
    t.width = t.height = Math.round(150 * dpr);
    kumasCiz(t.getContext('2d'), DOKULAR[k % DOKULAR.length], 0, 0, 150, 150, dpr);
    satir.style.setProperty('--doku', `url(${t.toDataURL('image/png')})`);
  });
}
