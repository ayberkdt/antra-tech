#!/usr/bin/env node
/* DOĞRULA — saf modellerin sayısal sınamaları + çeviri ve sayfa bütünlüğü.
 *   node araclar/dogrula.mjs        (çıkış 1 = en az bir sınama düştü)
 * Tarayıcı gerekmez: sahne modüllerinin yalnız saf dışa açılımları içe aktarılır. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
let gecen = 0, dusen = 0;
const sina = (ad, kosul, ayrinti = '') => {
  if (kosul) gecen++; else { dusen++; console.log(`  ✗ ${ad}${ayrinti ? ' — ' + ayrinti : ''}`); }
};
const yakin = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

/* modüller tarayıcı API'sine yalnız fonksiyon içinde dokunur; Node'da güvenle yüklenir */
globalThis.document ??= { addEventListener() {}, documentElement: { lang: 'tr' }, querySelectorAll: () => [] };
const { cozguUstte, cevrim, RAPOR, CEVRIM_SN } = await import('../sahne/dokuma.mjs');
const { ilerlemeHesapla, kamera, cekmeEgrisi, S, ADIM } = await import('../sahne/surec.mjs');
const { ORGU, KUMASLAR, zikzak, karma, gurultu } = await import('../sahne/numune.mjs');
const { acikMi, istanbulZamani, saatEki } = await import('../sahne/saatler.mjs');
const { gecirgenlik, solma, lissajous, TESTLER } = await import('../sahne/laboratuvar.mjs');
/* çeviriler: TR açılış paketinde (ceviri.mjs JS.tr + index.html); EN/RU/DE/AR dil/*.mjs (SAYFA + JS) */
const { JS: JSc, DILLER } = await import('../ceviri.mjs');
const DIL_DOSYA = {};
for (const d of ['en', 'ru', 'de', 'ar']) DIL_DOSYA[d] = await import(`../dil/${d}.mjs`);
const EN = DIL_DOSYA.en.SAYFA;
const JS = { tr: JSc.tr, en: DIL_DOSYA.en.JS };
const { analiz, hazirMatris, HAZIR } = await import('../sahne/atolye.mjs');

console.log('örgü raporları');
{
  /* 2/1 dimi: her çözgü 3 atkıda 2 kez üstte; satır başına 1 adım kayar */
  for (let i = 0; i < 9; i++) {
    let ust = 0; for (let j = 0; j < 3; j++) ust += cozguUstte(i, j, false) ? 1 : 0;
    sina(`dimi 2/1 çözgü ${i}`, ust === 2, `${ust}/3`);
  }
  sina('dimi köşegen kayması', cozguUstte(0, 0, false) === cozguUstte(1, 1, false) && cozguUstte(3, 2, false) === cozguUstte(4, 3, false));
  /* 5'li saten: her satırda ve her sütunda tam 1 bağlantı; komşu satırlar bitişik değil */
  for (let j = 0; j < 5; j++) {
    let n = 0; for (let i = 0; i < 5; i++) n += cozguUstte(i, j, true) ? 1 : 0;
    sina(`saten satır ${j}`, n === 1, `${n}`);
  }
  for (let i = 0; i < 5; i++) {
    let n = 0; for (let j = 0; j < 5; j++) n += cozguUstte(i, j, true) ? 1 : 0;
    sina(`saten sütun ${i}`, n === 1, `${n}`);
  }
  const yer = (j) => [0, 1, 2, 3, 4].find((i) => cozguUstte(i, j, true));
  for (let j = 0; j < 5; j++) { const d = Math.abs(yer(j) - yer(j + 1)); sina(`saten bağlantılar bitişik değil ${j}`, d !== 1 && d !== 4, `${d}`); }
  sina('negatif indeks güvenli', typeof cozguUstte(-7, -3, true) === 'boolean' && cozguUstte(-1, 0, false) === cozguUstte(2, 0, false));
  const sayfa = readFileSync(join(KOK, 'index.html'), 'utf8');
  sina('künye: rapor sayısı koddan', sayfa.includes(`${RAPOR.TX} tel × ${RAPOR.TY} atkı`));
  /* künyede canlandırma hızı (52 atkı/dk) tezgâh verisi gibi okunuyordu, kaldırıldı; iplik satırı shader renklerini anlatır */
  sina('künye: canlandırma hızı tezgâh verisi olarak yazılmaz', !sayfa.includes('atkı / dk'));
  const enK = EN;
  sina('künye EN: rapor koddan', enK.kunyeRaporD.startsWith(`${RAPOR.TX} ends × ${RAPOR.TY} picks`) && !('kunyeHizD' in enK));
  sina('jakar raporu yarım atlamaya uygun (TY çift)', RAPOR.TY % 2 === 0 && RAPOR.MW < RAPOR.TX && RAPOR.MH < RAPOR.TY);
  /* numune örgüleri */
  const oran = (f, n = 20) => { let u = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) u += f(i, j) ? 1 : 0; return u / (n * n); };
  sina('bezayağı %50', yakin(oran(ORGU.bez), 0.5));
  sina('sepet örgü %50', yakin(oran(ORGU.sepet), 0.5));
  sina('dimi 2/1 ≈ 2/3', Math.abs(oran(ORGU.dimi21, 21) - 2 / 3) < 1e-9);
  sina('bezayağı her hücrede yön değişir', ORGU.bez(0, 0) !== ORGU.bez(1, 0) && ORGU.bez(0, 0) !== ORGU.bez(0, 1));
  for (const [ad, k] of Object.entries(KUMASLAR)) sina(`kumaş ${ad} örgüsü tanımlı`, typeof ORGU[k.orgu] === 'function' && k.P > 0);
  sina('karma 0–1', [...Array(200)].every((_, i) => { const h = karma(i, i * 7); return h >= 0 && h < 1; }));
  sina('gürültü sürekli', Math.abs(gurultu(3.999, 2) - gurultu(4.001, 2)) < 0.02);
  const z = zikzak(300, 200);
  sina('zikzak çokgeni', z.startsWith('polygon(') && (z.match(/px/g) || []).length > 100);
}

