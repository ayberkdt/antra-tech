/* NUMUNE KARTELASI — hizmet kartlarının kumaşları (Canvas 2D, yordamsal).
 *
 * Her kumaş iplik iplik çizilir: hücrenin üstündeki iplik (çözgü/atkı) örgü
 * raporundan, rengi kumaş türünden gelir; gölge, önceden üretilmiş gri tonlu
 * "iplik gölgesi" kalıplarıyla bindirilir (hücre başına 2 çizim çağrısı).
 * Lup: imlecin altındaki bölge aynı fonksiyonla ×3 ölçekte yeniden çizilir,
 * büyük doku bellekte tutulmaz. Kart kenarı zikzak makas (pinking) kesimi.
 */

/* ── saf yardımcılar (Node'da sınanır) ─────────────────────────────── */
const mod = (a, b) => ((a % b) + b) % b;
export function karma(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/* değer gürültüsü (kamuflaj lekeleri için) */
export function gurultu(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = karma(xi, yi), b = karma(xi + 1, yi), c = karma(xi, yi + 1), d = karma(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
const fbm = (x, y) => gurultu(x, y) * 0.6 + gurultu(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + gurultu(x * 4.3 + 3, y * 4.3 + 41) * 0.1;

/** Örgü raporları: (i, j) hücresinde çözgü üstte mi */
export const ORGU = {
  dimi21: (i, j) => mod(i - j, 3) < 2,
  bez: (i, j) => mod(i + j, 2) === 0,
  sepet: (i, j) => mod(Math.floor(i / 2) + Math.floor(j / 2), 2) === 0,
  /* petek: 10'luk raporda iç içe baklavalar; çözgü ve atkı atlamaları hücre oluşturur */
  petek: (i, j) => {
    const a = Math.abs(mod(i, 10) - 4.5), b = Math.abs(mod(j, 10) - 4.5);
    const d = Math.round(a + b);
    return d % 4 < 2 ? mod(i + j, 2) === 0 : a > b;
  },
};

/** Örgü rapor boyları (çözgü × atkı): periyodik kumaş bir rapor çizilip desen olarak döşenir */
export const RAPOR = { dimi21: [3, 3], bez: [2, 2], sepet: [4, 4], petek: [10, 10] };
const ekok = (a, b) => { const ebob = (x, y) => (y ? ebob(y, x % y) : x); return (a * b) / ebob(a, b); };

/** Kumaş türleri: örgü, iplik renkleri, isteğe bağlı renk haritası */
export const KUMASLAR = {
  kamuflaj: {
    orgu: 'dimi21', P: 5,
    renk(i, j) {
      const n = fbm(i / 26, j / 18);
      const m = fbm(i / 11 + 40, j / 9 + 40);
      if (m > 0.68) return '#22231d';
      if (n < 0.38) return '#4a5234';
      if (n < 0.55) return '#6d6a47';
      if (n < 0.66) return '#5b4632';
      return '#4a5234';
    },
  },
  gabardin: { orgu: 'dimi21', P: 4, cozgu: '#24305e', atki: '#161c3c' },
  poplin: { orgu: 'bez', P: 5, cozgu: '#ece5d4', atki: '#e0d6c1', isaret: true, golge: 0.45 },
  ripstop: {
    orgu: 'bez', P: 5, cozgu: '#58624f', atki: '#4c5545',
    takviye: (i, j) => mod(i, 9) < 2 || mod(j, 9) < 2,
    takviyeRenk: '#6f7a63', takviyeRapor: 9,
  },
  aramid: { orgu: 'sepet', P: 5, cozgu: '#c9a23f', atki: '#b88f2f', golge: 0.8 },
  petek: { orgu: 'petek', P: 5, cozgu: '#4a4f5c', atki: '#3a3e49' },
};

/* ── iplik gölge kalıpları ─────────────────────────────────────────── */
const kalipOnbellek = new Map();
function golgeKalibi(P, dikey, basDal, sonDal) {
  const anahtar = `${P}|${dikey}|${basDal}|${sonDal}`;
  if (kalipOnbellek.has(anahtar)) return kalipOnbellek.get(anahtar);
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.round(P));
  const x = c.getContext('2d');
  const n = c.width;
  const img = x.createImageData(n, n);
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const u = (px + 0.5) / n, v = (py + 0.5) / n;
      const en = dikey ? u : v, boy = dikey ? v : u;
      const s = (en - 0.5) / 0.44;                  // iplik genişliği %88
      let a, deger;
      if (Math.abs(s) > 1) { deger = 0; a = 0.7; } // iplik arası boşluk
      else {
        const nz = Math.sqrt(1 - s * s);
        let dal = 0;
        if (basDal && boy < 0.3) dal = 1 - boy / 0.3;
        if (sonDal && boy > 0.7) dal = (boy - 0.7) / 0.3;
        const isik = 0.55 + 0.55 * (nz * 0.8 - s * 0.35) - dal * 0.45;
        const bukum = 0.06 * Math.sin((boy * 5 + en * 1.5) * Math.PI * 2);
        const l = isik + bukum;
        deger = l > 1 ? 255 : 0;
        a = l > 1 ? Math.min(0.55, (l - 1) * 1.1) : Math.min(0.75, (1 - l) * 1.1);
      }
      const o = (py * n + px) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = deger;
      img.data[o + 3] = Math.round(a * 255);
    }
  }
  x.putImageData(img, 0, 0);
  kalipOnbellek.set(anahtar, c);
  return c;
}

/**
 * Kumaşı dünya koordinatlarında çizer.
 * x0, y0: dünya pikselinde sol üst · g, y: çizilecek alan (dünya pikseli) · olcek: dünya → tuval
 */
const desenOnbellek = new Map();
/** Kumaşın rapor boyu (hücre); periyodik değilse (renk haritası) null */
export function raporBoyu(K) {
  if (K.renk) return null;
  const r = K.rapor || RAPOR[K.orgu];
  if (!r) return null;
  return K.takviye ? [ekok(r[0], ekok(2, K.takviyeRapor || 1)), ekok(r[1], ekok(2, K.takviyeRapor || 1))] : r;
}
export function kumasCiz(ctx, tur, x0, y0, g, y, olcek = 1, { isaretsiz = false, dogrudan = false } = {}) {
  const K = typeof tur === 'string' ? KUMASLAR[tur] : tur;          /* hazır tür ya da { orgu, P, cozgu, atki } */
  const ust = typeof K.orgu === 'function' ? K.orgu : ORGU[K.orgu];
  const P = K.P;
  /* periyodik kumaş: bir rapor (tamsayı piksele yuvarlanmış ölçekte) çizilir, desen olarak döşenir — hücre başına iki çizim
     çağrısı yerine tek doldurma (6 kartlık kartela ~500 ms → birkaç ms). Ölçek tamsayı değilse desen dönüşümüyle oturtulur. */
  const rb = !dogrudan && raporBoyu(K);
  if (rb) {
    const tam = Math.max(1, Math.round(olcek));
    const anahtar = `${typeof tur === 'string' ? tur : JSON.stringify({ ...K, orgu: String(K.orgu) })}|${tam}`;
    let doseme = desenOnbellek.get(anahtar);
    if (!doseme) {
      doseme = document.createElement('canvas');
      doseme.width = rb[0] * P * tam; doseme.height = rb[1] * P * tam;
      kumasCiz(doseme.getContext('2d'), K, 0, 0, rb[0] * P, rb[1] * P, tam, { isaretsiz: true, dogrudan: true });
      if (desenOnbellek.size > 40) desenOnbellek.clear();
      desenOnbellek.set(anahtar, doseme);
    }
    const desen = ctx.createPattern(doseme, 'repeat');
    const k = olcek / tam;
    desen.setTransform(new DOMMatrix().scale(k).translate(-x0 * tam, -y0 * tam));
    ctx.fillStyle = desen; ctx.fillRect(0, 0, Math.ceil(g * olcek), Math.ceil(y * olcek));
    if (K.isaret && !isaretsiz) isaretCiz(ctx, x0, y0, olcek);
    return;
  }
  const Pc = P * olcek;
  const golge = K.golge ?? 1;
  const i0 = Math.floor(x0 / P), i1 = Math.ceil((x0 + g) / P);
  const j0 = Math.floor(y0 / P), j1 = Math.ceil((y0 + y) / P);
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const cu = ust(i, j);
      const dx = Math.round((i * P - x0) * olcek), dy = Math.round((j * P - y0) * olcek);
      const dn = Math.round(((i + 1) * P - x0) * olcek) - dx, dm = Math.round(((j + 1) * P - y0) * olcek) - dy;
      let renk;
      if (K.renk) renk = K.renk(i, j);
      else if (K.takviye && K.takviye(i, j) && ((cu && mod(i, 9) < 2) || (!cu && mod(j, 9) < 2))) renk = K.takviyeRenk;
      else renk = cu ? K.cozgu : K.atki;
      ctx.globalAlpha = 1;
      ctx.fillStyle = renk;
      ctx.fillRect(dx, dy, dn, dm);
      ctx.globalAlpha = golge;
      const bas = cu ? !ust(i, j - 1) : ust(i - 1, j);
      const son = cu ? !ust(i, j + 1) : ust(i + 1, j);
      ctx.drawImage(golgeKalibi(Pc, cu, bas, son), dx, dy, dn, dm);
    }
  }
  ctx.globalAlpha = 1;
  if (K.isaret && !isaretsiz) isaretCiz(ctx, x0, y0, olcek);
}
/* poplin: laboratuvar kesim işareti */
function isaretCiz(ctx, x0, y0, olcek) {
  {
    ctx.save();
    ctx.strokeStyle = 'rgba(184, 41, 43, .85)';
    ctx.lineWidth = 1.6 * olcek;
    ctx.setLineDash([6 * olcek, 4 * olcek]);
    ctx.strokeRect((60 - x0) * olcek, (48 - y0) * olcek, 110 * olcek, 110 * olcek);
    ctx.setLineDash([]);
    ctx.font = `600 ${11 * olcek}px "JetBrains Mono", monospace`;
    const yazi = '5 × 5 cm';
    const g = ctx.measureText(yazi).width;
    ctx.fillStyle = 'rgba(251, 248, 242, .92)';
    ctx.fillRect((60 - x0) * olcek, (28 - y0) * olcek, g + 10 * olcek, 18 * olcek);
    ctx.fillStyle = 'rgba(184, 41, 43, .95)';
    ctx.fillText(yazi, (65 - x0) * olcek, (41 - y0) * olcek);
    ctx.restore();
  }
}

