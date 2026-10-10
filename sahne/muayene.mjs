/* KUMAŞ MUAYENESİ — 4 puan sistemi (laboratuvar T6), Canvas 2D, 800 × 640 mantıksal birim.
 *
 * Muayene makinesi önden: kumaş (lacivert 2/1 dimi, kırmızı kenar ipliği) ışıklı masada aşağıdan yukarı akar, üst
 * silindirden döner. Hata muayene çizgisine gelince muayeneci gibi işaretlenir (otomatik gösterim, ziyaretçiden
 * etkileşim beklenmez): hata halkalanır, kenara puan etiketi yapıştırılır, sağdaki muayene kaydına yazılır. Puan:
 *   ≤ 76 mm → 1 · ≤ 152 mm → 2 · ≤ 229 mm → 3 · daha uzun → 4   (3″ / 6″ / 9″ eşiklerinin metrik karşılığı)
 * Toplam puan 100 m²'ye oranlanır: puan × 10 000 / (muayene edilen uzunluk m × en cm).
 * Kabul sınırı standartta değil, alıcı–üretici anlaşmasındadır (sayfada yazılı).
 * Sahne boş başlamaz: makine çalışırken açılmış gibi önceki hatalar kayıtta, ikisi çizgiyi geçmiş, ikisi geliyor.
 * Saf fonksiyonlar (hataPuani, yuzMetrekare) Node'da sınanır. yazi() puntosu ekran pikselidir (lw ile ölçeklenir).
 */

export const EN_CM = 150;                 /* kumaş eni */
const KUMAS_X = 40, KUMAS_G = 470;        /* mantıksal: 470 birim = 150 cm */
export const MM_BIRIM = (EN_CM * 10) / KUMAS_G;   /* 1 mantıksal birim kaç mm */

/** Hata boyu (mm) → puan */
export function hataPuani(mm) {
  if (mm <= 76) return 1;
  if (mm <= 152) return 2;
  if (mm <= 229) return 3;
  return 4;
}
/** 100 m² başına puan */
export function yuzMetrekare(puan, uzunlukM, enCm = EN_CM) {
  if (uzunlukM <= 0) return 0;
  return (puan * 10000) / (uzunlukM * enCm);
}

const TURLER = ['atki', 'leke', 'dugum', 'delik'];
const TUR_RENK = { atki: '#8fa0d8', leke: '#c9a24a', dugum: '#efe8d9', delik: '#e2585a' };
const TUR_AD = { atki: 'lab6Tur_atki', leke: 'lab6Tur_leke', dugum: 'lab6Tur_dugum', delik: 'lab6Tur_delik' };   /* açık anahtarlar: doğrulayıcı kullanımı görür */
const PANEL_X = 560;                      /* sağdaki muayene kaydı */

/** 2/1 dimi döşemesi (3 × 3 hücre): kalkık çözgü dikey, atkı yatay; ışık yandan */
function dimiDosemesi() {
  const H = 8, c = document.createElement('canvas'); c.width = c.height = 3 * H;
  const g = c.getContext('2d');
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const cozgu = (((i - j) % 3) + 3) % 3 < 2;
    const x = i * H, y = j * H;
    g.fillStyle = cozgu ? '#2f3b78' : '#222c5e'; g.fillRect(x, y, H, H);
    const p = cozgu ? g.createLinearGradient(x, 0, x + H, 0) : g.createLinearGradient(0, y, 0, y + H);
    p.addColorStop(0, 'rgba(0,0,0,.28)'); p.addColorStop(0.45, 'rgba(170,185,240,.20)'); p.addColorStop(1, 'rgba(0,0,0,.30)');
    g.fillStyle = p; g.fillRect(x, y, H, H);
  }
  return c;
}

