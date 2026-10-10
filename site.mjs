/* ANTRA TECH — sayfa denetleyicisi.
 * Dokuma tezgâhı açılışta yüklenir (görünürlüğe göre başlar/durur); süreç hattı, laboratuvar,
 * numune kartları, atölye ve jakar görüş alanına yaklaşınca tembel yüklenir; döngülü sahneler
 * ekran dışındayken durur. Hareket azaltma tercihi bütün sahnelere iletilir (son kare durağan çizilir).
 *
 * URL: ?dil=tr|en  ·  ?az=1 (azaltılmış hareket)  ·  ?webgl=0 (durağan kahraman)  ·  ?olc=1 (geliştirme ölçümü)
 */
import { dilKur, metin } from './ceviri.mjs';

const prm = new URLSearchParams(location.search);
const AZ = prm.get('az') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
if (AZ) document.documentElement.classList.add('az');
const $ = (s, k = document) => k.querySelector(s);
const $$ = (s, k = document) => [...k.querySelectorAll(s)];

/* görüş alanına yaklaşınca bir kez çalıştır; görünürlük değişimini bildir */
function gozle(el, { yakin = '200px', ilk, gorunur } = {}) {
  let kuruldu = false;
  const io = new IntersectionObserver((girdiler) => {
    for (const g of girdiler) {
      if (g.isIntersecting && !kuruldu) { kuruldu = true; ilk?.(); }
      gorunur?.(g.isIntersecting);
    }
  }, { rootMargin: yakin });
  io.observe(el);
}

/* ── dil ── */
dilKur({ dugme: $('#dil-dugme') });

/* ── üst şerit: dolu zemin, kaydırma ilerlemesi, etkin bölüm ── */
const ust = $('#ust');
const ilerleme = $('#ilerleme');
const igne = $('#igne');
const giris = $('#giris');
const kumasKatman = $('.giris__kumas');
let sonY = 0;
function kaydirmaGuncelle() {
  const y = scrollY;
  const h = document.documentElement.scrollHeight - innerHeight;
  const oran = h > 0 ? y / h : 0;
  ilerleme.style.transform = `scaleX(${oran.toFixed(4)})`;
  igne.style.transform = `translateX(${(oran * innerWidth - 23).toFixed(1)}px)`;
  /* koyu zemin kaydırma başlar başlamaz (menü başlığın üstüne binmesin); "Bize yazın" kahraman geçilince */
  ust.classList.toggle('ust--dolu', y > 24);
  ust.classList.toggle('ust--cta', y > giris.offsetHeight - ust.offsetHeight - 8);
  /* paralaks: kumaş katmanı içerikten yavaş kayar (yalnız kahraman görünürken) */
  if (!AZ && y < giris.offsetHeight) kumasKatman.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
  const menuAcik = ust.classList.contains('ust--menu-acik');
  if (!menuAcik && y > 640 && y > sonY + 4) ust.classList.add('ust--gizli');
  if (y < sonY - 4 || y < 640) ust.classList.remove('ust--gizli');
  sonY = y;
}
let kaydirmaBekliyor = false;     /* karede en fazla bir güncelleme */
addEventListener('scroll', () => { if (!kaydirmaBekliyor) { kaydirmaBekliyor = true; requestAnimationFrame(() => { kaydirmaBekliyor = false; kaydirmaGuncelle(); }); } }, { passive: true });
kaydirmaGuncelle();

const menuBag = $$('.ust__menu a');
/* menüde olmayan bölümler en yakın menü öğesini etkinleştirir */
const MENU_ESI = { atolye: '#laboratuvar', vizyon: '#hakkimizda' };
const izlenen = [...menuBag.map((a) => $(a.getAttribute('href'))), ...Object.keys(MENU_ESI).map((id) => $('#' + id))].filter(Boolean);
const etkinIO = new IntersectionObserver((girdiler) => {
  for (const g of girdiler) {
    if (!g.isIntersecting) continue;
    const hedef = MENU_ESI[g.target.id] || '#' + g.target.id;
    for (const a of menuBag) a.setAttribute('aria-current', a.getAttribute('href') === hedef ? 'true' : 'false');
  }
}, { rootMargin: '-45% 0px -50% 0px' });
izlenen.forEach((b) => etkinIO.observe(b));