/* zikzak makas kenarı: px cinsinden poligon. yalnizAlt: askılı numunede üst kenar kartonun altında, yanlar düz kesim */
export function zikzak(g, y, dis = 9, derin = 5, { yalnizAlt = false } = {}) {
  const nx = Math.max(4, Math.round(g / dis)), ny = Math.max(4, Math.round(y / dis));
  const sx = g / nx, sy = y / ny;
  const p = [];
  if (yalnizAlt) {
    p.push([0, 0], [g, 0], [g, y - derin]);
    for (let k = nx; k > 0; k--) p.push([(k - 0.5) * sx, y], [(k - 1) * sx, y - derin]);
    return `polygon(${p.map(([a, b]) => `${a.toFixed(1)}px ${b.toFixed(1)}px`).join(',')})`;
  }
  for (let k = 0; k < nx; k++) p.push([k * sx, 0], [(k + 0.5) * sx, derin]);
  for (let k = 0; k < ny; k++) p.push([g, k * sy], [g - derin, (k + 0.5) * sy]);
  for (let k = nx; k > 0; k--) p.push([k * sx, y], [(k - 0.5) * sx, y - derin]);
  for (let k = ny; k > 0; k--) p.push([0, k * sy], [derin, (k - 0.5) * sy]);
  return `polygon(${p.map(([a, b]) => `${a.toFixed(1)}px ${b.toFixed(1)}px`).join(',')})`;
}