console.log('kumaş çizici (sahte 2B bağlam)');
{
  /* kumasCiz her hücreye bir dolgu + bir gölge kalıbı basar; renk örgüden gelir.
     Gölge kalıbı document.createElement('canvas') ister: Node'da en küçük sahte sağlanır. */
  const sahteTuval = () => ({ width: 0, height: 0, getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }) });
  const eski = globalThis.document.createElement;
  globalThis.document.createElement = () => sahteTuval();
  const kayit = [];
  const ctx = { set fillStyle(v) { this._f = v; }, get fillStyle() { return this._f; }, fillRect(x, y, w, h) { kayit.push([this._f, x, y, w, h]); }, drawImage() {}, globalAlpha: 1,
    save() {}, restore() {}, strokeRect() {}, setLineDash() {}, measureText: () => ({ width: 10 }), fillText() {} };
  const { kumasCiz } = await import('../sahne/numune.mjs');
  const tanim = { P: 5, orgu: (i, j) => (i + j) % 2 === 0, cozgu: '#c', atki: '#a' };
  kumasCiz(ctx, tanim, 0, 0, 50, 25, 1);
  sina('10 × 5 hücre çizildi', kayit.length === 50, String(kayit.length));
  sina('bezayağı: çözgü ve atkı dama tahtası', kayit.every(([f, x, y]) => f === (((x / 5) + (y / 5)) % 2 === 0 ? '#c' : '#a')));
  sina('hücreler boşluksuz döşenir', kayit.every(([, x, y, w, h]) => w === 5 && h === 5 && x % 5 === 0 && y % 5 === 0));
  kayit.length = 0;
  kumasCiz(ctx, tanim, 7, 3, 10, 10, 2);              /* kaydırılmış pencere, ölçek 2 (lup) */
  sina('lup: kaydırılmış pencerede hücre sınırları tamsayı', kayit.every(([, x, y, w, h]) => [x, y, w, h].every(Number.isInteger)));
  sina('lup: komşu hücreler arasında boşluk/bindirme yok', (() => { const xs = [...new Set(kayit.map((k) => k[1]))].sort((a, b) => a - b); return xs.every((x, i) => i === 0 || x - xs[i - 1] === kayit.find((k) => k[1] === xs[i - 1])[3]); })());
  globalThis.document.createElement = eski;
}

console.log('tezgâh çevrimi');
{
  const a = cevrim(0), b = cevrim(0.6), c = cevrim(0.8), d = cevrim(0.9999);
  sina('mekik başta 0', a.gecis === 0); sina('mekik 0.6\'da karşıda', b.gecis === 1);
  sina('tarak 0.8\'de kumaş ağzında', yakin(c.tarak, 1)); sina('tarak sonda dinlenmede', d.tarak < 0.001);
  sina('sarma vuruşla tamamlanır', yakin(c.sarma, 1) && a.sarma === 0);
  let tekdüze = true, onceki = -1;
  for (let f = 0; f <= 1; f += 0.01) { const s = cevrim(f).sarma; if (s < onceki - 1e-12) tekdüze = false; onceki = s; }
  sina('sarma azalmaz (kumaş geri gitmez)', tekdüze);
  /* çevrim sınırında sürekli: faz 1 → pick+1 ve faz 0; uPick = pick + sarma */
  sina('çevrim sınırında kumaş zıplamaz', yakin(0 + cevrim(0.99999).sarma, 1 + cevrim(0).sarma, 1e-6));
}

console.log('süreç hattı');
{
  sina('ilerleme sınırlı', ilerlemeHesapla(100, 4000, 900) === 0 && ilerlemeHesapla(-9999, 4000, 900) === 1);
  sina('ilerleme ortada', yakin(ilerlemeHesapla(-1550, 4000, 900), 0.5));
  sina('iz kısa ise 0', ilerlemeHesapla(-10, 500, 900) === 0);
  for (let i = 0; i < ADIM; i++) {
    const k = kamera(i / (ADIM - 1));
    sina(`istasyon ${i + 1} kamerada ortalanır`, yakin(k.x, i * S + S / 2) && k.etkin === i);
  }
  sina('çekme eğrisi 0\'da 0', cekmeEgrisi(0) === 0);
  let artan = true; for (let e = 0.01; e < 0.85; e += 0.01) if (cekmeEgrisi(e) < cekmeEgrisi(e - 0.01)) artan = false;
  sina('çekme eğrisi kopmaya dek artar', artan);
  sina('kopmadan sonra kuvvet düşer', cekmeEgrisi(0.9) < cekmeEgrisi(0.85) * 0.6);
  sina('eğri 0–1 aralığında', [...Array(101)].every((_, i) => { const f = cekmeEgrisi(i / 100); return f >= 0 && f <= 1; }));
}