export function muayeneKur({ lw, yazi, metin, sayi, azHareket }) {
  let hatalar = [], kayit = [], kayan = 0, sonUret = 0, isaretli = 0, puan = 0, tohum = 7;
  const rnd = () => { tohum = (tohum * 16807) % 2147483647; return tohum / 2147483647; };
  const HIZ = 70;                          /* birim/s */
  const CIZGI = 300;                       /* muayene çizgisi (y) */
  let doku = null, desen = null;

  const yeniHata = (tur, y) => {
    const uz = tur === 'atki' ? 40 + rnd() * 110 : tur === 'leke' ? 10 + rnd() * 34 : tur === 'dugum' ? 8 + rnd() * 16 : 6 + rnd() * 10;
    return { tur, x: KUMAS_X + 34 + rnd() * (KUMAS_G - 80 - (tur === 'atki' ? uz : 0)), y, uz, isaret: false, p: hataPuani(uz * MM_BIRIM), d: rnd() };
  };
  function isaretle(h) {
    if (!h || h.isaret) return false;
    h.isaret = true; isaretli++; puan += h.p;
    kayit.unshift({ tur: h.tur, mm: Math.round(h.uz * MM_BIRIM), p: h.p });
    if (kayit.length > 7) kayit.length = 7;
    return true;
  }

  function sifirla() {
    hatalar = []; kayit = []; sonUret = 0; isaretli = 0; puan = 0; tohum = 7;
    /* makine 41 m'dir çalışıyor: üç hata kayıtta (ekrandan çıkmış), ikisi çizgiyi geçmiş, ikisi geliyor */
    kayan = 41000 / MM_BIRIM;
    for (const tur of ['leke', 'atki', 'delik']) isaretle(yeniHata(tur, -100));
    for (const [tur, y] of [['dugum', 120], ['atki', 236], ['leke', 420], ['delik', 575]]) {
      const h = yeniHata(tur, y); hatalar.push(h);
      if (y <= CIZGI) isaretle(h);
    }
  }
  sifirla();

  function adim(dt) {
    if (azHareket) return;
    kayan += HIZ * dt;
    for (const h of hatalar) h.y -= HIZ * dt;
    /* muayene çizgisine gelen hata işaretlenir ve boyuna göre puanlanır */
    for (const h of hatalar) if (!h.isaret && h.y <= CIZGI) isaretle(h);
    hatalar = hatalar.filter((h) => h.y > -60);
    sonUret += dt;
    if (sonUret > 1.6 + rnd() * 1.2) { sonUret = 0; hatalar.push(yeniHata(TURLER[Math.floor(rnd() * TURLER.length)], 680)); }
  }

  function hataCiz(ctx, h) {
    const { x, y, uz } = h;
    if (h.tur === 'atki') {                 /* atkı kaçığı: bir sıra boyunca atkı yok, çözgüler açıkta */
      ctx.fillStyle = 'rgba(8, 11, 30, .75)'; ctx.fillRect(x, y - 2.2, uz, 4.4);
      ctx.fillStyle = 'rgba(150, 165, 225, .55)'; for (let k = 0; k < uz; k += 4) ctx.fillRect(x + k, y - 2.2, 1.6, 4.4);
    } else if (h.tur === 'leke') {          /* yağ lekesi: düzensiz, kenarı yumuşak */
      const g = ctx.createRadialGradient(x, y, 0, x, y, uz / 2);
      g.addColorStop(0, 'rgba(150, 118, 48, .85)'); g.addColorStop(0.7, 'rgba(120, 92, 36, .55)'); g.addColorStop(1, 'rgba(120, 92, 36, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, uz / 2, uz / 2.8, h.d * 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + uz * 0.22, y + uz * 0.08, uz / 3.4, uz / 4.2, h.d * 5, 0, Math.PI * 2); ctx.fill();
    } else if (h.tur === 'dugum') {         /* düğüm / kalın yer: iplikte şişkinlik, gölgeli */
      ctx.fillStyle = 'rgba(0, 0, 0, .35)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2, uz / 2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, y - 3, 0, y + 3); g.addColorStop(0, '#f3eee4'); g.addColorStop(1, '#a9a28f');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, uz / 2, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    } else {                                /* delik: kopuk iplik uçları, ışık masası içinden parlar */
      ctx.fillStyle = 'rgba(255, 246, 225, .95)'; ctx.beginPath(); ctx.ellipse(x, y, uz / 2, uz / 2.4, h.d, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180, 190, 235, .7)'; ctx.lineWidth = 1;
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + h.d; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * uz * 0.45, y + Math.sin(a) * uz * 0.4); ctx.lineTo(x + Math.cos(a) * uz * 0.62, y + Math.sin(a) * uz * 0.56); ctx.stroke(); }
    }
  }

  function ciz(ctx) {
    const SAG = KUMAS_X + KUMAS_G;
    if (!doku) { doku = dimiDosemesi(); desen = ctx.createPattern(doku, 'repeat'); }
    /* makine gövdesi: iki yan dikme */
    ctx.fillStyle = '#0d1129'; ctx.fillRect(KUMAS_X - 26, 0, 14, 640); ctx.fillRect(SAG + 12, 0, 14, 640);
    /* kumaş: dimi doku, akışla birlikte kayar (döşeme 12 birim: 3 hücre × 4) */
    ctx.save(); ctx.beginPath(); ctx.rect(KUMAS_X, 0, KUMAS_G, 640); ctx.clip();
    desen.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, KUMAS_X, -(kayan % 12)]));
    ctx.fillStyle = desen; ctx.fillRect(KUMAS_X, 0, KUMAS_G, 640);
    /* ışıklı masa: muayene çizgisi çevresinde kumaşın içinden geçen ışık */
    const isik = ctx.createLinearGradient(0, CIZGI - 170, 0, CIZGI + 170);
    isik.addColorStop(0, 'rgba(255,255,255,0)'); isik.addColorStop(0.5, 'rgba(225,232,255,.16)'); isik.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = isik; ctx.fillRect(KUMAS_X, 0, KUMAS_G, 640);
    /* kenar (selvage): kırmızı kenar ipliği + sık çözgü */
    for (const kx of [KUMAS_X, SAG - 9]) { ctx.fillStyle = '#1a2250'; ctx.fillRect(kx, 0, 9, 640); ctx.fillStyle = 'rgba(184, 41, 43, .9)'; ctx.fillRect(kx + 3, 0, 2.4, 640); }
    for (const h of hatalar) hataCiz(ctx, h);
    ctx.restore();
    /* üst silindir: kumaş buradan döner */
    const sil = ctx.createLinearGradient(0, 0, 0, 30);
    sil.addColorStop(0, '#5d6584'); sil.addColorStop(0.45, '#d8dce8'); sil.addColorStop(1, '#4a516e');
    ctx.fillStyle = sil; ctx.fillRect(KUMAS_X - 18, 0, KUMAS_G + 36, 26);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(KUMAS_X, 26, KUMAS_G, 5);
    /* muayene çizgisi */
    ctx.setLineDash([lw(6), lw(5)]); ctx.strokeStyle = 'rgba(243, 238, 228, .55)'; ctx.lineWidth = lw(1);
    ctx.beginPath(); ctx.moveTo(KUMAS_X - 12, CIZGI); ctx.lineTo(SAG + 12, CIZGI); ctx.stroke(); ctx.setLineDash([]);
    yazi(metin('lab6Cizgi'), KUMAS_X + 16, CIZGI - lw(7), 'rgba(243,238,228,.8)', 11);
    /* işaretli hatalar: halka + kenara yapıştırılan puan etiketi (muayenecinin kenar işareti) */
    for (const h of hatalar) {
      if (!h.isaret) continue;
      const mx = h.tur === 'atki' ? h.x + h.uz / 2 : h.x, r = Math.max(h.tur === 'atki' ? h.uz / 2 + 8 : h.uz / 2 + 10, 14);
      ctx.strokeStyle = '#e2585a'; ctx.lineWidth = lw(2);
      ctx.beginPath(); ctx.ellipse(mx, h.y, r, h.tur === 'atki' ? 12 : r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([lw(3), lw(3)]); ctx.lineWidth = lw(1); ctx.beginPath(); ctx.moveTo(mx + r, h.y); ctx.lineTo(SAG - 2, h.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e2585a'; ctx.fillRect(SAG - 4, h.y - 11, 30, 22);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(SAG + 26, h.y - 11); ctx.lineTo(SAG + 20, h.y - 11); ctx.lineTo(SAG + 26, h.y - 5); ctx.fill();
      yazi(`${h.p}P`, SAG + 11, h.y + lw(4.5), '#fff', 12, 'center');
    }
    /* en cetveli */
    ctx.strokeStyle = 'rgba(243, 238, 228, .35)'; ctx.lineWidth = lw(1);
    for (let cm = 0; cm <= EN_CM; cm += 10) { const x = KUMAS_X + cm / EN_CM * KUMAS_G; ctx.beginPath(); ctx.moveTo(x, 626); ctx.lineTo(x, cm % 50 ? 632 : 639); ctx.stroke(); }
    yazi(`${EN_CM} cm`, SAG, 620, 'rgba(243,238,228,.6)', 11, 'right');

    /* sağ panel: muayene kaydı (son hatalar), 100 m² oranı, puan anahtarı.
       Dar tuvalde (telefon, ölçek < 0,62) sade: yalnız tür + puan, en çok 4 satır, anahtar yok (açıklama metni anlatıyor) */
    const m = (kayan * MM_BIRIM) / 1000, oran = yuzMetrekare(puan, m), dar = lw(1) > 1.6;
    const boy = dar ? 9 : 12, satir = Math.max(36, lw(boy + 8)), SAGK = PANEL_X + (dar ? 236 : 220);
    yazi(metin('lab6Kayit'), PANEL_X, 46, 'rgba(243,238,228,.6)', dar ? 9 : 11);
    ctx.fillStyle = 'rgba(243,238,228,.18)'; ctx.fillRect(PANEL_X, 46 + lw(8), 220, 1);
    kayit.slice(0, dar ? 4 : 7).forEach((k, i) => {
      const y = 46 + lw(10) + satir * (i + 1), a = i === 0 ? 1 : 0.78;
      ctx.fillStyle = TUR_RENK[k.tur]; ctx.beginPath(); ctx.arc(PANEL_X + 5, y - lw(boy / 3), lw(dar ? 3 : 4.5), 0, Math.PI * 2); ctx.fill();
      yazi(metin(TUR_AD[k.tur]), PANEL_X + 5 + lw(9), y, `rgba(243,238,228,${a})`, boy);
      if (!dar) yazi(`${sayi(k.mm)} mm`, PANEL_X + 160, y, 'rgba(243,238,228,.55)', 11, 'right');
      const bg = lw(boy * 2.2);
      ctx.fillStyle = '#e2585a'; ctx.fillRect(SAGK - bg, y - lw(boy + 1), bg, lw(boy + 6));
      yazi(`${k.p}P`, SAGK - bg / 2, y, '#fff', dar ? boy : boy - 1, 'center');
    });
    const oy = dar ? 46 + lw(10) + satir * 5 + lw(14) : 372;
    yazi(metin('lab6Oran'), PANEL_X, oy, 'rgba(243,238,228,.6)', dar ? 9 : 11);
    ctx.fillStyle = '#f3eee4'; ctx.font = `400 ${lw(dar ? 26 : 40)}px Fraunces, Georgia, serif`; ctx.textAlign = 'left';
    ctx.fillText(sayi(oran, 1), PANEL_X, oy + lw(dar ? 30 : 46));
    if (dar) return metin('lab6Olcum').replace('{i}', String(isaretli)).replace('{p}', String(puan)).replace('{o}', sayi(oran, 1)).replace('{m}', sayi(m, 1));
    yazi(`${sayi(puan)} P · ${sayi(m, 1)} m · ${EN_CM} cm`, PANEL_X, 372 + lw(68), 'rgba(243,238,228,.55)', 11);
    const ay = 520;
    yazi(metin('lab6Anahtar'), PANEL_X, ay, 'rgba(243,238,228,.6)', 11);
    [['≤ 76 mm', 1], ['≤ 152 mm', 2], ['≤ 229 mm', 3], ['> 229 mm', 4]].forEach(([e, p], i) => {
      yazi(e, PANEL_X, ay + lw(22) + i * lw(18), 'rgba(243,238,228,.8)', 12);
      yazi(`${p}P`, PANEL_X + 220, ay + lw(22) + i * lw(18), '#e2585a', 12, 'right');
    });
    return metin('lab6Olcum').replace('{i}', String(isaretli)).replace('{p}', String(puan)).replace('{o}', sayi(oran, 1)).replace('{m}', sayi(m, 1));
  }

  return { adim, ciz, sifirla, hatalar: () => hatalar };
}
