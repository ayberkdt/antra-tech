/* ÇEVİRİ — TR / EN / RU / DE / AR.
 *
 * Türkçe metnin tek kaynağı index.html'dir: açılışta her [data-i18n] öğesinin metni
 * (ve -aria / -alt öznitelikleri) "tr" olarak okunur. Bu sözlükte yalnız:
 *   · yalnız JS'in kullandığı Türkçe anahtarlar (JS.tr)
 *   · EN, RU, DE, AR: dil/*.mjs (SAYFA: HTML'deki her anahtar · JS: JS.tr'deki her anahtar), yalnız seçilince indirilir;
 *     anahtar kümeleri, yer tutucular ve vurgu işaretleri dogrula.mjs'te sınanır
 * Orijinal sitenin İngilizce sürümü şablon dolgu metni içerdiğinden İngilizceler
 * bu sitenin çevirisidir (README'de belirtildi).
 */

export const DILLER = ['tr', 'en', 'ru', 'de', 'ar'];
/* menüde dilin kendi adıyla; yerel ayar sayı biçimi için (Arapçada rakamlar Latin: ölçü değerleri teknik belgelerdeki gibi) */
export const DIL_AD = { tr: 'Türkçe', en: 'English', ru: 'Русский', de: 'Deutsch', ar: 'العربية' };
const YEREL = { tr: 'tr-TR', en: 'en-GB', ru: 'ru-RU', de: 'de-DE', ar: 'ar-u-nu-latn' };
const YON = { tr: 'ltr', en: 'ltr', ru: 'ltr', de: 'ltr', ar: 'rtl' };