console.log('laboratuvar');
{
  sina('altı test (5 laboratuvar + muayene)', TESTLER.length === 6);
  const g1 = gecirgenlik(20), g2 = gecirgenlik(40), g3 = gecirgenlik(56);
  sina('sıklık arttıkça geçirgenlik düşer', g1.gecis > g2.gecis && g2.gecis > g3.gecis);
  sina('boşluk 0–1', [g1, g2, g3].every((g) => g.bosluk >= 0 && g.bosluk <= 1));
  sina('geçirgenlik = boşluk³', yakin(g2.gecis, g2.bosluk ** 3));
  sina('solma: hassas referans önce solar', solma(0.5, 1) > solma(0.5, 4) && solma(0.5, 4) > solma(0.5, 8));
  sina('solma 0 pozlamada 0', solma(0, 3) === 0);
  sina('Lissajous birim daire içinde', [...Array(500)].every((_, i) => Math.hypot(...lissajous(i * 0.37)) <= 0.62 * Math.SQRT2 + 1e-9));
}

console.log('faaliyet haritası');
{
  const { KONUM, mesafe, izdusum, coz } = await import('../sahne/harita.mjs');
  const html = readFileSync(join(KOK, 'index.html'), 'utf8');
  sina('haversine: Çorlu–Çorlu 0 km', mesafe(KONUM.corlu, KONUM.corlu) === 0);
  sina('haversine: 1° boylam ekvatorda ≈ 111,2 km', Math.abs(mesafe([0, 0], [0, 1]) - 111.195) < 0.01);
  for (const u of ['az', 'tm', 'uz', 'kg', 'kz']) {
    const km = Math.round(mesafe(KONUM.corlu, KONUM[u]));
    const yazili = +(new RegExp(`class="harita__pin[^"]*" data-ulke="${u}"[^>]*>(?:(?!</span><span class="harita__pin).)*?data-km="([0-9]+)"`, 's').exec(html)?.[1]);
    sina(`${u}: düğümdeki mesafe koordinattan (${yazili} = ${km} km)`, yazili === km);
    const [x, y] = izdusum(KONUM[u][1], KONUM[u][0]);
    const pin = new RegExp(`data-ulke="${u}" style="--x:([0-9.]+)%;--y:([0-9.]+)%`).exec(html);
    sina(`${u}: haritadaki düğüm koordinatın izdüşümünde (±0,2 %)`, pin && Math.abs(+pin[1] - x / 1.34) < 0.2 && Math.abs(+pin[2] - y / 0.7) < 0.2, pin && `${pin[1]},${pin[2]} ↔ ${(x / 1.34).toFixed(2)},${(y / 0.7).toFixed(2)}`);
  }
  const z = coz();
  const kara = (lat, lon) => { const [x, y] = izdusum(lon, lat); return z.kara[Math.floor(y) * z.sutun + Math.floor(x)]; };
  sina('maske: başkentlerin hepsi karada, Karadeniz/Hazar/Akdeniz ortası suda', Object.values(KONUM).every(([la, lo]) => kara(la, lo)) && !kara(43, 34) && !kara(42, 50.5) && !kara(34, 33));
}

console.log('orijinal metne sadakat');
{
  const { cumleler, duzMetin, karsilastir, ISTISNA } = await import('./orijinal.mjs');
  const tum = cumleler();
  sina(`kaydedilmiş orijinal sayfalardan cümle çıkarıldı (${tum.length})`, tum.length >= 45);
  const sayfa = karsilastir(duzMetin(readFileSync(join(KOK, 'index.html'), 'utf8')));
  for (const { dosya, cumle } of tum) {
    if (ISTISNA.some((i) => i.dosya === dosya && cumle.startsWith(i.bas))) continue;
    sina(`orijinal cümle birebir: ${cumle.slice(0, 48)}…`, sayfa.includes(karsilastir(cumle)), dosya);
  }
  sina('her istisnanın gerekçesi var', ISTISNA.every((i) => i.neden && i.neden.length > 10));
}

console.log('kumaş muayenesi (4 puan)');
{
  const { hataPuani, yuzMetrekare } = await import('../sahne/muayene.mjs');
  sina('puan eşikleri 76/152/229 mm', [[76, 1], [77, 2], [152, 2], [153, 3], [229, 3], [230, 4], [900, 4]].every(([m, p]) => hataPuani(m) === p));
  /* kaynak örneği: 120 yd × 45″, 22 puan → 14,67 / 100 yd²; metrik karşılığı 14,67 × 100 / 83,61 */
  const metrik = yuzMetrekare(22, 120 * 0.9144, 45 * 2.54);
  sina('metrik formül emperyal örnekle tutarlı', Math.abs(metrik - (22 * 3600 / (45 * 120)) * 100 / 83.6127) < 0.01, metrik.toFixed(3));
  sina('sıfır uzunlukta 0', yuzMetrekare(5, 0) === 0);
}

