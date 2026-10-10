/* Çalışma saatleri (orijinal sitedeki tablo) ve "şu an açık mı" hesabı.
 * Saat dilimi Europe/Istanbul; ziyaretçinin saatinden bağımsız. Saf fonksiyon: Node'da sınanır. */

export const SAATLER = {
  /* 0 = pazar … 6 = cumartesi; [açılış, kapanış] dakika */
  1: [540, 1200], 2: [540, 1200], 3: [540, 1200], 4: [540, 1200], 5: [540, 1200],
  6: [570, 1320],
  0: null,
};
const GUN_ANAHTAR = ['gunPazar', 'gunPazartesi', 'gunSali', 'gunCarsamba', 'gunPersembe', 'gunCuma', 'gunCumartesi'];
const ss = (dk) => `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;

/** İstanbul'daki gün (0–6) ve gün içi dakika. */
export function istanbulZamani(tarih) {
  const parca = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(tarih);
  const al = (t) => parca.find((p) => p.type === t)?.value;
  const gun = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(al('weekday'));
  return { gun, dakika: +al('hour') * 60 + +al('minute') };
}

/** { acik, kapanis } ya da { acik:false, acilisGunu (çeviri anahtarı), acilis } */
export function acikMi(tarih) {
  const { gun, dakika } = istanbulZamani(tarih);
  const bugun = SAATLER[gun];
  if (bugun && dakika >= bugun[0] && dakika < bugun[1]) return { acik: true, kapanis: ss(bugun[1]) };
  for (let k = 0; k < 8; k++) {
    const g = (gun + k) % 7, s = SAATLER[g];
    if (!s) continue;
    if (k === 0 && dakika >= s[0]) continue;
    return { acik: false, acilisGunu: k === 0 ? 'gunBugun' : k === 1 ? 'gunYarin' : GUN_ANAHTAR[g], acilis: ss(s[0]) };
  }
  return { acik: false, acilisGunu: 'gunBugun', acilis: '09:00' };
}

/* Türkçe saat eki okunuşun son sözcüğüne uyar: 20:00 (yirmi) → ’ye / ’de, 18:00 (on sekiz) → ’e / ’de,
 * 09:30 (otuz) → ’a / ’da, 15:00 (on beş) → ’e / ’te. Dakika sıfırsa saat, değilse dakika okunur. */
const YONELME = { b: ['a', 'e', 'ye', 'e', 'e', 'e', 'ya', 'ye', 'e', 'a'], o: ['a', 'a', 'ye', 'a', 'a', 'ye'] };
const BULUNMA = { b: ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'], o: ['da', 'da', 'de', 'da', 'ta', 'de'] };
/** saatEki('20:00', 'e') → 'ye' · saatEki('09:30', 'de') → 'da' */
export function saatEki(saat, hal) {
  const [h, m] = saat.split(':').map(Number);
  const n = m ? m : h, t = hal === 'e' ? YONELME : BULUNMA;
  return n % 10 ? t.b[n % 10] : n ? t.o[n / 10] : t.b[0];
}