/* döküm: asılı kumaşta düşey kıvrımlar (açık sırt, koyu çukur) + kartonun altında gölge, alt kenara doğru hafif koyulaşma.
   tohum karttan gelir: her numune kendi kıvrımıyla asılır */
export function dokumGolgesi(ctx, g, y, tohum = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const d = ctx.createLinearGradient(0, 0, g, 0);
  const n = 5;
  for (let k = 0; k <= n * 2; k++) {
    const t = k / (n * 2);
    const sap = (karma(k, tohum) - 0.5) * 0.06;
    const a = k % 2 ? 0.20 + 0.12 * karma(tohum, k) : 0.16 + 0.1 * karma(k + 7, tohum);
    d.addColorStop(Math.min(1, Math.max(0, t + sap)), k % 2 ? `rgba(0, 0, 0, ${a.toFixed(3)})` : `rgba(255, 255, 255, ${a.toFixed(3)})`);
  }
  ctx.fillStyle = d; ctx.fillRect(0, 0, g, y);
  ctx.globalCompositeOperation = 'source-over';
  const u = ctx.createLinearGradient(0, 0, 0, y);
  u.addColorStop(0, 'rgba(10, 12, 28, .38)'); u.addColorStop(0.07, 'rgba(10, 12, 28, 0)');
  u.addColorStop(0.75, 'rgba(10, 12, 28, 0)'); u.addColorStop(1, 'rgba(10, 12, 28, .16)');
  ctx.fillStyle = u; ctx.fillRect(0, 0, g, y);
  ctx.restore();
}