/* Yalnız JS'in kullandığı metinler */
export const JS = {
  tr: {
    menuKapat: 'Menüyü kapat',
    dilEtiket: 'Dil: Türkçe. Dil listesini aç',
    dilListe: 'Dil seçimi',
    sayfaBaslik: 'Antra Tech — Teknik Tekstil ve Üretim Kontrolü',
    sayfaAciklama: 'Antra Tech; teknik tekstil, savunma tekstilleri, üretim kontrolü ve laboratuvar testlerinde 30 yılı aşkın tecrübeye sahip mühendislik firması. Çorlu, Tekirdağ.',
    simdiAcik: 'Şu an açığız · {saat}’{e} kadar',
    simdiKapali: 'Şu an kapalıyız · {gun} {saat}’{de} açılıyoruz',
    gunBugun: 'bugün', gunYarin: 'yarın', gunPazar: 'pazar', gunPazartesi: 'pazartesi', gunSali: 'salı', gunCarsamba: 'çarşamba', gunPersembe: 'perşembe', gunCuma: 'cuma', gunCumartesi: 'cumartesi',
    formEksik: 'Lütfen adınızı ve mesajınızı yazın.',
    formEpostaHatali: 'E-posta adresi eksik görünüyor; kontrol eder misiniz?',
    formHazir: 'Mesajınız e-posta uygulamanızda açıldı. Açılmadıysa info@antratech.net adresine yazabilirsiniz.',
    formKopyalandi: 'Mesaj kopyalandı: web postanıza yapıştırıp info@antratech.net adresine gönderebilirsiniz.',
    formKopyalanamadi: 'Kopyalanamadı; mesaj alanındaki metni seçip kopyalayabilirsiniz.',
    formOnDoldur: 'Merhaba, "{hizmet}" hizmetiniz hakkında bilgi almak istiyorum.',
    test1Metin: 'Numune iki çene arasında sabit hızla çekilir; kopma anındaki kuvvet ve uzama kaydedilir. Kuvvet–uzama eğrisi kumaşın ne kadar yük taşıyıp ne kadar esneyeceğini gösterir.',
    test2Metin: 'Numune, Lissajous eğrisi çizen bir sürtme başlığının altında binlerce tur döner. İplik kopuşu ya da tüylenme görülene kadar geçen devir sayısı aşınma direncini verir.',
    test3Metin: 'Numune ve mavi yün referansları yapay gün ışığı altında birlikte bekletilir; solma, gri skala ile derecelendirilir. Ter haslığında numune yapay ter çözeltisiyle temas ettirilir.',
    test4Metin: 'Kumaşın iki yüzü arasında sabit basınç farkı oluşturulur; birim alandan geçen hava ya da su buharı ölçülür. Sıklık arttıkça geçirgenlik düşer.',
    test5Metin: 'Dikey tutulan numuneye belirli süre alev uygulanır; alev çekildikten sonra yanma süresi, kor ve hasar boyu ölçülür. Kimyasal dayanımda numune ajanlara maruz bırakılıp yeniden test edilir.',
    lab1Olcum: 'Kuvvet {f} N · uzama %{e}',
    lab1Kopma: 'Kopma: {f} N · %{e}',
    lab2Olcum: 'Devir {n}',
    lab3Olcum: 'Pozlama {s} sa · solma derecesi {d}',
    lab4Olcum: 'Sıklık {s} tel/cm · geçirgenlik {g}',
    lab4Surgu: 'Kumaş sıklığı',
    lab5Olcum: 'Alev {s} s · hasar boyu {h} mm',
    panel1Baslik: 'Kuvvet – uzama', panelUzama: 'uzama', panelKopma: 'KOPMA', panelDevir: 'devir', panelTuylenme: 'TÜYLENME DERECESİ', panel3Baslik: 'Mavi yün 1–8', panelSaat: 'saat pozlama', panelGriSkala: 'GRİ SKALA', panel4Baslik: 'Hava geçirgenliği', panelTelCm: 'tel/cm', panelGecirgenlik: 'GEÇİRGENLİK', panel5Baslik: 'Hasar boyu', panelAlev: 'alev', panelAlevVar: 'ALEV VAR', panelKorSifir: 'KOR SÜRESİ 0 s',
    lab3Ksenon: 'KSENON', lab3Ortulu: 'örtülü', lab3Pozlanan: 'pozlanan', lab3MaviYun: 'MAVİ YÜN 1–8', lab3Serit: 'ÇOK LİFLİ ŞERİT · TER', lab5Damla: 'KİMYASAL DAMLA',
    test6Metin: 'Kumaş ışıklı muayene masasında metre metre akar; muayeneci her hatayı boyuna göre 1–4 puanla işaretler (4 puan sistemi). Toplam puan 100 m²’ye oranlanır; kabul sınırını alıcı ile üretici birlikte belirler.',
    lab6Olcum: '{i} hata · {p} puan · {m} m muayene · 100 m²’de {o} puan',
    lab6Cizgi: 'muayene çizgisi',
    lab6Anahtar: '4 PUAN · HATA BOYU',
    lab6Kayit: 'MUAYENE KAYDI',
    lab6Oran: '100 m² BAŞINA PUAN',
    lab6Tur_atki: 'Atkı kaçığı',
    lab6Tur_leke: 'Leke',
    lab6Tur_dugum: 'Düğüm',
    lab6Tur_delik: 'Delik',
    lab6TuvalEtiket: 'Kumaş muayenesi: hatalar muayene çizgisinde boylarına göre 1–4 puanla işaretlenir',
    adimaGit: 'Adım {n}: {ad} — bu istasyona git',
    olculen1: 'Kopma kuvveti (N)|Kopma uzaması (%)|Kuvvet–uzama eğrisi|Yırtılma kuvveti (N)',
    olculen2: 'Devir sayısı|Kütle kaybı|Tüylenme derecesi|Görünüm değişimi',
    olculen3: 'Renk değişimi (gri skala)|Lekeleme|Pozlama süresi|Mavi yün referansı',
    olculen4: 'Hava geçirgenliği|Su buharı geçirgenliği|Basınç farkı|Kumaş sıklığı',
    olculen5: 'Yanma süresi (s)|Kor süresi (s)|Hasar boyu (mm)|Kimyasal sonrası tekrar test',
    olculen6: 'Hata türü|Hata boyu → puan|100 m² başına puan|Kabul sınırı (sözleşme)',
    zemin0: "2/1 dimi zemin, 5'li saten desen", zemin1: "Bezayağı zemin, 5'li saten desen", zemin2: "2/2 panama zemin, 5'li saten desen",
    kontrol1: 'Kontrol: lif inceliği · nem', kontrol2: 'Kontrol: numara · büküm', kontrol3: 'Kontrol: tel gerginliği',
    kontrol4: 'Kontrol: sıklık · örgü', kontrol5: 'Kontrol: renk · haslık', kontrol6: 'Kontrol: mukavemet · rapor',
    kontrol7: 'Kontrol: hata işaretleme', kontrol8: 'Kontrol: etiket · izlenebilirlik',
    atolyeYuz: 'Çözgü yüzü', atolyeCozguYuzlu: 'çözgü yüzlü', atolyeAtkiYuzlu: 'atkı yüzlü', atolyeDengeli: 'dengeli',
    atolyeAtlama: 'En uzun atlama (çözgü / atkı)', atolyeRapor: 'Rapor',
    atolyeBagsiz: 'Üretime uygun değil: bir çözgü ya da atkı hiç yön değiştirmiyor, kumaşa bağlanmaz.',
    atolyeUzun: 'Dikkat: 5 ya da daha fazla ipliği atlayan bağlar takılmaya açıktır, aşınma direncini düşürür.',
    atolyeTamam: 'Üretime uygun: bütün iplikler bağlı, atlamalar kısa.',
    hizmetFoto_savunma: 'Kamuflaj üniforma, kask ve solunum maskesi takmış bir asker.',
    hizmetFoto_laboratuvar: 'Laboratuvarda çekme test cihazının çenelerine lacivert kumaş numunesi yerleştiren bir mühendis.',
    hizmetFoto_kontrol: 'Kamuflaj kumaş topunun başında tabletten kalite verilerini inceleyen iki kontrol uzmanı.',
    hizmetFoto_entegre: 'Üretim hattında kumaşı inceleyen beyaz önlüklü bir teknisyen; önde kumaş topları, arkada izleme ekranı.',
    hizmetFoto_danismanlik: 'Masadaki kamuflaj kumaşı ve teknik çizimler üzerinde çalışan üç kişilik ekip.',
    atolyeCerceve: '{n} çerçeve',
    atolyeTezgah: '{n} gücü çerçeveli armürlü tezgâhta dokunur. Plan: üstte tahar, sağda kalkış sırası.',
    atolyeTezgahYok: 'Bağlantısız iplik düzeltilmeden dokunamaz.',
    atolyeIpucu: 'Desen fikrinizi, kullanım alanını ve yaklaşık miktarı yazın; detayları birlikte konuşalım.',
    atolyeHucreCozgu: 'Satır {s}, sütun {k}: çözgü üstte', atolyeHucreAtki: 'Satır {s}, sütun {k}: atkı üstte',
  },
};

