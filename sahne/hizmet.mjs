/* HİZMET PENCERESİ — hizmet kartlarının ayrıntı penceresi (site.mjs ilk ihtiyaçta yükler: kart tıklaması ya da #hizmet-<id>).
 * Metin gizli .hizmet-metinleri bloklarından kopyalanır; sahadan fotoğraf (müşterinin hizmet görsellerinin yazısız kırpımı)
 * ve köşeye iliştirilmiş kumaş numunesi (numune.mjs). Adres #hizmet-<id> olur, kapanınca #hizmetler'e döner. */
import { metin } from '../ceviri.mjs';

const $ = (s, k = document) => k.querySelector(s);
const $$ = (s, k = document) => [...k.querySelectorAll(s)];
let kurulu = null;

export function hizmetPenceresiKur() {
  if (kurulu) return kurulu;
  const pencere = $('#hizmet-penceresi');
  const hizmetKartlari = $$('.numune');
  const HIZMET_FOTO = new Set(['savunma', 'laboratuvar', 'kontrol', 'entegre', 'danismanlik']);
  let hizmetSira = 0;
  async function hizmetGoster(i) {
    hizmetSira = (i + hizmetKartlari.length) % hizmetKartlari.length;
    const kart = hizmetKartlari[hizmetSira];
    const id = $('[data-hizmet]', kart).dataset.hizmet;
    /* derin bağlantı: adres #hizmet-<id> olur, paylaşılabilir; geçmişe kayıt eklemez */
    if (location.hash !== `#hizmet-${id}`) history.replaceState(null, '', `${location.pathname}${location.search}#hizmet-${id}`);
    $('#pencere-kod').textContent = $('.numune__kod', kart).textContent;
    $('#pencere-baslik').textContent = $('.numune__ad', kart).textContent;
    $('#pencere-sira').textContent = `${String(hizmetSira + 1).padStart(2, '0')} / ${String(hizmetKartlari.length).padStart(2, '0')}`;
    const govde = $('#pencere-govde');
    govde.replaceChildren(...$$(`[data-hizmet-metin="${id}"] > *`).map((p) => p.cloneNode(true)));
    if (id === 'laboratuvar') {
      const ul = document.createElement('ul');
      ul.className = 'pencere__liste';
      for (let k = 1; k <= 5; k++) { const li = document.createElement('li'); li.textContent = metin('test' + k); ul.append(li); }
      ($('[data-i18n="hiz3Liste"]', govde) || govde.children[1])?.after(ul);
    }
    $('#pencere-cta').dataset.konu = $('.numune__ad', kart).textContent;
    $('.pencere__metin', pencere).scrollTop = 0;
    /* sahadan fotoğraf (müşterinin hizmet görsellerinin yazısız kırpımı); numune köşesine iliştirilir. Fotoğrafı olmayan hizmette tam kumaş */
    const foto = $('#pencere-foto'), fotoVar = HIZMET_FOTO.has(id);
    $('.pencere__kumas', pencere).classList.toggle('pencere__kumas--foto', fotoVar);
    foto.hidden = !fotoVar;
    if (fotoVar) {
      foto.srcset = `gorseller/boyut/hizmet-${id}-480.webp 480w, gorseller/boyut/hizmet-${id}-800.webp 800w`;
      foto.sizes = '(min-width: 900px) 26rem, 100vw';
      foto.src = `gorseller/boyut/hizmet-${id}-480.webp`;
      foto.alt = metin(`hizmetFoto_${id}`);
    }
    if (!pencere.open) pencere.showModal();
    try {
      const m = await import('./numune.mjs');
      const tuval = $('#pencere-kumas');
      m.pencereKumasi(tuval, kart.dataset.numune);
      tuval.style.clipPath = fotoVar ? m.zikzak(tuval.clientWidth, tuval.clientHeight) : '';
    } catch (h) { console.warn(h); }
  }
  document.addEventListener('dil-degisti', () => { const id = $('[data-hizmet]', hizmetKartlari[hizmetSira]).dataset.hizmet; if (HIZMET_FOTO.has(id)) $('#pencere-foto').alt = metin(`hizmetFoto_${id}`); });
  pencere.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') hizmetGoster(hizmetSira + 1);
    if (e.key === 'ArrowLeft') hizmetGoster(hizmetSira - 1);
  });
  /* kapanınca adres #hizmetler'e döner; close olayı gelmeden kapanan yollar için (ör. tarayıcı kapanma izleyicisi) open özniteliği de izlenir */
  const hizmetAdresiTemizle = () => { if (!pencere.open && location.hash.startsWith('#hizmet-')) history.replaceState(null, '', `${location.pathname}${location.search}#hizmetler`); };
  pencere.addEventListener('close', hizmetAdresiTemizle);
  new MutationObserver(hizmetAdresiTemizle).observe(pencere, { attributes: true, attributeFilter: ['open'] });
  pencere.addEventListener('click', (e) => {
    const yon = e.target.closest('[data-hizmet-yon]');
    if (yon) { hizmetGoster(hizmetSira + Number(yon.dataset.hizmetYon)); return; }
    if (e.target.closest('[data-kapat]') || e.target === pencere) pencere.close();
    if (e.target.closest('#pencere-cta')) {
      pencere.close();
      const ta = $('#f-mesaj');
      if (ta && !ta.value) ta.value = metin('formOnDoldur').replace('{hizmet}', e.target.closest('#pencere-cta').dataset.konu || '');
      const bilgi = $('input[name="konu"][value="Bilgi edinme"]');
      if (bilgi) bilgi.checked = true;
    }
  });

  /* açılışta ya da adres değişince #hizmet-<id> → o hizmet; başka adres → pencere kapanır */
  function adrestenAc() {
    const m = /^#hizmet-([a-z]+)$/.exec(location.hash);
    if (!m) { if (pencere.open) pencere.close(); return; }
    const i = hizmetKartlari.findIndex((k) => $('[data-hizmet]', k).dataset.hizmet === m[1]);
    /* tarayıcının hash kaydırmasından sonra: arka planda hizmetler bölümü dursun */
    if (i >= 0) { requestAnimationFrame(() => $('#hizmetler').scrollIntoView({ behavior: 'instant' })); hizmetGoster(i); }
  }
  kurulu = { goster: hizmetGoster, adrestenAc };
  return kurulu;
}
