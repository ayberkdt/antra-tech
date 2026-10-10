#!/usr/bin/env node
/* UÇTAN UCA — başsız Chrome'da gerçek etkileşim sınamaları (CDP, bağımlılık yok).
 *   node araclar/uctan-uca.mjs [adres]      (varsayılan http://127.0.0.1:4180/; sunucu açık olmalı)
 * Her senaryo temiz bir sekmede koşar; konsol hatası da düşüş sayılır. Çıkış 1 = en az biri düştü.
 * CEKIM_GPU=1 gerçek GPU ile koşturur (varsayılan swiftshader).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADRES = process.argv[2] || 'http://127.0.0.1:4180/';
const ADAY = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const chrome = ADAY.find(existsSync);
const port = 9700 + Math.floor(Math.random() * 200);
const gecici = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.cekim-gecici');
if (existsSync(gecici)) for (const ad of readdirSync(gecici)) if (ad.startsWith('profil-')) { try { rmSync(join(gecici, ad), { recursive: true, force: true }); } catch { /* kilitli */ } }
const profil = join(gecici, `profil-${port}`);
mkdirSync(profil, { recursive: true });
const gpu = process.env.CEKIM_GPU === '1' ? ['--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const surec = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, '--hide-scrollbars', '--enable-webgl', '--ignore-gpu-blocklist', ...gpu, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function sekmeAc() {
  for (let i = 0; i < 200; i++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await bekle(150); }
  }
  const h = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(h.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let no = 0; const bekleyen = new Map(); const hatalar = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && bekleyen.has(m.id)) { bekleyen.get(m.id)(m); bekleyen.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') hatalar.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) hatalar.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.url || '')) hatalar.push(m.params.entry.text);
  });
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++no; bekleyen.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await cdp('Runtime.enable'); await cdp('Log.enable'); await cdp('Page.enable');
  /* başsız Chrome'da yeni sekme odaklı sayılmayabilir: :focus ve document.hasFocus() kararlı olsun */
  await cdp('Page.bringToFront'); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
  /* profil sekmeler arasında ortak: önceki senaryonun dil tercihi (localStorage) sızmasın */
  await cdp('Storage.clearDataForOrigin', { origin: new URL(ADRES).origin, storageTypes: 'local_storage' });
  const js = async (ifade) => {
    const r = await cdp('Runtime.evaluate', { expression: ifade, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'ifade hatası');
    return r.result?.result?.value;
  };
  const git = async (yol, g = 1440, y = 900) => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: g, height: y, deviceScaleFactor: 1, mobile: g < 700 });
    await cdp('Page.navigate', { url: new URL(yol, ADRES).href });
    await bekle(1800);
  };
  const tikla = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  /* Enter/Boşluk için text alanı şart: yoksa tarayıcı düğmeyi etkinleştirmez (keypress üretilmez) */
  const tus = async (key, code = key, kod = 0) => {
    const text = key === 'Enter' ? String.fromCharCode(13) : key === ' ' ? ' ' : undefined;
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: kod, ...(text ? { text, unmodifiedText: text } : {}) });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: kod });
  };
  /* tembel yüklenen modüllerin kurduğu öğeyi bekle */
  const bekleOge = async (secici, sure = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < sure) { if (await js(`!!document.querySelector(${JSON.stringify(secici)})`)) return true; await bekle(100); } return false; };
  const dokun = async (type, x, y) => {
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cdp('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  };
  /* sekme gerçekten kapanır: yalnız soketi kapatmak sayfayı (ve 3B döngülerini) arka planda çalışır bırakıyor, sonraki senaryoları yavaşlatıyordu */
  const kapat = async () => { ws.close(); try { await fetch(`http://127.0.0.1:${port}/json/close/${h.id}`); } catch { /* zaten kapalı */ } };
  return { js, git, tikla, tus, dokun, bekleOge, cdp, hatalar, kapat };
}

/* düzen ölçen senaryolar önce otursun: yazı tipleri insin, iki kare geçsin (yedek yazının satır yüksekliği ölçümü bozar) */
const OTUR = 'document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))';

const SENARYO = {
  async 'form: boş gönderim hata verir, geçerli gönderim mührü basar'(s) {
    await s.git('./#iletisim');
    await s.js(`document.querySelector('#iletisim-formu button[type=submit]').click()`);
    const hata = await s.js(`[document.getElementById('form-durum').className, document.getElementById('f-ad').getAttribute('aria-invalid'), document.activeElement.id]`);
    if (!hata[0].includes('hata') || hata[1] !== 'true' || hata[2] !== 'f-ad') throw new Error(`boş gönderim: ${hata}`);
    await s.js(`(() => { const f = document.getElementById('iletisim-formu'); f.ad.value = 'Deneme'; f.mesaj.value = 'Merhaba'; f.eposta.value = 'a@b'; f.querySelector('button[type=submit]').click(); })()`);
    if (!(await s.js(`document.getElementById('form-durum').className`)).includes('hata')) throw new Error('hatalı e-posta kabul edildi');
    await s.js(`(() => { const f = document.getElementById('iletisim-formu'); f.eposta.value = ' kisi@ornek.com '; f.querySelector('button[type=submit]').click(); })()`);
    const ok = await s.js(`[document.getElementById('form-durum').className, document.getElementById('iletisim-formu').classList.contains('gonderildi')]`);
    if (!ok[0].includes('tamam') || !ok[1]) throw new Error(`geçerli gönderim: ${ok}`);
    /* e-posta uygulaması yoksa yedek yol: "Mesajı kopyala" yalnız başarılı gönderimden sonra görünür, panoya alıcıyı ve metni yazar.
       Başsız Chrome'un panosu okunamıyor (writeText başarılı, readText boş): yazılan metin writeText'te yakalanır */
    if (await s.js(`document.getElementById('form-kopyala').hidden`)) throw new Error('kopyala düğmesi görünmüyor');
    await s.js(`window.__pano = null; navigator.clipboard.writeText = (t) => { window.__pano = t; return Promise.resolve(); }; document.getElementById('form-kopyala').click()`);
    await bekle(200);
    const [pano, durumK] = await s.js(`[window.__pano, document.getElementById('form-durum').textContent]`);
    if (!pano?.startsWith('info@antratech.net') || !pano.includes('Merhaba') || !durumK.startsWith('Mesaj kopyalandı')) throw new Error(`kopyala: ${durumK} ${JSON.stringify(pano)}`);
  },
  async 'dil: EN’e geçiş metni, başlığı, adresi ve künyeyi çevirir; geri döner'(s) {
    await s.git('./?dil=tr');
    await s.js(`document.getElementById('dil-dugme').click()`);
    await bekle(200);
    const en = await s.js(`[document.documentElement.lang, document.title, location.search, document.querySelector('[data-i18n="navHizmetler"]').textContent, document.getElementById('kunye-orgu-ad').textContent]`);
    if (en[0] !== 'en' || !en[1].includes('Technical') || en[2] !== '?dil=en' || en[3] !== 'Services' || !en[4].includes('twill')) throw new Error(`EN: ${en}`);
    await s.js(`document.getElementById('dil-dugme').click()`);
    const tr = await s.js(`[document.documentElement.lang, document.querySelector('[data-i18n="navHizmetler"]').textContent]`);
    if (tr[0] !== 'tr' || tr[1] !== 'Hizmetler') throw new Error(`TR: ${tr}`);
    /* JS'in yazdığı metinler de dil değişiminde yenilenir: muayene tuvalinin etiketi, form mesajı, saat eki */
    await s.git('./?dil=tr&az=1#laboratuvar');
    await s.bekleOge('#lab-olculen li');   /* laboratuvar modülü kurulmuş olmalı (sekme etiketini o yazar) */
    await s.js(`document.querySelectorAll('.test')[5].click(); document.querySelector('#iletisim-formu [type=submit]').click()`);
    /* açık/kapalı metni tembel saatler.mjs yazar (.test HTML'de hazır olduğundan beklemek yetmez) */
    for (let k = 0; k < 40 && !(await s.js(`document.getElementById('acik-durum').textContent.trim()`)); k++) await bekle(100);
    const once = await s.js(`document.getElementById('acik-durum').textContent`);
    if (!/’(da|de|ta|te|a|e|ya|ye) /.test(once)) throw new Error(`saat eki: ${once}`);
    await s.js(`document.getElementById('dil-dugme').click()`);
    await bekle(200);
    const js = await s.js(`[document.getElementById('lab-tuval').getAttribute('aria-label'), document.getElementById('form-durum').textContent]`);
    if (!js[0].startsWith('Fabric inspection') || !js[1].startsWith('Please')) throw new Error(`EN JS metinleri: ${js}`);
    /* 404 sayfası kayıtlı dil tercihine uyar (az önceki geçiş "en" kaydetti) ve ana sayfaya o dille döner; CSP özeti tutmazsa betik çalışmaz */
    await s.git('./yok-boyle-bir-sayfa');
    const yok = await s.js(`[document.documentElement.lang, document.getElementById('don').getAttribute('href')]`);
    if (yok[0] !== 'en' || yok[1] !== '/?dil=en') throw new Error(`404: ${yok}`);
  },
  async 'derin bağlantı: #hizmet-kontrol pencereyi açar, Esc kapatır, adres #hizmetler olur'(s) {
    await s.git('./#hizmet-kontrol');
    await s.bekleOge('#hizmet-penceresi[open]');   /* pencere kodu ilk ihtiyaçta iner (sahne/hizmet.mjs) */
    const a = await s.js(`[document.getElementById('hizmet-penceresi').open, document.getElementById('pencere-baslik').textContent]`);
    if (!a[0] || !a[1].includes('Kontrol')) throw new Error(`açılış: ${a}`);
    await s.tus('ArrowRight', 'ArrowRight', 39);
    /* davranış sınanır, gecikme değil (o tuval senaryosunda): açılışta tembel modüller kurulurken tuş olayı geç işlenebilir */
    const yokla = async (ifade, sure = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < sure && !(await s.js(ifade))) await bekle(100); };
    await yokla(`document.getElementById('pencere-sira').textContent.startsWith('04')`);
    const sira = await s.js(`document.getElementById('pencere-sira').textContent`);
    await s.tus('Escape', 'Escape', 27);
    await yokla(`!document.getElementById('hizmet-penceresi').open && location.hash === '#hizmetler'`);
    const b = await s.js(`[document.getElementById('hizmet-penceresi').open, location.hash]`);
    if (b[0] || b[1] !== '#hizmetler') throw new Error(`kapanış: ${b} (sıra ${sira})`);
  },
  async 'laboratuvar: ok tuşları sekmeyi değiştirir, açıklama ve ölçülen listesi güncellenir'(s) {
    await s.git('./#laboratuvar');
    await s.bekleOge('#lab-olculen li');
    await s.js(`document.getElementById('test-0').focus()`);
    await s.tus('ArrowRight', 'ArrowRight', 39);
    await bekle(150);
    const r = await s.js(`[document.activeElement.id, document.getElementById('test-1').getAttribute('aria-selected'), document.getElementById('lab-test-ad').textContent, document.querySelectorAll('#lab-olculen li').length]`);
    if (r[0] !== 'test-1' || r[1] !== 'true' || !r[2].includes('aşınma') || r[3] !== 4) throw new Error(`sekme: ${r}`);
    await s.tus('End', 'End', 35);
    const son = await s.js(`document.activeElement.id`);
    if (son !== 'test-5') throw new Error(`End: ${son}`);
  },
  async 'muayene: hata muayene çizgisine gelince kendiliğinden puanlanır, puan 100 m²’ye oranlanır'(s) {
    await s.git('./?olc=1#laboratuvar');
    await s.bekleOge('#lab-olculen li');
    await s.js(`document.getElementById('test-5').click(); document.getElementById('lab-panel').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    let r = null;
    for (let k = 0; k < 40; k++) {
      await bekle(300);
      r = await s.js(`(() => { const h = __muayene.hatalar(); return { isaretli: h.filter((x) => x.isaret).length, cizgiUstuIsaretsiz: h.filter((x) => !x.isaret && x.y < 300).length, olcum: document.getElementById('lab-olcum').textContent, odak: document.getElementById('lab-tuval').tabIndex }; })()`);
      if (r.isaretli >= 2) break;
    }
    /* çizgiyi geçen her hata işaretli; tuval artık odak durağı değil (oyun yok) */
    if (r.isaretli < 2 || r.cizgiUstuIsaretsiz || !/^[1-9]\d* hata · [1-9]\d* puan/.test(r.olcum) || r.odak >= 0) throw new Error(JSON.stringify(r));
  },
  async 'atölye: hazır örgü analizi doğru, "Deseninizi anlatın" forma götürür, rapor kopyalamaz'(s) {
    await s.git('./#atolye');
    await s.bekleOge('#atolye-analiz div');
    await s.js(`document.querySelector('input[name="orgu"][value="saten"]').click()`);
    const a = await s.js(`document.getElementById('atolye-analiz').textContent.replace(/\\s+/g, ' ')`);
    if (!a.includes('%20') || !a.includes('5 × 5')) throw new Error(`saten analizi: ${a}`);
    await s.js(`document.getElementById('atolye-danis').click()`);
    await bekle(700);
    /* mesaj boş kalır (rapor kopyalanmaz), konu "Bilgi edinme", mesaj alanı ipucuyla odakta, adres #iletisim */
    const f = await s.js(`[document.getElementById('f-mesaj').value, document.querySelector('input[name="konu"]:checked').value, document.activeElement.id, document.getElementById('f-mesaj').placeholder, location.hash]`);
    if (f[0] !== '' || f[1] !== 'Bilgi edinme' || f[2] !== 'f-mesaj' || !f[3].startsWith('Desen fikrinizi') || f[4] !== '#iletisim') throw new Error(`form: ${JSON.stringify(f)}`);
    /* İngilizcede yüzde işareti sayıdan sonra gelir (Türkçe %20 → İngilizce 20%) */
    await s.js(`document.getElementById('dil-dugme').click()`);
    await bekle(200);
    const en = await s.js(`document.getElementById('atolye-analiz').textContent.replace(/\\s+/g, ' ')`);
    if (!en.includes('20%') || /%\\d/.test(en)) throw new Error(`EN analiz: ${en}`);
  },
  async 'mobil: menü açılır/kapanır, hızlı erişim çubuğu kahramandan sonra görünür'(s) {
    await s.git('./', 390, 844);
    await s.js(`document.getElementById('menu-dugme').click()`);
    const ac = await s.js(`[document.getElementById('menu-dugme').getAttribute('aria-expanded'), document.getElementById('menu').classList.contains('acik')]`);
    await s.tus('Escape', 'Escape', 27);
    const kapa = await s.js(`document.getElementById('menu-dugme').getAttribute('aria-expanded')`);
    if (ac.join() !== 'true,true' || kapa !== 'false') throw new Error(`menü: ${ac} / ${kapa}`);
    const once = await s.js(`document.getElementById('hizli').classList.contains('gorunur')`);
    await s.js(`document.getElementById('hizmetler').scrollIntoView({ behavior: 'instant' })`);
    await bekle(400);
    const sonra = await s.js(`document.getElementById('hizli').classList.contains('gorunur')`);
    if (once || !sonra) throw new Error(`çubuk: önce ${once}, sonra ${sonra}`);
    /* açık menü sayfayı kilitler; örtüye (menü dışına) gerçek dokunuş menüyü kapatır ve kilidi kaldırır */
    await s.js(`document.getElementById('menu-dugme').click()`);
    const kilit = await s.js(`getComputedStyle(document.documentElement).overflow`);
    await s.tikla(200, 780);
    await bekle(200);
    const disari = await s.js(`[document.getElementById('menu').classList.contains('acik'), getComputedStyle(document.documentElement).overflow]`);
    if (kilit !== 'hidden' || disari[0] || disari[1] === 'hidden') throw new Error(`dışarı dokunma: kilit ${kilit}, sonra ${disari}`);
    /* şeritteki dil düğmesi menüyü kapatmaz; Tab ile odak örtünün arkasına geçerse menü kapanır */
    await s.js(`document.getElementById('menu-dugme').click(); document.getElementById('dil-dugme').click()`);
    await bekle(200);
    const dilSonra = await s.js(`document.getElementById('menu').classList.contains('acik')`);
    await s.js(`document.getElementById('dil-dugme').click(); document.querySelector('#giris .dugme').focus()`);
    await bekle(100);
    const odakSonra = await s.js(`document.getElementById('menu').classList.contains('acik')`);
    if (!dilSonra || odakSonra) throw new Error(`dil düğmesi sonrası açık: ${dilSonra}; odak şerit dışına çıkınca açık: ${odakSonra}`);
  },
  async 'kontrast: görünür her metin WCAG AA (≥ 4,5:1; büyük yazı ≥ 3:1)'(s) {
    /* ?webgl=1: 3B sahnelerin HTML katmanları (kontrol mühürleri) yazılımsal GPU'da da kurulsun ve sınansın */
    await s.git('./?az=1&webgl=1');
    for (const [dil, y] of [['tr', 1200], ['tr', 6000], ['tr', 9500]]) {
      await s.js(`scrollTo(0, ${y})`);
      await bekle(300);
      const r = await s.js(`(() => {
        const P = (c) => c.match(/[\\d.]+/g).map(Number);
        const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const zemin = (el) => { for (let e = el; e; e = e.parentElement) { const p = P(getComputedStyle(e).backgroundColor); if (p.length < 4 || p[3] > 0.9) return p.slice(0, 3); } return [255, 255, 255]; };
        const opak = (el) => { let a = 1; for (let e = el; e; e = e.parentElement) a *= parseFloat(getComputedStyle(e).opacity); return a; };
        const kotu = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) {
          if (!n.textContent.trim()) continue;
          const el = n.parentElement, cs = getComputedStyle(el);
          /* kahraman ve kanvas üstü yazılar zemini DOM'da değil WebGL'de: dışarıda */
          if (cs.visibility === 'hidden' || el.closest('[hidden],dialog:not([open]),.gorunmez,.kenar-yazi,noscript,.giris,.ust')) continue;
          const rr = el.getBoundingClientRect(); if (!rr.width || rr.bottom < 0 || rr.top > innerHeight) continue;
          const op = opak(el); if (op < 0.05) continue;
          const f = P(cs.color), bg = zemin(el), a = (f[3] ?? 1) * op;
          const fg = f.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
          const x = L(fg), yy = L(bg), k = (Math.max(x, yy) + 0.05) / (Math.min(x, yy) + 0.05);
          const buyuk = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
          if (k < (buyuk ? 3 : 4.5)) kotu.push(n.textContent.trim().slice(0, 24) + ' ' + k.toFixed(2));
        }
        return kotu;
      })()`);
      if (r.length) throw new Error(`y=${y}: ${r.join(' | ')}`);
    }
  },
  async 'süreç: adım düğmesine klavyeyle gidilir, Enter o istasyonu etkinleştirir'(s) {
    await s.git('./?az=1#surec');
    await s.bekleOge('.adim__git');
    const d = await s.js(`document.querySelectorAll('.adim__git').length`);
    if (d !== 8) throw new Error(`düğme sayısı ${d}`);
    await s.js(`document.querySelectorAll('.adim__git')[5].focus()`);
    await s.tus('Enter', 'Enter', 13);
    await bekle(500);
    const r = await s.js(`[document.querySelector('.adim.etkin .adim__no').textContent, document.getElementById('surec-sayac').getAttribute('aria-valuenow'), document.querySelectorAll('.adim__git')[5].getAttribute('aria-label')]`);
    if (r[0] !== '06' || r[1] !== '6' || !r[2].includes('Laboratuvar')) throw new Error(`etkin: ${r}`);
  },
  async 'atölye (dokunmatik): yatay sürükleme satırı boyar, dikey kaydırma sayfayı kaydırır, dokunuş tek kare çevirir'(s) {
    await s.git('./?az=1#atolye', 390, 844);
    await s.bekleOge('#atolye-analiz div');
    await s.js(`document.getElementById('atolye-temizle').click(); document.getElementById('atolye-kagit').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    await bekle(300);
    /* kâğıdın 2. satırı boyunca soldan sağa parmak sürükle (kart -2° eğik: offsetX ile çözülmeli) */
    const r = await s.js(`(() => { const k = document.getElementById('atolye-kagit').getBoundingClientRect(); return [k.left, k.top, k.width, k.height]; })()`);
    const y = r[1] + r[3] * (1.5 / 8), x0 = r[0] + r[2] * 0.06, x1 = r[0] + r[2] * 0.94;
    await s.dokun('touchStart', x0, y);
    for (let k = 1; k <= 12; k++) await s.dokun('touchMove', x0 + (x1 - x0) * k / 12, y);
    await s.dokun('touchEnd', x1, y);
    await bekle(200);
    const a = await s.js(`document.getElementById('atolye-analiz').textContent.replace(/\\s+/g, ' ')`);
    /* 8 × 8 kâğıtta tam bir satır dolu: 8/64 = %13 çözgü yüzü */
    if (!a.includes('%13')) throw new Error(`analiz: ${a}`);
    /* kâğıtta başlayan dikey kaydırma sayfayı kaydırır, kare değiştirmez (touch-action: pan-y + ertelenen ilk kare) */
    const y0 = await s.js('scrollY');
    const kx = r[0] + r[2] * 0.5, ky = r[1] + r[3] * 0.8;
    await s.dokun('touchStart', kx, ky);
    for (let k = 1; k <= 10; k++) await s.dokun('touchMove', kx, ky - k * 20);
    await s.dokun('touchEnd', kx, ky - 200);
    await bekle(300);
    const [y1, a2] = await s.js(`[scrollY, document.getElementById('atolye-analiz').textContent.replace(/\\s+/g, ' ')]`);
    if (y1 === y0 || !a2.includes('%13')) throw new Error(`dikey kaydırma: scrollY ${y0}→${y1}, analiz ${a2}`);
    /* savrulma (fling) sürerken dokunuş kaydırmayı durdurur, tıklama üretmez: kaydırma durulana kadar bekle */
    for (let k = 0, once = -1; k < 30; k++) { const y = await s.js('scrollY'); if (y === once) break; once = y; await bekle(100); }
    /* tek dokunuş tam bir kare çevirir: 9/64 = %14 */
    /* kaydırma mesafesi yüke göre değişir; kâğıdın altı hızlı erişim çubuğunun altına girerse dokunuş çubuğa düşer (görüldü): ortala */
    await s.js(`document.getElementById('atolye-kagit').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    await bekle(150);
    const r2 = await s.js(`(() => { const k = document.getElementById('atolye-kagit').getBoundingClientRect(); return [k.left, k.top, k.width, k.height]; })()`);
    const tx = r2[0] + r2[2] * (6.5 / 8), ty = r2[1] + r2[3] * (5.5 / 8);
    await s.js(`window.__olay = []; const k = document.getElementById('atolye-kagit'); ['pointerdown', 'pointerup', 'pointercancel'].forEach((t) => k.addEventListener(t, (e) => window.__olay.push(t + ':' + e.pointerType), { once: true })); document.elementFromPoint(${tx}, ${ty})?.id || document.elementFromPoint(${tx}, ${ty})?.className`);
    await s.dokun('touchStart', tx, ty); await s.dokun('touchEnd', tx, ty);
    await bekle(200);
    const a3 = await s.js(`document.getElementById('atolye-analiz').textContent.replace(/\\s+/g, ' ')`);
    if (!a3.includes('%14')) throw new Error(`tek dokunuş: ${a3} · olaylar ${await s.js('JSON.stringify(window.__olay)')} · noktadaki öğe ${await s.js(`(document.elementFromPoint(${tx}, ${ty}) || {}).id`)}`);
  },
  async 'pencere (telefon): uzun hizmet metni kayar, eylem düğmesi ekrana gelir'(s) {
    for (const [g, y] of [[390, 844], [360, 640], [1440, 700]]) {
      await s.git(`./?az=1&g=${g}#hizmet-laboratuvar`, g, y);   /* boyut başına ayrı adres: aynı adrese gitmek yalnız parça gezintisi olur, sayfa yeniden yüklenmez */
      await s.bekleOge('#hizmet-penceresi[open]');   /* pencere kodu tembel iner */
      await s.js(OTUR);
      const r = await s.js(`(() => { const m = document.querySelector('.pencere__metin'); m.scrollTop = 1e5; const c = document.getElementById('pencere-cta').getBoundingClientRect(); return [Math.round(c.bottom), innerHeight, document.getElementById('hizmet-penceresi').open]; })()`);
      if (!r[2] || r[0] > r[1]) throw new Error(`${g}×${y}: düğme altı ${r[0]} > ekran ${r[1]}`);
    }
  },
  async 'sabit yüzeyler: yatay telefonda menünün ve ışık kutusunun son öğesi ulaşılabilir'(s) {
    const sorun = [];
    for (const [g, y] of [[844, 390], [667, 375], [390, 844]]) {
      await s.git('./?az=1', g, y);
      const menu = await s.js(`(() => { document.getElementById('menu-dugme').click(); const m = document.getElementById('menu'); m.scrollTop = 1e5; const r = [...m.querySelectorAll('a')].pop().getBoundingClientRect(); return [Math.round(r.bottom), innerHeight]; })()`);
      if (menu[0] > menu[1]) sorun.push(`${g}×${y} menü ${menu[0]}>${menu[1]}`);
      await s.tus('Escape', 'Escape', 27);
      const kutu = await s.js(`(() => { document.querySelector('[data-buyut="1"]').click(); const k = document.getElementById('isik-kutusu'); const els = [...k.querySelectorAll('button, figcaption')].map((e) => e.getBoundingClientRect()); return [Math.round(Math.max(...els.map((r) => r.bottom))), innerHeight]; })()`);
      if (kutu[0] > kutu[1]) sorun.push(`${g}×${y} ışık kutusu ${kutu[0]}>${kutu[1]}`);
    }
    if (sorun.length) throw new Error(sorun.join(', '));
  },
  async 'klavye gezintisi: her Tab adımında odak ekranda ve görünür'(s) {
    const sorun = [], turlar = [];
    for (const [g, y] of [[1440, 900], [390, 844]]) {
      await s.git('./?az=1', g, y);
      await s.bekleOge('#lab-olculen li', 1);
      await s.js(OTUR);
      for (let k = 0; k < 110; k++) {
        await s.tus('Tab', 'Tab', 9);
        const olc = (yeniden) => `(() => {
          /* sayfa sonunda odak tarayıcıya çıkar: başsız Chrome'da belge odağı kaybeder, tur tamamdır */
          if (!document.hasFocus()) return { bitti: true };
          const e = document.activeElement; if (!e || e === document.body) return null;
          /* ilk durak (atlama bağlantısı) yeniden odaklandıysa tur tamam */
          if (!${yeniden} && window.__ilkDurak && e === window.__ilkDurak) return { bitti: true };
          window.__ilkDurak ??= e;
          const b = (e.matches('input[type=radio], input[type=checkbox]') && e.nextElementSibling ? e.nextElementSibling : e).getBoundingClientRect();
          /* özel radyo: input saydam, odak halkası yanındaki etikette (input:focus-visible + span) */
          const vekil = e.matches('input[type=radio], input[type=checkbox]') && +getComputedStyle(e).opacity < 0.05 ? e.nextElementSibling : e;
          let gor = true; for (let x = vekil; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.visibility === 'hidden' || +c.opacity < 0.05 || c.display === 'none') gor = false; }
          const ekranda = b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth;
          return { ad: (e.id || e.className || e.tagName).toString().slice(0, 28) + ' ' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16), ok: gor && ekranda && b.width > 0, neden: (gor ? '' : 'gizli ') + 'y ' + (b.top | 0) + '–' + (b.bottom | 0) + '/' + innerHeight + ' x ' + (b.left | 0) + ' w ' + (b.width | 0) };
        })()`;
        let r = await s.js(olc(false));
        if (r?.bitti) { turlar.push(k); break; }
        /* bir yeniden çizim gecikmesi (bir kez görüldü: 390 px Tab#1) düşüş sayılmasın; kalıcı sorun 200 ms sonra da görünür */
        if (r && !r.ok) { await bekle(200); r = await s.js(olc(true)); }
        if (r && !r.ok) sorun.push(`${g}px Tab#${k + 1} ${r.ad} (${r.neden})`);
      }
    }
    if (sorun.length) throw new Error([...new Set(sorun)].slice(0, 8).join(' | '));
    if (turlar.some((k) => k < 40)) throw new Error(`tur çok kısa: ${turlar} odak durağı`);
  },
  async 'tuvaller: her 2B sahne gerçekten çizilmiş (normal ve azaltılmış hareket, masaüstü ve telefon)'(s) {
    const sorun = [];
    const hedefler = ['.numune__kumas canvas', '#surec-tuval', '#lab-tuval', '#atolye-onizleme', '#atolye-kagit', '#jakar canvas'];
    /* çizim anı piksel okumadan ölçülür: 2B bağlamın çizim yöntemleri tuval başına ilk çağrının sayfa saatini kaydeder.
       Önceden her 200 ms'de getImageData okunuyordu; yazılımsal GPU'da tek okuma 1,0–4,8 s sürüp (GPU kuyruğunu bekler)
       ölçümü şişiriyordu: %97 yükte gerçek çizim 0,2–2,1 s iken senaryo 3–4 s "geç" yazıyordu (.cekim-gecici/cizim-ani.txt). */
    await s.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const ilk = new WeakMap(); window.__ilkCizim = (c) => ilk.get(c) ?? null;
      for (const ad of ['drawImage', 'putImageData', 'fillRect', 'fill', 'stroke']) { const asil = CanvasRenderingContext2D.prototype[ad];
        CanvasRenderingContext2D.prototype[ad] = function (...a) { if (!ilk.has(this.canvas)) ilk.set(this.canvas, performance.now()); return asil.apply(this, a); }; } })();` });
    for (const mod of ['', 'az=1']) {
      for (const [g, y] of [[1440, 900], [390, 844]]) {
        await s.git(`./?${mod}`, g, y);
        for (const sec of hedefler) {
          /* tembel kurulan tuval (ör. #jakar canvas) henüz yoksa önce kabına kaydır, sonra öğeyi bekle */
          await s.js(`(document.querySelector(${JSON.stringify(sec)}) || document.querySelector(${JSON.stringify(sec.split(' ')[0])})).scrollIntoView({ block: 'center', behavior: 'instant' })`);
          if (!(await s.bekleOge(sec))) { sorun.push(`${mod || 'normal'} ${g}px ${sec}: öğe kurulmadı`); continue; }
          await s.js(`document.querySelector(${JSON.stringify(sec)}).scrollIntoView({ block: 'center', behavior: 'instant' })`);
          /* çizim anı: kaydırmadan sonra ilk 2B çizim çağrısı (önceden çizilmişse 0); 3B süreç tuvali ilk karesinde data-cizildi="3b" koyar */
          const t0 = await s.js('performance.now()'); let ilk = null; const d0 = Date.now();
          while (Date.now() - d0 < 4000 && ilk == null) {
            ilk = await s.js(`(() => { const c = document.querySelector(${JSON.stringify(sec)}); if (c.dataset.cizildi === '3b') return window.__an3b ??= performance.now(); return window.__ilkCizim(c); })()`);
            if (ilk == null) await bekle(50);
          }
          const sure = ilk == null ? 4000 : Math.max(0, Math.round(ilk - t0));
          /* içerik: çizim başladıktan sonra pikseller okunur (ilerleyerek dokunan sahnelerde eşik dolana dek, en çok 4 s) */
          /* desen kâğıdı düz grafik (zemin, kare, çizgi): ≥ 3 renk; dokulu sahneler ≥ 8 */
          const esik = sec === '#atolye-kagit' ? 3 : 8;
          let r = 0; const t1 = Date.now();
          while (ilk != null && Date.now() - t1 < 4000) {
            r = await s.js(`(() => {
              const c = document.querySelector(${JSON.stringify(sec)}); if (!c.width || !c.height) return 0;
              /* süreç tuvali WebGL (3B) ya da 2B yedek olabilir: sahne ilk karesinde data-cizildi koyar; 3B tuvale 2B bağlam istenmez (tuvali kilitler) */
              if (c.id === 'surec-tuval') return c.dataset.cizildi === '3b' ? 99 : c.dataset.cizildi === '2b' ? (() => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const r = new Set(); for (let i = 0; i < d.length; i += 4 * 97) r.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return r.size; })() : 0;
              const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
              const renk = new Set(); for (let i = 0; i < d.length; i += 4 * 97) renk.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
              return renk.size;
            })()`);
            if (r >= esik) break;
            await bekle(200);
          }
          if (sure > 2500) sorun.push(`${mod || 'normal'} ${g}px ${sec}: geç çizildi (${sure} ms)`);
          if (typeof r === 'string' || r < esik) sorun.push(`${mod || 'normal'} ${g}px ${sec}: ${r}`);
        }
      }
    }
    if (sorun.length) throw new Error(sorun.join(' | '));
  },
  async 'dil: İngilizce tarayıcıda hiçbir karede Türkçe metin parlamaz'(s) {
    /* önceki senaryoların kaydettiği dil tercihi (localStorage) tarayıcı dilinin önüne geçer: temizle */
    await s.cdp('Storage.clearDataForOrigin', { origin: new URL(ADRES).origin, storageTypes: 'local_storage' });
    await s.cdp('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0', acceptLanguage: 'en-GB', platform: 'Win32' });
    await s.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__kayit = []; const t0 = performance.now(); const f = () => { const e = document.querySelector('.giris__baslik'); if (e && document.body && getComputedStyle(document.body).visibility !== 'hidden') window.__kayit.push(e.innerText.replace(/\s+/g, ' ').trim()); if (performance.now() - t0 < 3000) requestAnimationFrame(f); }; requestAnimationFrame(f);` });
    await s.git('./');
    await bekle(1500);
    const r = await s.js(`JSON.stringify({ dil: navigator.language, gorunen: [...new Set(window.__kayit)] })`);
    const { dil, gorunen } = JSON.parse(r);
    if (!dil.startsWith('en')) throw new Error(`tarayıcı dili taklit edilemedi: ${dil}`);
    const turkce = gorunen.filter((t) => /Teknik|gücün/.test(t));
    if (turkce.length || !gorunen.length) throw new Error(`görünen başlıklar: ${JSON.stringify(gorunen)}`);
    /* arama motoru botu İngilizce tarayıcı diliyle gelse de kanonik Türkçe adreste Türkçe görür; ?dil=en kendini kanonik gösterir */
    await s.cdp('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', acceptLanguage: 'en-US', platform: 'Win32' });
    await s.git('./');
    const bot = await s.js(`[document.documentElement.lang, document.querySelector('link[rel="canonical"]').href, document.documentElement.classList.contains('dil-bekle')]`);
    if (bot[0] !== 'tr' || bot[1] !== 'https://www.antratech.net/' || bot[2]) throw new Error(`bot /: ${bot}`);
    await s.git('./?dil=en');
    /* dil ve kanonik adresi çeviri modülü yazar: sabit 1,8 s yazılımsal GPU + yüklü makinede yetmeyebiliyor (kararsız düşüş); son durum beklenir */
    let botEn = [];
    for (const t0 = Date.now(); Date.now() - t0 < 6000; await bekle(150)) { botEn = await s.js(`[document.documentElement.lang, document.querySelector('link[rel="canonical"]').href]`); if (botEn[0] === 'en') break; }
    if (botEn[0] !== 'en' || botEn[1] !== 'https://www.antratech.net/?dil=en') throw new Error(`bot ?dil=en: ${botEn}`);
  },
  async 'kahraman: künye başlık, metin ve düğmelerle çakışmaz (TR/EN, 1110–1920 px)'(s) {
    const sorun = [];
    for (const dil of ['tr', 'en']) {
      for (const g of [1110, 1280, 1440, 1920]) {
        await s.git(`./?az=1&dil=${dil}`, g, 800);
        await s.js(`document.fonts.ready.then(() => true)`);
        const r = await s.js(`(() => { const k = document.querySelector('.kunye'); if (getComputedStyle(k).display === 'none') return []; const kb = k.getBoundingClientRect();
          return [...document.querySelectorAll('.giris__baslik .satir, .giris__ic > .ust-baslik, .giris__metin, .giris__eylem a')].map((e) => { const rg = document.createRange(); rg.selectNodeContents(e); const b = rg.getBoundingClientRect();
            return b.right > kb.left - 16 && b.bottom > kb.top && b.top < kb.bottom ? e.textContent.trim().slice(0, 16) : null; }).filter(Boolean); })()`);
        if (r.length) sorun.push(`${dil} ${g}px: ${r.join(', ')}`);
      }
      /* dizüstünde tarayıcı çubuklarıyla iç yükseklik ~580–730 px: kahraman düğmeleri ilk ekranda kalmalı */
      for (const [g, y] of [[1280, 580], [1366, 657], [1536, 730], [1024, 640]]) {
        await s.git(`./?az=1&dil=${dil}`, g, y);
        /* yazı tipleri inmeden ölçülürse yedek yazının satır yüksekliği düğmeleri aşağı iter (kararsız düşüş) */
        await s.js(`document.fonts.ready.then(() => true)`);
        const alt = await s.js(`Math.round(Math.max(...[...document.querySelectorAll('.giris__eylem a')].map((a) => a.getBoundingClientRect().bottom)))`);
        if (alt > y) sorun.push(`${dil} ${g}×${y}: düğmeler ${alt} px'te biter`);
      }
    }
    if (sorun.length) throw new Error(sorun.join(' | '));
  },
  async 'taşma: 320–1440 px arası hiçbir genişlikte yatay kaydırma yok (TR ve EN)'(s) {
    const sorun = [];
    for (const dil of ['tr', 'en']) {
      for (const g of [320, 360, 390, 414, 600, 768, 1024, 1280, 1440]) {
        await s.git(`./?az=1&dil=${dil}`, g, 800);
        await s.js(OTUR);
        /* kalıcı taşma: oturmuş düzende ölçülür; varsa taşan öğe adıyla raporlanır */
        const w = await s.js(`(() => { const W = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth; if (sw <= W) return [sw];
          const t = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > W + 0.5; }).map((e) => (e.className || e.tagName).toString().slice(0, 30));
          return [sw, ...t.slice(-3)]; })()`);
        if (w[0] > g) sorun.push(`${dil} ${g}px → ${w.join(' ')}`);
      }
    }
    if (sorun.length) throw new Error(sorun.join(', '));
  },
  async 'galeri: mozaik kareleri binmez, etiket karede ve kesilmez, Tab sırası okuma sırası (360–1440 px, TR/EN)'(s) {
    const sorun = [];
    for (const dil of ['tr', 'en']) {
      for (const g of [360, 390, 700, 1024, 1280, 1440]) {
        await s.git(`./?az=1&dil=${dil}`, g, 900);
        await s.js(`document.getElementById('galeri').scrollIntoView({ behavior: 'instant' })`);
        await bekle(250);
        const r = await s.js(`(() => {
          const k = [...document.querySelectorAll('.kare__dugme')].map((d) => ({ b: d.getBoundingClientRect(), y: d.querySelector('.kare__yazi') }));
          let binen = 0;
          for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
            const a = k[i].b, c = k[j].b, en = Math.min(a.right, c.right) - Math.max(a.left, c.left), boy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
            if (en > 1 && boy > 1) binen++;
          }
          const disarida = k.filter(({ b, y }) => { const e = y.getBoundingClientRect(); return e.left < b.left - 1 || e.right > b.right + 1 || e.top < b.top - 1 || e.bottom > b.bottom + 1; }).length;
          const kesik = k.filter(({ y }) => y.scrollWidth > y.clientWidth + 1).length;
          const kucuk = k.filter(({ b }) => b.width < 128 || b.height < 100).length;
          /* okuma sırası: önce satır (üst kenar), sonra sol kenar */
          const sira = k.map((x, i) => ({ i, t: Math.round(x.b.top / 8), l: x.b.left })).sort((a, b) => a.t - b.t || a.l - b.l).map((x) => x.i).join();
          return { binen, disarida, kesik, kucuk, sira, adet: k.length };
        })()`);
        const dogal = [...Array(r.adet).keys()].join();
        if (r.binen || r.disarida || r.kesik || r.kucuk) sorun.push(`${dil} ${g}px: ${r.binen} binen, ${r.disarida} etiket dışarıda, ${r.kesik} kesik etiket, ${r.kucuk} küçük kare`);
        if (r.sira !== dogal) sorun.push(`${dil} ${g}px: okuma sırası ${r.sira}`);
      }
    }
    if (sorun.length) throw new Error(sorun.join(' | '));
  },
  async '3B: süreç maketi ve laboratuvar cihazları çizilir, mühürler yazılı, T1–T5 ölçüm satırı güncellenir (?webgl=1)'(s) {
    /* hız değil işlev: yazılımsal GPU'da 3B zorlanır (gerçek kullanıcıda yazılımsal çizici 2B yedeğe düşer) */
    await s.git('./?webgl=1#surec');
    const t0 = Date.now();
    while (Date.now() - t0 < 20000 && !(await s.js(`document.getElementById('surec-tuval').dataset.cizildi === '3b'`))) await bekle(300);
    const muhur = await s.js(`[...document.querySelectorAll('#surec-muhurler .surec-muhur__yazi')].map((e) => e.textContent).filter(Boolean).length`);
    if (muhur !== 8) throw new Error(`süreç 3B çizilmedi ya da mühür ${muhur}/8`);
    await s.js(`document.getElementById('laboratuvar').scrollIntoView({ behavior: 'instant' })`);
    const t1 = Date.now();
    while (Date.now() - t1 < 20000 && !(await s.js(`document.getElementById('lab-uc').dataset.cizildi === '3b'`))) await bekle(300);
    const kalip = [/^Kuvvet|^Kopma/, /^Devir/, /^Pozlama/, /^Sıklık/, /^Alev/];
    for (let i = 0; i < 5; i++) {
      await s.js(`document.getElementById('test-${i}').click()`);
      await bekle(700);
      const r = await s.js(`[document.querySelector('.lab__ekran').className, document.getElementById('lab-olcum').textContent]`);
      if (!r[0].includes('lab__ekran--3b') || r[0].includes('--duz') || !kalip[i].test(r[1])) throw new Error(`T${i + 1}: ${r}`);
    }
    await s.js(`document.getElementById('test-5').click()`);
    await bekle(300);
    if (!(await s.js(`document.querySelector('.lab__ekran').classList.contains('lab__ekran--duz')`))) throw new Error('muayene tek bölmeye dönmedi');
  },
  async 'kahraman: künyeden zemin örgüsü değişir, tıklama dalgası hata vermez'(s) {
    await s.git('./');
    await bekle(800);
    const hazir = await s.js(`!document.getElementById('kunye-orgu').disabled`);
    if (!hazir) throw new Error('künye düğmesi etkin değil (WebGL kurulmadı?)');
    await s.js(`document.getElementById('kunye-orgu').click()`);
    const ad = await s.js(`document.getElementById('kunye-orgu-ad').textContent`);
    await s.tikla(1000, 450);
    await bekle(400);
    if (!ad.includes('Bezayağı')) throw new Error(`örgü: ${ad}`);
  },
};

let gecen = 0, dusen = 0;
/* SENARYO=<parça> yalnız adı o parçayı içeren senaryoları koşar */
for (const [ad, fn] of Object.entries(SENARYO).filter(([ad]) => !process.env.SENARYO || ad.includes(process.env.SENARYO))) {
  const s = await sekmeAc();
  try {
    await fn(s);
    const konsol = s.hatalar.filter((h) => !/Failed to load resource.*404/.test(h));
    if (konsol.length) throw new Error(`konsol: ${konsol.join(' | ')}`);
    gecen++; console.log(`  ✓ ${ad}`);
  } catch (h) { dusen++; console.log(`  ✗ ${ad} — ${h.message}`); }
  await s.kapat();
}
console.log(`\n${gecen} geçti · ${dusen} düştü`);
surec.once('exit', () => { try { rmSync(profil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* sonraki koşu siler */ } });
surec.kill();
process.exitCode = dusen ? 1 : 0;