console.log('örgü atölyesi analizi');
{
  const bez = analiz(hazirMatris('bez'));
  sina('bezayağı: %50, atlama 1/1, rapor 2×2', yakin(bez.cozguYuzu, 0.5) && bez.cozguAtlama === 1 && bez.atkiAtlama === 1 && bez.rapor.join() === '2,2', JSON.stringify(bez));
  const d21 = analiz(hazirMatris('dimi21'));
  sina('dimi 2/1: çözgü yüzü 2/3, çözgü atlaması 2, atkı 1, rapor 3×3', yakin(d21.cozguYuzu, 2 / 3) && d21.cozguAtlama === 2 && d21.atkiAtlama === 1 && d21.rapor.join() === '3,3', JSON.stringify(d21));
  const sat = analiz(hazirMatris('saten'));
  sina('5\'li saten: %20, atkı atlaması 4, rapor 5×5', yakin(sat.cozguYuzu, 0.2) && sat.atkiAtlama === 4 && sat.cozguAtlama === 1 && sat.rapor.join() === '5,5', JSON.stringify(sat));
  const sep = analiz(hazirMatris('sepet'));
  sina('panama 2/2: atlama 2/2, rapor 4×4', sep.cozguAtlama === 2 && sep.atkiAtlama === 2 && sep.rapor.join() === '4,4', JSON.stringify(sep));
  for (const ad of Object.keys(HAZIR)) { const a = analiz(hazirMatris(ad)); sina(`${ad}: bağlantısız iplik yok`, !a.bagsizSutun.length && !a.bagsizSatir.length); }
  const bos = analiz(Array.from({ length: 8 }, () => Array(8).fill(false)));
  sina('boş kâğıt: her çözgü bağlantısız, atlama ∞', bos.bagsizSutun.length === 8 && bos.atkiAtlama === Infinity);
  const tek = hazirMatris('bez'); for (let j = 0; j < 8; j++) tek[j][3] = true;
  const at = analiz(tek);
  sina('tam dolu sütun bağlantısız sayılır', at.bagsizSutun.includes(3) && at.cozguAtlama === Infinity);
  /* döngüsel atlama: rapor kenarından taşan atlama birleşir */
  sina('döngüsel çözgü atlaması kenardan birleşir (son + ilk satır)', analiz([[true], [false], [false], [true]]).cozguAtlama === 2);
  sina('döngüsel atkı atlaması kenardan birleşir (son + ilk sütun)', analiz([[false, true, true, false]]).atkiAtlama === 2);
}

console.log('çalışma saatleri (Europe/Istanbul)');
{
  /* 2026-10-10 cumartesi; İstanbul UTC+3 (yaz saati yok) */
  const t = (iso) => new Date(iso);
  const z = istanbulZamani(t('2026-10-10T06:30:00Z'));
  sina('UTC 06:30 → İstanbul cumartesi 09:30', z.gun === 6 && z.dakika === 570, JSON.stringify(z));
  sina('cumartesi 09:29 kapalı', !acikMi(t('2026-10-10T06:29:00Z')).acik);
  sina('cumartesi 09:30 açık', acikMi(t('2026-10-10T06:30:00Z')).acik);
  sina('cumartesi 21:59 açık', acikMi(t('2026-10-10T18:59:00Z')).acik);
  sina('cumartesi 22:00 kapalı', !acikMi(t('2026-10-10T19:00:00Z')).acik);
  const pazar = acikMi(t('2026-10-11T09:00:00Z'));
  sina('pazar kapalı, yarın 09:00', !pazar.acik && pazar.acilisGunu === 'gunYarin' && pazar.acilis === '09:00', JSON.stringify(pazar));
  const gece = acikMi(t('2026-10-12T21:00:00Z'));   /* pazartesi 24:00 → salı 00:00 */
  sina('salı gece yarısı → bugün 09:00', !gece.acik && gece.acilisGunu === 'gunBugun', JSON.stringify(gece));
  const cmtGece = acikMi(t('2026-10-10T20:00:00Z'));
  sina('cumartesi 23:00 → pazartesi açılır', !cmtGece.acik && cmtGece.acilisGunu === 'gunPazartesi', JSON.stringify(cmtGece));
  sina('hafta içi kapanış 20:00', acikMi(t('2026-10-12T10:00:00Z')).kapanis === '20:00');
  /* Türkçe saat eki okunuşa uyar (saatler değişirse "18:00’ye" gibi yanlış ek çıkmasın) */
  const ekler = { '20:00': 'ye/de', '22:00': 'ye/de', '09:00': 'a/da', '09:30': 'a/da', '18:00': 'e/de', '15:00': 'e/te', '16:00': 'ya/da', '10:00': 'a/da', '13:40': 'a/ta', '14:00': 'e/te', '08:50': 'ye/de', '21:00': 'e/de' };
  const yanlis = Object.entries(ekler).filter(([s, b]) => `${saatEki(s, 'e')}/${saatEki(s, 'de')}` !== b);
  sina('Türkçe saat eki 12 saatte doğru (yirmiye, on sekize, on beşte, kırkta…)', !yanlis.length, JSON.stringify(yanlis));
}