let dil = 'tr';
const TR = {};          /* HTML'den okunan Türkçe */
let kuruldu = false;
/* EN / RU / DE / AR yalnız seçilince indirilir (dil/*.mjs: SAYFA + JS); açılış paketinde yalnız Türkçe (açılış JS ≤ 72 kB) */
const SOZ = {};
const yukleniyor = {};
function sozlukYukle(d) {
  if (d === 'tr' || SOZ[d]) return Promise.resolve();
  return (yukleniyor[d] ??= import(`./dil/${d}.mjs`).then((m) => { SOZ[d] = m; }));
}

/* vurgulu metin: HTML'deki <em class="vurgu"> çeviride [[…]] olarak taşınır */
const vurguOku = (el) => [...el.childNodes].map((d) => (d.nodeType === 1 && d.matches('em.vurgu') ? `[[${d.textContent}]]` : d.textContent)).join('');
function metinYaz(el, m) {
  if (!m.includes('[[')) { el.textContent = m; return; }
  el.replaceChildren(...m.split(/(\[\[[^\]]+\]\])/).filter(Boolean).map((p) => {
    if (!p.startsWith('[[')) return document.createTextNode(p);
    const em = document.createElement('em'); em.className = 'vurgu'; em.textContent = p.slice(2, -2); return em;
  }));
}
function trOku() {
  for (const el of document.querySelectorAll('[data-i18n]')) { const k = el.dataset.i18n; if (!(k in TR)) TR[k] = el.querySelector('em.vurgu') ? vurguOku(el) : el.textContent; }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) { const k = el.dataset.i18nAria; if (!(k in TR)) TR[k] = el.getAttribute('aria-label'); }
  for (const el of document.querySelectorAll('[data-i18n-alt]')) { const k = el.dataset.i18nAlt; if (!(k in TR)) TR[k] = el.getAttribute('alt'); }
}

/* sırası: seçili dilin JS + sayfa metni → İngilizce → Türkçe (eksik anahtar boş görünmez; doğrulayıcı eksiği yakalar) */
export function metin(anahtar) {
  if (dil === 'tr') return JS.tr[anahtar] ?? TR[anahtar] ?? anahtar;
  const s = SOZ[dil];
  const e = SOZ.en;
  return s?.JS[anahtar] ?? s?.SAYFA[anahtar] ?? e?.JS[anahtar] ?? e?.SAYFA[anahtar] ?? JS.tr[anahtar] ?? TR[anahtar] ?? anahtar;
}
export const etkinDil = () => dil;
/* biçimler: sayı yerel ayarla, yüzde işareti dilin yerinde (TR %20 · EN 20% · DE/RU 20 % · AR 20%), büyük harf dilin kuralıyla */
export const sayi = (n, b = 0) => n.toLocaleString(YEREL[dil], { minimumFractionDigits: b, maximumFractionDigits: b });
export const yuzde = (n) => (dil === 'tr' ? `%${n}` : dil === 'de' || dil === 'ru' ? `${n} %` : `${n}%`);
export const buyuk = (s) => (dil === 'ar' ? s : s.toLocaleUpperCase(dil));