/* iplik sayma lupu: kabın içindeki .lup öğesini imlece taşır, altındaki bölgeyi ×3 yeniden çizer.
   tanimAl() o anki kumaşı verir (tür adı ya da { orgu, P, cozgu, atki }); büyük doku tutulmaz. */
export function lupKur(kap, tanimAl, { LUP = 132, BUYUT = 3 } = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const lup = kap.querySelector('.lup');
  const lt = document.createElement('canvas');
  const ic = lup.clientWidth || LUP - 6;           /* kenarlık (border-box) düşülmüş görünen boyut */
  LUP = ic;
  lt.width = lt.height = Math.round(LUP * dpr);
  lt.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:50%';
  lup.prepend(lt);
  const lctx = lt.getContext('2d');
  let bekleyen = null, imlec = { x: 0, y: 0 };
  const ciz = () => {
    bekleyen = null;
    const { x, y } = imlec;
    lup.style.left = `${x}px`; lup.style.top = `${y}px`;
    const yarim = LUP / BUYUT / 2;
    kumasCiz(lctx, tanimAl(), x - yarim, y - yarim, LUP / BUYUT, LUP / BUYUT, BUYUT * dpr);
  };
  kap.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    /* tuvalin üstündeyken offsetX eğimi (hover dönüşü) hesaba katar */
    if (e.target.tagName === 'CANVAS' && e.target.parentElement === kap) imlec = { x: e.offsetX, y: e.offsetY };
    else { const r = kap.getBoundingClientRect(); imlec = { x: e.clientX - r.left, y: e.clientY - r.top }; }
    kap.classList.add('lup-acik');
    if (!bekleyen) bekleyen = requestAnimationFrame(ciz);
  });
  kap.addEventListener('pointerleave', () => kap.classList.remove('lup-acik'));
  return { yenile: () => { if (kap.classList.contains('lup-acik')) ciz(); } };
}