/* dar ekran menüsü */
const menuDugme = $('#menu-dugme');
const menu = $('#menu');
function menuAyarla(acik) {
  menuDugme.setAttribute('aria-expanded', String(acik));
  menuDugme.setAttribute('aria-label', metin(acik ? 'menuKapat' : 'menuAc'));
  menu.classList.toggle('acik', acik);
  ust.classList.toggle('ust--menu-acik', acik);
  document.documentElement.classList.toggle('menu-acik', acik);   /* arkadaki sayfa kaymasın */
}
/* örtüye dokunmak menüyü kapatır: örtü .ust::after olduğundan hedef şeridin kendisidir (iOS'ta belgeye devredilen dinleyiciye
 * dokunuş ulaşmayabilir; şeritteki dil düğmesi menüyü kapatmaz). Odak şerit dışına çıkarsa (Tab) menü kapanır: örtü arkasında odak kalmaz */
ust.addEventListener('click', (e) => { if (e.target === ust && menu.classList.contains('acik')) menuAyarla(false); });
document.addEventListener('focusin', (e) => { if (menu.classList.contains('acik') && !ust.contains(e.target)) menuAyarla(false); });
menuDugme.addEventListener('click', () => menuAyarla(menuDugme.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('dil-degisti', () => menuAyarla(menuDugme.getAttribute('aria-expanded') === 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) menuAyarla(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('acik')) { menuAyarla(false); menuDugme.focus(); } });

/* ── kahraman: dokuma tezgâhı ── */
const tuval = $('#dokuma');
/* tezgâh kahraman görünür olunca kurulur: derin bağlantıyla (#hizmet-…, #surec…) sayfanın ortasından açılınca WebGL derlemesi
   ilk etkileşimi geciktirmesin; sayfa başında açılışta hemen kurulur */
if (prm.get('webgl') !== '0') gozle(giris, { yakin: '200px', ilk: () => {
  (async () => {
    /* modül ve yazı tipi paralel iner; tezgâh yazı tipini en çok 600 ms bekler (yavaş ağda kumaş gecikmesin) */
    const yaziTipi = document.fonts.load('600 92px Fraunces').catch(() => []);
    const [{ dokumaKur }, geldi] = await Promise.all([
      import('./sahne/dokuma.mjs'),
      Promise.race([yaziTipi.then(() => true), new Promise((r) => setTimeout(() => r(false), 600))]),
    ]);
    const etiket = $('.giris__etiket');
    const kenar = () => {
      if (innerWidth >= 640) return null;
      return etiket.getBoundingClientRect().bottom - giris.getBoundingClientRect().top + 28;
    };
    /* atkı sayacı: tezgâh sayacı gibi beş hane; ekran okuyucu yalnız sayıyı duyar */
    const sayac = $('#atki-sayac');
    let atki = 0;
    const sayacYaz = (n) => { sayac.innerHTML = `<span class="gorunmez">${n}</span>` + [...String(n % 1e5).padStart(5, '0')].map((h) => `<span aria-hidden="true">${h}</span>`).join(''); };
    /* metin bloğu: yalnız bunun arkası koyulaşır (dokuma.mjs) */
    const metinOgeleri = $$('.giris__ic > .ust-baslik, .giris__baslik, .giris__metin, .giris__eylem');
    const metinKutusu = () => {     /* ad "metin" olamaz: çeviri fonksiyonu metin()'i gölgeler */
      const k = metinOgeleri.map((e) => e.getBoundingClientRect()).filter((r) => r.width);
      return k.length ? { left: Math.min(...k.map((r) => r.left)) - 24, top: Math.min(...k.map((r) => r.top)) - 24, right: Math.max(...k.map((r) => r.right)) + 24, bottom: Math.max(...k.map((r) => r.bottom)) + 24 } : null;
    };
    const tezgah = dokumaKur(tuval, { azHareket: AZ, olayKabi: giris, kenar, metin: metinKutusu, metinOgeleri, atki: () => sayacYaz(++atki) });
    if (!tezgah) return;
    sayacYaz(0);   /* hareketsizde de beş hane (00000): tezgâh durağan, dokunan atkı yok */
    tuval.classList.add('hazir'); giris.classList.add('tezgah-hazir');
    if (!geldi) yaziTipi.then((l) => { if (l.length) tezgah.maskeYenile(); });
    $('#kunye-orgu').disabled = false;
    let kahramanGorunur = false;
    gozle(giris, { yakin: '0px', gorunur: (g) => { kahramanGorunur = g; g && !document.hidden ? tezgah.baslat() : tezgah.durdur(); } });
    document.addEventListener('visibilitychange', () => (document.hidden || !kahramanGorunur ? tezgah.durdur() : tezgah.baslat()));
    /* dil değişince kahraman metni yeniden akar; mobilde tezgâh ağzı etiket satırına göre yeniden hesaplanır */
    document.addEventListener('dil-degisti', () => { tezgah.yenile(); orguAd.textContent = metin(`zemin${zemin}`); });
    /* künyeden zemin örgüsü değişir: dimi → bezayağı → panama */
    const orguAd = $('#kunye-orgu-ad');
    let zemin = 0;
    /* künyedeki kareli kâğıt: zemin örgüsünün 6 × 6 raporu (dolu kare = çözgü üstte) */
    const ZEMIN_ORGU = [(i, j) => (((i - j) % 3) + 3) % 3 < 2, (i, j) => (i + j) % 2 === 0, (i, j) => (((i >> 1) + (j >> 1)) % 2) === 0];
    const raporCiz = () => {
      let d = '';
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) if (ZEMIN_ORGU[zemin](i, j)) d += `M${i * 10} ${j * 10}h10v10h-10z`;
      $('#kunye-rapor-kare').setAttribute('d', d);
    };
    $('#kunye-orgu').addEventListener('click', () => {
      zemin = (zemin + 1) % 3;
      tezgah.zeminSec(zemin);
      orguAd.textContent = metin(`zemin${zemin}`);
      raporCiz();
    });
  })().catch((h) => console.warn('dokuma:', h));
} });