export async function dilUygula(yeni) {
  if (!kuruldu) { trOku(); kuruldu = true; }
  const hedef = DILLER.includes(yeni) ? yeni : 'tr';
  try { await sozlukYukle(hedef); } catch { /* dosya inmezse Türkçe kalır */ return; }
  dil = hedef;
  const h = document.documentElement;
  h.lang = dil; h.dir = YON[dil];
  for (const el of document.querySelectorAll('[data-i18n]')) metinYaz(el, metin(el.dataset.i18n));
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', metin(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-alt]')) el.setAttribute('alt', metin(el.dataset.i18nAlt));
  document.title = metin('sayfaBaslik');
  const aciklama = document.querySelector('meta[name="description"]');
  if (aciklama) aciklama.content = metin('sayfaAciklama');
  document.dispatchEvent(new CustomEvent('dil-degisti', { detail: dil }));
}

/* tarayıcı dili: navigator.languages sırasıyla ilk desteklenen; yoksa İngilizce. Bot hep Türkçe (kanonik adres dizine başka dilde girmesin) */
function tarayiciDili() {
  if (/bot|crawl|spider|slurp/i.test(navigator.userAgent)) return 'tr';
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language || 'tr']) { const k = l.slice(0, 2).toLowerCase(); if (DILLER.includes(k)) return k; }
  return 'en';
}

/* dil menüsü: açılır liste (açma/kapama düğmesi + seçenek düğmeleri); Esc ve dışarı tıklama kapatır, seçim adrese ?dil= yazar */
export async function dilKur({ dugme, liste }) {
  trOku(); kuruldu = true;
  const prm = new URLSearchParams(location.search).get('dil');
  let kayitli = null;
  try { kayitli = localStorage.getItem('antratech-dil'); } catch { /* gizli pencere */ }
  const ilk = DILLER.includes(prm) ? prm : DILLER.includes(kayitli) ? kayitli : tarayiciDili();
  const kod = dugme.querySelector('.dil__kod');
  const guncelle = () => {
    kod.textContent = dil.toUpperCase();
    dugme.setAttribute('aria-label', metin('dilEtiket'));
    liste.setAttribute('aria-label', metin('dilListe'));
    for (const b of liste.querySelectorAll('[data-dil]')) { if (b.dataset.dil === dil) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
  };
  const ac = (acik) => { dugme.setAttribute('aria-expanded', String(acik)); liste.hidden = !acik; };
  if (ilk !== 'tr') await dilUygula(ilk);
  kanonikYaz();
  document.documentElement.classList.remove('dil-bekle');
  guncelle();
  dugme.addEventListener('click', () => {
    const acik = dugme.getAttribute('aria-expanded') !== 'true';
    ac(acik);
    if (acik) (liste.querySelector('[aria-current]') || liste.querySelector('[data-dil]')).focus();
  });
  liste.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-dil]'); if (!b) return;
    ac(false); dugme.focus();
    if (b.dataset.dil === dil) return;
    await dilUygula(b.dataset.dil);
    guncelle();
    try { localStorage.setItem('antratech-dil', dil); } catch { /* yok say */ }
    const u = new URL(location.href); u.searchParams.set('dil', dil); history.replaceState(null, '', u);
    kanonikYaz();
  });
  /* önden indirme: seçeneğin üzerine gelinince ya da odaklanınca sözlük iner, tıklamada çoğunlukla hazırdır (Doherty) */
  const onden = (e) => { const b = e.target.closest?.('[data-dil]'); if (b) sozlukYukle(b.dataset.dil).catch(() => {}); };
  liste.addEventListener('pointerover', onden); liste.addEventListener('focusin', onden);
  /* ok tuşları seçenekler arasında gezer; Esc kapatır ve odağı düğmeye döndürür */
  liste.addEventListener('keydown', (e) => {
    const s = [...liste.querySelectorAll('[data-dil]')], i = s.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); s[(i + (e.key === 'ArrowDown' ? 1 : s.length - 1)) % s.length].focus(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !liste.hidden) { ac(false); dugme.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!liste.hidden && !liste.contains(e.target) && !dugme.contains(e.target)) ac(false); });
  liste.addEventListener('focusout', (e) => { if (!liste.hidden && !liste.contains(e.relatedTarget) && e.relatedTarget !== dugme) ac(false); });
}

/* kanonik adres gösterilen dile değil adrese bağlı: ?dil=xx (tr dışı) kendini, geri kalan her şey Türkçe kökü gösterir (hreflang ile çelişmez) */
function kanonikYaz() {
  const bag = document.querySelector('link[rel="canonical"]');
  const p = new URLSearchParams(location.search).get('dil');
  if (bag) bag.href = DILLER.includes(p) && p !== 'tr' ? `https://www.antratech.net/?dil=${p}` : 'https://www.antratech.net/';
}