/* ── kartela ─────────────────────────────────────────────────────────── */
export function kartelaKur(kartela, { azHareket } = {}) {
  let dpr = Math.min(devicePixelRatio || 1, 2);
  const kartlar = [...kartela.querySelectorAll('.numune')];
  const tabanlar = new Map();      /* kart → dökümlü kumaşın bellekteki kopyası (parlaklık bunun üstüne çizilir) */
  function kartCiz(kart, sira) {
    const kap = kart.querySelector('.numune__kumas');
    const tuval = kap.querySelector('canvas');
    const r = { width: kap.clientWidth, height: kap.clientHeight };      /* hover eğiminden bağımsız */
    if (!r.width) return;
    dpr = Math.min(devicePixelRatio || 1, 2);     /* yakınlaştırma sonrası yeniden çizimde güncel yoğunluk */
    tuval.width = Math.round(r.width * dpr); tuval.height = Math.round(r.height * dpr);
    const taban = tabanlar.get(kart) || document.createElement('canvas');
    taban.width = tuval.width; taban.height = tuval.height;
    const tctx = taban.getContext('2d');
    kumasCiz(tctx, kart.dataset.numune, 0, 0, r.width, r.height, dpr);
    dokumGolgesi(tctx, taban.width, taban.height, sira * 13 + 5);
    tabanlar.set(kart, taban);
    tuval.getContext('2d').drawImage(taban, 0, 0);
    kap.style.setProperty('--zikzak', zikzak(r.width, r.height, 9, 5, { yalnizAlt: true }));
  }

  /* parlaklık: imleç kumaşın üstünde gezdikçe ışık iplikler üstünde kayar (yumuşak ışık karışımı) */
  function parla(kart, x, y) {
    const tuval = kart.querySelector('.numune__kumas canvas'), taban = tabanlar.get(kart);
    if (!taban) return;
    const ctx = tuval.getContext('2d');
    ctx.drawImage(taban, 0, 0);
    if (x == null) return;
    const R = tuval.width * 0.55;
    const p = ctx.createRadialGradient(x * dpr, y * dpr, 0, x * dpr, y * dpr, R);
    p.addColorStop(0, 'rgba(255, 255, 255, .34)'); p.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = p; ctx.fillRect(0, 0, tuval.width, tuval.height); ctx.restore();
  }

  for (const kart of kartlar) {
    const kap = kart.querySelector('.numune__kumas');
    lupKur(kap, () => kart.dataset.numune);
    if (azHareket) continue;
    let bekle = 0, son = null;
    kap.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = kap.getBoundingClientRect(); son = [e.clientX - r.left, e.clientY - r.top];
      if (!bekle) bekle = requestAnimationFrame(() => { bekle = 0; parla(kart, ...son); });
    });
    kap.addEventListener('pointerleave', () => { cancelAnimationFrame(bekle); bekle = 0; parla(kart, null); });
  }

  const ciz = () => kartlar.forEach((k, i) => kartCiz(k, i));
  ciz();
  let zaman = 0;
  new ResizeObserver(() => { clearTimeout(zaman); zaman = setTimeout(ciz, 120); }).observe(kartela);
}

/* hizmet penceresindeki büyük numune */
export function pencereKumasi(tuval, tur) {
  const r = { width: tuval.clientWidth, height: tuval.clientHeight };      /* açılış animasyonunun ölçeğinden bağımsız */
  const dpr = Math.min(devicePixelRatio || 1, 2);
  tuval.width = Math.max(1, Math.round(r.width * dpr)); tuval.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = tuval.getContext('2d');
  /* pencerede örgü 2 kat iri: kumaşa yakından bakılıyor */
  kumasCiz(ctx, tur, 0, 0, r.width / 2, r.height / 2, 2 * dpr, { isaretsiz: true });     /* yakın plan: kesim etiketi kart görünümüne ait */
  return tuval;
}