/* ── görünür olunca beliren bloklar ── */
const belirenler = $$('.bolum__bas, .hakkimizda__lead, .bakim, .hakkimizda__govde, .kurum, .numune, .lab__govde, .atolye__metin, .atolye__masa, .vizyon__govde, .misyon__etiket, .iletisim__bilgi, .etiket-form');
if (!AZ) {
  belirenler.forEach((el) => el.classList.add('reveal'));
  const bIO = new IntersectionObserver((girdiler) => {
    for (const g of girdiler) if (g.isIntersecting) { g.target.classList.add('gorundu'); bIO.unobserve(g.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  belirenler.forEach((el) => bIO.observe(el));
  /* aynı satırdaki numune kartları sırayla */
  $$('.numune').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; });
}

/* ── vizyon: satırlar görününce atkı gibi geçer; anahtar kelimelerin harflerine dokunmuş kumaş dokusu ── */
$$('.ilke-satir').forEach((el) => gozle(el, { yakin: '-12% 0px', ilk: () => el.classList.add('dokundu') }));
const vizyon = $('#vizyon');
if (vizyon) gozle(vizyon, { yakin: '600px', ilk: () => import('./sahne/vizyon.mjs').then((m) => m.vizyonKur(vizyon)).catch((h) => console.warn('vizyon:', h)) });

/* ── faaliyet haritası: kumaş yaklaşınca çizilir (mesafeler orada dile göre biçimlenir), görününce rotalar dikilir ── */
const harita = $('#harita');
if (harita) {
  gozle(harita, { yakin: '500px', ilk: () => import('./sahne/harita.mjs').then((m) => m.haritaKur(harita, { azHareket: AZ })).catch((h) => console.warn('harita:', h)) });
  gozle($('.harita__sahne', harita), { yakin: '-20% 0px', ilk: () => harita.classList.add('gorundu') });
}

/* ── hizmet numuneleri ── */
const kartela = $('#kartela');
if (kartela) gozle(kartela, { yakin: '400px', ilk: () => import('./sahne/numune.mjs').then((m) => m.kartelaKur(kartela, { azHareket: AZ })).catch((h) => console.warn('numune:', h)) });

/* ── süreç hattı ── */
const surecIz = $('#surec-iz');
/* önce 2,5B three.js maketi; WebGL yoksa (ya da ?webgl=0) aynı adım listesine bağlı 2B çizim yüklenir */
const surecAyar = () => ({ iz: surecIz, tuval: $('#surec-tuval'), adimlar: $$('#surec-adimlar .adim'), etiketKatmani: $('#surec-muhurler'), azHareket: AZ });
const surec2b = () => import('./sahne/surec.mjs').then((m) => { surecIz.classList.add('surec--2b'); m.surecKur(surecAyar()); });
if (surecIz) gozle(surecIz, { yakin: '1600px', ilk: async () => {
  try {
    if ((await import('./sahne/gpu.mjs')).donanimGpu() && (await import('./sahne/surec3b.mjs')).surec3bKur(surecAyar())) return;
  } catch (h) { console.warn('süreç 3B:', h); }
  /* 3B kurulmadı (WebGL yok, yazılımsal çizici ya da hata): WebGL bağlamı alınmış olabilecek tuval yenisiyle değişir, 2B çizilir */
  const eski = $('#surec-tuval'); eski.replaceWith(eski.cloneNode());
  surec2b().catch((h) => console.warn('süreç:', h));
} });

/* ── laboratuvar ── */
const lab = $('#laboratuvar');
/* modül inmeden yapılan sekme tıklaması kaybolmasın: istenen sekme saklanır, labKur onu açar */
if (lab) lab.addEventListener('click', (e) => { const t = e.target.closest('.test'); if (t) lab.dataset.istek = String($$('.test', lab).indexOf(t)); });
if (lab) gozle(lab, { yakin: '400px', ilk: () => import('./sahne/laboratuvar.mjs').then((m) => m.labKur({ kok: lab, azHareket: AZ })).catch((h) => console.warn('lab:', h)) });

/* ── alt bilgi jakar bandı ── */
const jakar = $('#jakar');
if (jakar) gozle(jakar, { yakin: '600px', ilk: () => import('./sahne/jakar.mjs').then((m) => m.jakarKur(jakar)).catch((h) => console.warn('jakar:', h)) });

/* ── örgü atölyesi ── */
const atolye = $('#atolye');
if (atolye) gozle(atolye, { yakin: '400px', ilk: () => import('./sahne/atolye.mjs').then((m) => m.atolyeKur(atolye)).catch((h) => console.warn('atölye:', h)) });

/* ── galeri: ışık kutusu ── */
const kutu = $('#isik-kutusu');
const kareler = $$('.kare__dugme');
let kutuSira = 0;
function kutuGoster(i) {
  kutuSira = (i + kareler.length) % kareler.length;
  const img = $('img', kareler[kutuSira]);
  const g = $('#isik-kutusu-gorsel');
  const kaynaklar = (img.getAttribute('srcset') || img.src).split(',').map((s) => s.trim().split(' ')[0]);
  g.src = kaynaklar[kaynaklar.length - 1];
  g.alt = img.alt;
  $('#isik-kutusu-yazi').textContent = img.alt;
  $('#isik-kutusu-sira').textContent = `${kutuSira + 1} / ${kareler.length}`;
}
kareler.forEach((d, i) => d.addEventListener('click', () => { kutuGoster(i); kutu.showModal(); }));
kutu.addEventListener('click', (e) => {
  const yon = e.target.closest('[data-yon]');
  if (yon) { kutuGoster(kutuSira + +yon.dataset.yon); return; }
  if (e.target.closest('[data-kapat]') || e.target === kutu) kutu.close();
});
kutu.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') kutuGoster(kutuSira + 1);
  if (e.key === 'ArrowLeft') kutuGoster(kutuSira - 1);
});
/* dokunmatik: yatay çekişle önceki/sonraki (dikey hareket kaydırma sayılır) */
let cekisX = null, cekisY = 0;
kutu.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { cekisX = e.clientX; cekisY = e.clientY; } });
kutu.addEventListener('pointercancel', () => { cekisX = null; });
kutu.addEventListener('pointerup', (e) => {
  if (cekisX === null || e.pointerType === 'mouse') { cekisX = null; return; }
  const dx = e.clientX - cekisX, dy = e.clientY - cekisY;
  cekisX = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) kutuGoster(kutuSira + (dx < 0 ? 1 : -1));
});