console.log('çeviri ve sayfa bütünlüğü');
{
  const html = readFileSync(join(KOK, 'index.html'), 'utf8');
  const anahtarlar = new Set([...html.matchAll(/data-i18n(?:-aria|-alt)?="([^"]+)"/g)].map((m) => m[1]));
  const eksik = [...anahtarlar].filter((k) => !(k in EN) && !(k in JS.en));
  sina('HTML\'deki her anahtarın İngilizcesi var', eksik.length === 0, eksik.join(', '));
  /* anahtarın var olması yetmez: atoArmurEtiket bir heredoc kaçış hatasıyla '\x01' olmuştu ve geçiyordu (10 Ekim) */
  const DENETIM = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
  const bosEn = [...anahtarlar].filter((k) => k in EN && (!String(EN[k]).trim() || DENETIM.test(EN[k])));
  sina('her EN değeri dolu ve denetim karaktersiz', bosEn.length === 0, bosEn.join(', '));
  const { readdirSync: rd } = await import('node:fs');
  const kaynaklar = ['index.html', '404.html', 'site.css', 'site.mjs', 'ceviri.mjs', ...rd(join(KOK, 'sahne')).filter((f) => f.endsWith('.mjs')).map((f) => `sahne/${f}`), ...rd(join(KOK, 'dil')).map((f) => `dil/${f}`)];
  const bozuk = kaynaklar.filter((f) => DENETIM.test(readFileSync(join(KOK, f), 'utf8')));
  sina('kaynak dosyalarda denetim karakteri yok', bozuk.length === 0, bozuk.join(', '));
  const fazla = Object.keys(EN).filter((k) => !anahtarlar.has(k));
  sina('EN sözlüğünde kullanılmayan anahtar yok', fazla.length === 0, fazla.join(', '));
  const trK = Object.keys(JS.tr).sort().join(), enK = Object.keys(JS.en).sort().join();
  sina('JS metinleri iki dilde aynı anahtarlarla', trK === enK);
  for (const [k, v] of Object.entries(JS.tr)) {
    /* {e} ve {de} yalnız Türkçe saat ekidir (saatEki): İngilizcede karşılığı olmaz */
    const yer = (s) => (s.match(/\{[a-z]+\}/g) || []).filter((y) => y !== '{e}' && y !== '{de}').sort().join();
    sina(`yer tutucular eşleşir: ${k}`, yer(v) === yer(JS.en[k]), `${yer(v)} ≠ ${yer(JS.en[k])}`);
  }
  /* RU / DE / AR: EN ile aynı sözleşme — HTML'deki her anahtar (fazlası yok), JS.tr'deki her anahtar, yer tutucular,
     vurgu işaretleri ([[…]] sayısı EN ile aynı), dolu ve denetim karaktersiz değer */
  sina('ceviri.mjs beş dili tanır', ['tr', 'en', 'ru', 'de', 'ar'].every((d) => DILLER.includes(d)));
  const yerT = (x) => (String(x).match(/\{[a-z]+\}/g) || []).filter((y) => y !== '{e}' && y !== '{de}').sort().join();
  const vurguSay = (x) => (String(x).match(/\[\[/g) || []).length;
  for (const d of ['ru', 'de', 'ar']) {
    const { SAYFA, JS: J } = DIL_DOSYA[d];
    const eks = [...anahtarlar].filter((k) => !(k in SAYFA) && !(k in J)), faz = Object.keys(SAYFA).filter((k) => !anahtarlar.has(k));
    sina(`${d}: HTML'deki her anahtar var, fazlası yok`, !eks.length && !faz.length, [...eks, ...faz.map((k) => '+' + k)].join(', '));
    const jEks = Object.keys(JS.tr).filter((k) => !(k in J)), jFaz = Object.keys(J).filter((k) => !(k in JS.tr));
    sina(`${d}: JS anahtarları JS.tr ile aynı`, !jEks.length && !jFaz.length, [...jEks, ...jFaz.map((k) => '+' + k)].join(', '));
    const bos = [...Object.entries(SAYFA), ...Object.entries(J)].filter(([, v]) => !String(v).trim() || DENETIM.test(v)).map(([k]) => k);
    sina(`${d}: her değer dolu ve denetim karaktersiz`, !bos.length, bos.join(', '));
    const yerBoz = Object.keys(JS.tr).filter((k) => k in J && yerT(J[k]) !== yerT(JS.tr[k]));
    sina(`${d}: yer tutucular TR ile eşleşir`, !yerBoz.length, yerBoz.join(', '));
    const vBoz = Object.keys(EN).filter((k) => k in SAYFA && vurguSay(SAYFA[k]) !== vurguSay(EN[k]));
    sina(`${d}: vurgu işaretleri EN ile aynı sayıda`, !vBoz.length, vBoz.join(', '));
  }
  /* JS'in istediği anahtarlar mevcut */
  /* bütün sahne modülleri taranır (önceden yalnız birkaç dosya okunuyordu, atölye/muayene anahtarları sınanmıyordu) */
  const { readdirSync: dizin } = await import('node:fs');
  const jsDosyalar = ['site.mjs', 'ceviri.mjs', ...dizin(join(KOK, 'sahne')).filter((f) => f.endsWith('.mjs')).map((f) => 'sahne/' + f)];
  const kaynak = jsDosyalar.map((f) => readFileSync(join(KOK, f), 'utf8')).join('\n');
  const istenen = new Set([...kaynak.matchAll(/metin\('([a-zA-Z0-9]+)'\)/g)].map((m) => m[1]));
  for (let k = 1; k <= 6; k++) { istenen.add('test' + k); istenen.add(`test${k}Metin`); }
  const yok = [...istenen].filter((k) => !(k in JS.tr) && !anahtarlar.has(k));
  sina('JS\'in kullandığı her anahtar tanımlı', yok.length === 0, yok.join(', '));
  /* JS sözlüğünde kullanılmayan anahtar yok (dinamik kurulanlar: test6Metin, olculen3, kontrol5, zemin2, gunX, hizmetFoto_<id>) */
  const dinamik = /^(test\dMetin|olculen\d|kontrol\d|zemin\d|gun[A-ZÇĞİÖŞÜ][a-zçğıöşü]+|hizmetFoto_[a-z]+)$/;
  const atil = Object.keys(JS.tr).filter((k) => !dinamik.test(k) && !kaynak.includes(`'${k}'`));
  sina('JS sözlüğünde kullanılmayan anahtar yok', atil.length === 0, atil.join(', '));
  /* yerel dosya başvuruları */
  const yollar = [...html.matchAll(/(?:src|href|srcset)="([^"#][^"]*)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(' ')[0]))
    .filter((p) => p && !/^(https?:|mailto:|tel:|data:)/.test(p));
  const kayip = [...new Set(yollar)].filter((p) => !existsSync(join(KOK, decodeURI(p))));
  sina('HTML\'deki her yerel dosya var', kayip.length === 0, kayip.join(', '));
  /* görsellerde genişlik/yükseklik (yerleşim kayması olmasın) ve alt metni */
  const img = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => /\ssrc="/.test(t));
  sina('her <img> width/height taşır', img.every((t) => /\swidth="\d+"/.test(t) && /\sheight="\d+"/.test(t)));
  sina('her <img> alt taşır', img.every((t) => /\salt="/.test(t)));
  const idler = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  sina('id\'ler tekil', idler.length === new Set(idler).size, idler.filter((x, i) => idler.indexOf(x) !== i).join(', '));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) sina(`çapa #${m[1]} hedefi var`, idler.includes(m[1]));
  /* ekran okuyucu başvuruları sarkmasın (etiket/açıklama/denetlenen öğe silinip başvuru kalırsa sessizce boşa düşer) */
  const sarkan = [...html.matchAll(/\s(?:aria-labelledby|aria-describedby|aria-controls|for)="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((r) => !idler.includes(r));
  sina('aria-labelledby / describedby / controls / for başvurularının hedefi var', !sarkan.length, sarkan.join(', '));
  /* erişilebilirlik (statik): düğme adı, alan etiketi, başlık sırası, dil */
  const govde = html.slice(html.indexOf('<body'));
  const dugmeler = [...govde.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  /* erişilebilir ad: aria-label, ya da aria-hidden olmayan metin, ya da içteki img alt'ı */
  const adMetni = (ic) => ic.replace(/<(\w+)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]+>/g, '').trim();
  const adsiz = dugmeler.filter(([, oz, ic]) => !/aria-label="[^"]+"/.test(oz) && !adMetni(ic));
  sina(`her düğmenin erişilebilir adı var (${dugmeler.length} düğme)`, adsiz.length === 0, adsiz.map((d) => d[0].slice(0, 60)).join(' | '));
  const alanlar = [...govde.matchAll(/<(input|textarea|select)\b([^>]*)>/g)].filter(([, , oz]) => !/type="(hidden|submit)"/.test(oz));
  const etiketsiz = alanlar.filter(([tam, , oz]) => {
    const id = /id="([^"]+)"/.exec(oz)?.[1];
    if (/aria-label="/.test(oz) || (id && govde.includes(`for="${id}"`))) return false;
    /* <label> içine sarılmış alan */
    const once = govde.slice(0, govde.indexOf(tam));
    return once.lastIndexOf('<label') <= once.lastIndexOf('</label>');
  });
  sina(`her form alanının etiketi var (${alanlar.length} alan)`, etiketsiz.length === 0, etiketsiz.map((a) => a[0].slice(0, 60)).join(' | '));
  const duzeyler = [...govde.matchAll(/<h([1-6])\b/g)].map((m) => +m[1]);
  sina('tek h1', duzeyler.filter((d) => d === 1).length === 1);
  const atlayan = duzeyler.findIndex((d, i) => i > 0 && d > duzeyler[i - 1] + 1);
  sina('başlık düzeyleri atlamıyor', atlayan < 0, atlayan >= 0 ? `h${duzeyler[atlayan - 1]} → h${duzeyler[atlayan]}` : '');
  sina('html lang tanımlı', /<html lang="tr">/.test(html));
  /* arama sonucu kesilmesin: başlık ≤ 60, açıklama ≤ 160 (TR HTML'de, EN ceviri.mjs'te) */
  const aciklamaTR = /<meta name="description" content="([^"]+)"/.exec(html)?.[1] || '';
  sina(`meta açıklama TR ≤ 160 (${aciklamaTR.length})`, aciklamaTR.length > 50 && aciklamaTR.length <= 160);
  sina('sayfaAciklama TR = HTML meta açıklaması (dil dönüşünde aynı metin)', JS.tr.sayfaAciklama === aciklamaTR);
  for (const d of ['en', 'ru', 'de', 'ar']) { const a = DIL_DOSYA[d].JS.sayfaAciklama || '', b = DIL_DOSYA[d].JS.sayfaBaslik || ''; sina(`${d}: açıklama ≤ 160 (${a.length}), başlık ≤ 70 (${b.length})`, a.length > 50 && a.length <= 160 && b.length > 10 && b.length <= 70); }
  /* paylaşım önizlemesi göreli görsel adresini çözmez: og:image, og:url ve JSON-LD görseli mutlak olmalı ve dosya var olmalı */
  const ogGorsel = /property="og:image" content="([^"]+)"/.exec(html)?.[1] || '';
  sina(`og:image mutlak ve dosyası var (${ogGorsel})`, ogGorsel.startsWith('https://www.antratech.net/') && existsSync(join(KOK, ogGorsel.replace('https://www.antratech.net/', ''))));
  /* çalışma saatleri dört yerde: saatler.mjs (canlı açık/kapalı), JSON-LD, iletişim ve alt bilgi tabloları — biri değişirse hepsi değişmeli */
  {
    const { SAATLER } = await import('../sahne/saatler.mjs');
    const ss = (dk) => `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]).openingHoursSpecification;
    const hi = ld.find((o) => Array.isArray(o.dayOfWeek)), cmt = ld.find((o) => o.dayOfWeek === 'Saturday');
    const ldUyar = [1, 2, 3, 4, 5].every((g) => ss(SAATLER[g][0]) === hi.opens && ss(SAATLER[g][1]) === hi.closes) && ss(SAATLER[6][0]) === cmt.opens && ss(SAATLER[6][1]) === cmt.closes && SAATLER[0] === null && !ld.some((o) => o.dayOfWeek === 'Sunday');
    sina('JSON-LD çalışma saatleri saatler.mjs ile aynı', ldUyar, JSON.stringify(ld));
    const tablo = (g) => `${ss(SAATLER[g][0])} – ${ss(SAATLER[g][1])}`;
    sina('iletişim ve alt bilgi saat tabloları saatler.mjs ile aynı (ikişer kez)', html.split(`<dd>${tablo(1)}</dd>`).length === 3 && html.split(`<dd>${tablo(6)}</dd>`).length === 3);
  }
  /* telefon tel:, WhatsApp, JSON-LD ve görünen metinde aynı numara olmalı */
  const numaralar = new Set([...html.matchAll(/tel:\+?(\d+)|wa\.me\/(\d+)|"telephone":"([^"]+)"|>(0\d{3} \d{3} \d{2} \d{2})</g)].map((m) => (m[1] || m[2] || m[3] || m[4]).replace(/\D/g, '').slice(-10)));
  sina(`telefon her biçimde tek numara (${[...numaralar].join(', ')})`, numaralar.size === 1);
  sina('og:url ve JSON-LD görseli mutlak', /property="og:url" content="https:\/\//.test(html) && /"image":"https:\/\//.test(html));
  sina('başlık ≤ 60', (/<title>([^<]+)/.exec(html)?.[1] || '').length <= 60);
  sina('canlı tuvallerin metin karşılığı var', [...govde.matchAll(/<canvas\b([^>]*)>/g)].filter(([, oz]) => /role="img"|role="application"/.test(oz)).every(([, oz]) => /aria-label="[^"]+"/.test(oz)));
  /* CSP: her satır içi betiğin sha256'sı vercel.json'da (yoksa yayında betik engellenir) */
  const { createHash } = await import('node:crypto');
  const vercel = JSON.parse(readFileSync(join(KOK, 'vercel.json'), 'utf8'));
  const csp = vercel.headers.find((b) => b.source === '/(.*)')?.headers.find((h) => h.key === 'Content-Security-Policy')?.value || '';
  for (const dosya of ['index.html', '404.html']) {
    const icerik = readFileSync(join(KOK, dosya), 'utf8');
    for (const m of icerik.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|module)")[^>]*>([\s\S]*?)<\/script>/g)) {
      const h = `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`;
      sina(`CSP ${dosya} satır içi betik hash'i`, csp.includes(h), h);
    }
  }
  /* eski site yönlendirmeleri: hedef çapa sayfada (ya da hizmet kimliği) var */
  const hizmetIdleri = [...html.matchAll(/data-hizmet="([a-z]+)"/g)].map((m) => m[1]);
  for (const y of vercel.redirects || []) {
    const cap = y.destination.split('#')[1];
    const var_ = !cap || idler.includes(cap) || (cap.startsWith('hizmet-') && hizmetIdleri.includes(cap.slice(7)));
    sina(`yönlendirme ${y.source} → ${y.destination}`, var_ && y.permanent === true);
  }
  /* baş betiğindeki erken dil tahmini ceviri.mjs ile aynı kaynakları okumalı (yoksa yanlış dilde gizlenir/parlar) */
  const basBetik = /<script>([^<]*dil-bekle[^<]*)<\/script>/.exec(html)?.[1] || '';
  const ceviriKaynak = readFileSync(join(KOK, 'ceviri.mjs'), 'utf8');
  for (const anahtar of ["'antratech-dil'", "get('dil')", "/bot|crawl|spider|slurp/i"]) sina(`erken dil tahmini ve ceviri.mjs aynı kaynağı okur: ${anahtar}`, basBetik.includes(anahtar) && ceviriKaynak.includes(anahtar));
  sina('erken dil tahmini beş dili tanır ve Arapçada yönü erken kurar', ['tr', 'en', 'ru', 'de', 'ar'].every((d) => basBetik.includes(`'${d}'`)) && /h\.dir='rtl'/.test(basBetik));
  sina('erken dil tahmininin güvenlik zaman aşımı var', /setTimeout\(function\(\)\{[^}]*remove\('dil-bekle'\)/.test(basBetik));
  /* JS kapalıyken form adres çubuğuna kişisel veri yazmasın: mailto eylemi + CSP form-action izni */
  sina('iletişim formunun JS’siz mailto eylemi var ve CSP form-action buna izin veriyor', /<form[^>]*id="iletisim-formu"[^>]*action="mailto:/.test(html) && /form-action [^;]*mailto:/.test(csp));
  sina('CSP: object-src none, frame-ancestors none', /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp));
  /* hizmet penceresinin sahadan fotoğrafları JS'te kurulur (HTML yol denetimi görmez): her kimlik için iki boy var mı */
  const fotoKume = /HIZMET_FOTO = new Set\(\[([^\]]+)\]\)/.exec(readFileSync(join(KOK, 'sahne/hizmet.mjs'), 'utf8'))?.[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1)) || [];
  sina(`hizmet fotoğrafları yerinde (${fotoKume.length} hizmet × 480/800)`, fotoKume.length >= 5 && fotoKume.every((id) => [480, 800].every((w) => existsSync(join(KOK, `gorseller/boyut/hizmet-${id}-${w}.webp`)))));
  sina('her hizmet fotoğrafının beş dilde alt metni var', fotoKume.every((id) => `hizmetFoto_${id}` in JS.tr && ['en', 'ru', 'de', 'ar'].every((d) => `hizmetFoto_${id}` in DIL_DOSYA[d].JS)));
  /* ağırlık bütçesi */
  const kb = (p) => statSync(join(KOK, p)).size / 1024;
  /* açılışta yüklenen JS (ilk boyamayı etkiler) ve tembel yüklenen JS ayrı bütçelenir; sahne klasöründeki her dosya sayılır */
  const { readdirSync } = await import('node:fs');
  const sahne = readdirSync(join(KOK, 'sahne')).filter((f) => f.endsWith('.mjs')).map((f) => `sahne/${f}`);
  const acilis = ['site.mjs', 'ceviri.mjs', 'sahne/dokuma.mjs'];
  const tembel = sahne.filter((f) => !acilis.includes(f));
  const top = (l) => l.reduce((t, p) => t + kb(p), 0);
  sina(`açılış JS ≤ 72 kB (${top(acilis).toFixed(1)} kB, sıkıştırmasız)`, top(acilis) <= 72);
  /* tembel bütçe 2026-10-10'da 110 → 210 kB: 2,5B süreç maketi ve laboratuvar cihazları (surec3b, lab3b, uc-ortak, gpu) ile
     kanaviçe harita eklendi; hepsi bölümlerine yaklaşınca iner (gzip ≈ 62 kB). İçindeki 2B yedekler (surec.mjs, laboratuvar
     çizicileri) yalnız WebGL yoksa ya da yazılımsal çizicide çalışır. three.js ayrı kalem (aşağıda). */
  /* 210 → 220 kB (13:50): harita sınır katmanı (Natural Earth) harita-veri.mjs'e 4,9 kB veri ekledi; kod değil, üretilmiş ızgara */
  /* 220 → 240 kB (10 Ekim, 3. tur): 2,5B hat istasyon istasyon yeniden kuruldu (pahlı gövdeler, çivili bant, ring makinesi,
     çözgü makinesi, hava jetli tezgâh, ramöz kanalları, tır); surec3b 31,0 → 54,3 kB (gzip 10,7 → 17,2 kB). Ölü kod taraması:
     tek kullanımlı tanımlayıcı ve kullanılmayan malzeme yok. Tembel toplam gzip 80,3 kB. */
  /* 240 → 250 kB (10 Ekim, 4. tur): kamyon yeniden (profil kabin, tandem, jant), T6 muayene sahnesi, sahne aynı düzlem kancası. */
  sina(`tembel JS ≤ 250 kB (${top(tembel).toFixed(1)} kB, ${tembel.length} dosya)`, top(tembel) <= 250);
  /* three.js r184: yalnız 3B modüllerin ortak kapısından (uc-ortak.mjs) yüklenir; açılış modülleri onu içe aktarmaz */
  const vendorDosya = ['vendor/three-r184/three.module.min.js', 'vendor/three-r184/three.core.min.js'];
  sina(`three.js r184 yerinde, ≤ 760 kB ham (${top(vendorDosya).toFixed(0)} kB)`, vendorDosya.every((f) => existsSync(join(KOK, f))) && top(vendorDosya) <= 760);
  sina('açılış modülleri three.js içe aktarmaz', acilis.every((f) => !readFileSync(join(KOK, f), 'utf8').includes('vendor/')));
  sina('three.js yalnız uc-ortak.mjs üzerinden yüklenir', sahne.filter((f) => readFileSync(join(KOK, f), 'utf8').includes('vendor/three')).join() === 'sahne/uc-ortak.mjs');
  const kullanilan = readFileSync(join(KOK, 'site.mjs'), 'utf8') + tembel.map((f) => readFileSync(join(KOK, f), 'utf8')).join('');
  for (const f of sahne) sina(`${f} bir yerden içe aktarılıyor`, kullanilan.includes(f.replace('sahne/', './').replace('./', '')) || readFileSync(join(KOK, 'site.mjs'), 'utf8').includes(f));
  /* CSS bütçesi aktarılan (gzip) boyut üzerinden: ağda giden budur; ham boyut yorum ve okunurlukla şişer */
  const { gzipSync } = await import('node:zlib');
  const cssGz = gzipSync(readFileSync(join(KOK, 'site.css')), { level: 6 }).length / 1024;
  /* 16 → 20 kB (2026-10-10): kanaviçe harita, askılı numuneler, güvence panosu, kurumlar, mozaik galeri, 3B laboratuvar düzeni */
  sina(`CSS gzip ≤ 20 kB (${cssGz.toFixed(1)} kB; ham ${kb('site.css').toFixed(1)} kB)`, cssGz <= 20);
  /* :has() bilmeyen tarayıcı (Firefox < 121, Safari < 15.4) seçici listesini bütünüyle düşürür: :has tek başına kural olmalı */
  const cssMetin = readFileSync(join(KOK, 'site.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hasListe = [...cssMetin.matchAll(/([^{}]*:has\([^{}]*)\{/g)].map((m) => m[1].trim()).filter((sec) => sec.replace(/\([^()]*\)/g, '').includes(','));
  sina(':has() içeren kural seçici listesi taşımaz', !hasListe.length, hasListe.join(' | '));
}

console.log(`\n${gecen} geçti · ${dusen} düştü`);
process.exit(dusen ? 1 : 0);
