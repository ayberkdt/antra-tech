/* ORİJİNAL METİN — kaynak/orijinal-sayfalar/*.html (antratech.net'in kaydedilmiş Türkçe sayfaları) içinden
 * içerik bölgesini çıkarır ve cümlelere böler. dogrula.mjs her cümlenin index.html'de birebir geçtiğini sınar.
 *   node araclar/orijinal.mjs        → eşleşmeyen cümleleri listeler (keşif)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const KLASOR = join(KOK, 'kaynak', 'orijinal-sayfalar');

const VARLIK = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—',
  uuml: 'ü', Uuml: 'Ü', ouml: 'ö', Ouml: 'Ö', ccedil: 'ç', Ccedil: 'Ç', iacute: 'í', eacute: 'é', acirc: 'â', icirc: 'î', ucirc: 'û' };
export function coz(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, a) => VARLIK[a] ?? m);
}
/* satır içi biçim etiketleri (em, strong, b, i) boşluksuz düşer: "<em>kelime</em>." → "kelime." */
export function duzMetin(html) {
  return coz(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<\/?(em|strong|b|i)\b[^>]*>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
export const normal = (s) => s.replace(/[\s ]+/g, ' ').trim();
/* karşılaştırma biçimi: tırnaklar düşer, virgül önü boşluk (kaynaktaki yazım hatası) silinir, sondaki üç nokta nokta sayılır */
export const karsilastir = (s) => normal(s).replace(/[“”]/g, '').replace(/ ,/g, ',').replace(/…$/, '.');

/* bilinçli olarak sayfaya alınmayan orijinal cümleler (gerekçeli) */
export const ISTISNA = [
  { dosya: 'index.html', bas: 'Antra Tech olarak, teknik tekstil alanında 30 yılı aşkın', neden: 'Kurumsal bölümündeki Hakkımızda metniyle aynı mesaj; tekrar olmasın diye alınmadı' },
  { dosya: 'sayfa_hakkimizda.html', bas: 'Başta savunma sanayi kuruluşları olmak üzere; Kara Kuvvetleri', neden: 'Kurum listesiyle aynı bilgi (aynı dört kurum adı); döngüsel anlatım olmasın diye liste olarak verildi' },
  { dosya: 'sayfa_hakkimizda.html', bas: 'Bunun yanı sıra Tarım ve Orman Bakanlığı', neden: 'Kurum listesinde Tarım ve Orman Bakanlığı satırının alt yazısı (kumaş üretimi · mühendislik ve kalite kontrol) aynı bilgiyi taşıyor' },
];

/* sayfa → içerik bölgesi: başlığın üçüncü geçişinden (menü, kırıntı, başlık) sonraki bloklar, bitiş işaretine dek */
const BOLGE = {
  'index.html': { bas: 'Teknik Tekstil ve Üretim Kontrolünde Güvenilir Çözüm Ortağınız', son: 'Müşteri Destek' },
  'sayfa_hakkimizda.html': { baslik: 'Hakkımızda', son: 'Diğer Fotoğraflar' },
  'sayfa_misyonumuz.html': { baslik: 'Misyonumuz', son: 'Diğer Fotoğraflar' },
  'sayfa_vizyonumuz.html': { baslik: 'Vizyonumuz', son: 'Diğer Fotoğraflar' },
};
export function cumleler() {
  if (!existsSync(KLASOR)) return [];
  const sonuc = [];
  for (const dosya of readdirSync(KLASOR).filter((f) => f.endsWith('.html'))) {
    const metin = duzMetin(readFileSync(join(KLASOR, dosya), 'utf8'));
    let bolge = null;
    const b = BOLGE[dosya];
    if (b?.bas) { const i = metin.indexOf(b.bas); bolge = metin.slice(i + b.bas.length, metin.indexOf(b.son, i)); }
    else {
      const satirlar = metin.split('\n');
      const baslik = b?.baslik ?? (dosya.startsWith('hizmetdetay_') ? null : undefined);
      if (baslik === undefined) continue;                     /* iletisim vb.: cümle içeriği yok */
      /* hizmet sayfası: başlık, sayfadaki "Ana Sayfa" kırıntısından hemen sonraki satır */
      const ana = satirlar.findIndex((s, i) => s === 'Ana Sayfa' && satirlar[i + 1] && satirlar[i + 1] === satirlar[i + 2]);
      if (ana < 0) continue;
      const bitis = satirlar.findIndex((s, i) => i > ana + 2 && (s === (b?.son ?? 'iletişim') || s.startsWith('Diğer Fotoğraflar')));
      bolge = satirlar.slice(ana + 3, bitis).join('\n');
    }
    for (const parca of bolge.split('\n')) {
      for (const c of parca.split(/(?<=[.!?…:])\s+(?=[A-ZÇĞİÖŞÜ“])/)) {
        const t = normal(c);
        if (t.length >= 20) sonuc.push({ dosya, cumle: t });
      }
    }
  }
  return sonuc;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sayfa = karsilastir(duzMetin(readFileSync(join(KOK, 'index.html'), 'utf8')));
  const tum = cumleler();
  const eksik = tum.filter(({ dosya, cumle }) => !sayfa.includes(karsilastir(cumle)) && !ISTISNA.some((i) => i.dosya === dosya && cumle.startsWith(i.bas)));
  console.log(`${tum.length} orijinal cümle · ${eksik.length} eşleşmeyen`);
  for (const e of eksik) console.log(`  [${e.dosya}] ${e.cumle}`);
}