/* ── hizmet penceresi: kod ilk ihtiyaçta iner (kart tıklaması ya da #hizmet-<id> derin bağlantısı), sahne/hizmet.mjs ── */
let hizmetModul = null;
const hizmet = () => (hizmetModul ??= import('./sahne/hizmet.mjs').then((m) => m.hizmetPenceresiKur()));
$$('.numune [data-hizmet]').forEach((d, i) => d.addEventListener('click', () => hizmet().then((h) => h.goster(i)).catch((x) => console.warn('hizmet:', x))));
const hizmetAdres = () => { if (/^#hizmet-[a-z]+$/.test(location.hash) || hizmetModul) hizmet().then((h) => h.adrestenAc()).catch((x) => console.warn('hizmet:', x)); };
hizmetAdres();
addEventListener('hashchange', hizmetAdres);

/* ── iletişim: açık/kapalı durumu (Europe/Istanbul) ── */
import('./sahne/saatler.mjs').then(({ acikMi, saatEki }) => {
  const el = $('#acik-durum');
  const guncelle = () => {
    const d = acikMi(new Date());
    el.classList.toggle('acik', d.acik);
    el.textContent = d.acik ? metin('simdiAcik').replace('{saat}', d.kapanis).replace('{e}', saatEki(d.kapanis, 'e'))
      : metin('simdiKapali').replace('{gun}', metin(d.acilisGunu)).replace('{saat}', d.acilis).replace('{de}', saatEki(d.acilis, 'de'));
  };
  guncelle();
  setInterval(guncelle, 60000);
  document.addEventListener('dil-degisti', guncelle);
});

/* ── iletişim formu → e-posta uygulaması ── */
const form = $('#iletisim-formu');
const durum = $('#form-durum');
let durumAnahtar = null; /* dil değişince form mesajı da yeni dilde yeniden yazılır */
document.addEventListener('dil-degisti', () => { if (durumAnahtar) durum.textContent = metin(durumAnahtar); });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ad = form.elements.ad, mesaj = form.elements.mesaj, tel = form.elements.telefon, ep = form.elements.eposta;
  const eksik = [ad, mesaj].filter((el) => !el.value.trim());
  [ad, mesaj].forEach((el) => el.setAttribute('aria-invalid', String(eksik.includes(el))));
  const epHatali = ep.value.trim() && !/^\S+@\S+\.\S+$/.test(ep.value.trim());
  ep.setAttribute('aria-invalid', String(!!epHatali));
  form.classList.remove('gonderildi');
  if (eksik.length || epHatali) {
    durum.className = 'form-durum hata';
    durumAnahtar = eksik.length ? 'formEksik' : 'formEpostaHatali';
    durum.textContent = metin(durumAnahtar);
    (eksik[0] || ep).focus();
    kopyala.hidden = true;
    return;
  }
  const konu = form.elements.konu.value;
  const kunye = [
    `${metin('formAd')}: ${ad.value.trim()}`,
    tel.value.trim() && `${metin('formTel')}: ${tel.value.trim()}`,
    ep.value.trim() && `${metin('formEposta')}: ${ep.value.trim()}`,
  ].filter(Boolean).join('\n');
  const govde = `${kunye}\n\n${mesaj.value.trim()}`;
  location.href = `mailto:info@antratech.net?subject=${encodeURIComponent(`[${konu}] ${ad.value.trim()}`)}&body=${encodeURIComponent(govde)}`;
  durum.className = 'form-durum tamam';
  durumAnahtar = 'formHazir';
  durum.textContent = metin(durumAnahtar);
  form.classList.remove('gonderildi'); void form.offsetWidth; form.classList.add('gonderildi');
  /* e-posta uygulaması kurulu değilse mailto sessizce boşa düşer: web postaya yapıştırmak için metni kopyalama yolu */
  kopyalanacak = `info@antratech.net\n[${konu}] ${ad.value.trim()}\n\n${govde}`;
  kopyala.hidden = false;
});
const kopyala = $('#form-kopyala');
let kopyalanacak = '';
kopyala.addEventListener('click', () => {
  const yaz = (anahtar, sinif) => { durum.className = `form-durum ${sinif}`; durumAnahtar = anahtar; durum.textContent = metin(anahtar); };
  (navigator.clipboard ? navigator.clipboard.writeText(kopyalanacak) : Promise.reject(new Error('pano yok')))
    .then(() => yaz('formKopyalandi', 'tamam'), () => yaz('formKopyalanamadi', 'hata'));
});

/* ── mobil hızlı erişim: kahramandan sonra görünür, iletişim bölümünde çekilir ── */
const hizli = $('#hizli');
let kahramanGecildi = false;
const ortulmesin = new Set();      /* iletişim ve alt bilgi görünürken çubuk çekilir */
const hizliGuncelle = () => hizli.classList.toggle('gorunur', kahramanGecildi && ortulmesin.size === 0);
new IntersectionObserver((g) => { kahramanGecildi = !g[g.length - 1].isIntersecting; hizliGuncelle(); }).observe(giris);
const cekilIO = new IntersectionObserver((girdiler) => {
  for (const g of girdiler) g.isIntersecting ? ortulmesin.add(g.target) : ortulmesin.delete(g.target);
  hizliGuncelle();
}, { rootMargin: '0px 0px -30% 0px' });
cekilIO.observe($('#iletisim')); cekilIO.observe($('.alt'));

/* ── alt bilgi ── */
$('#yil').textContent = String(new Date().getFullYear());
