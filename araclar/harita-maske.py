"""HARİTA MASKESİ — faaliyet haritasının kara/su ızgarasını üretir (bir kez koşulur, çıktı sahne/harita-veri.mjs).

Kaynak: NASA Visible Earth türevi okyanus parlaklık maskesi (three.js örnek dokusu, 2048 × 1024 eşdikdörtgen),
yerel kopya: sunumatik/presets/earth_advanced/textures/earth_specular_2048.webp (köken: asset-provenance.json).
Maskede su beyaz, kara siyahtır. Her kanaviçe hücresi kendi alanındaki piksellerin çoğunluğuyla kara ya da su sayılır.

    python araclar/harita-maske.py <earth_specular_2048.webp> <earth_normal_2048.webp> [ne_50m_admin_0_countries.geojson]

Eğim katmanı: aynı kaynağın arazi normal haritasından (earth_normal_2048) hücre başına ortalama eğim; kara hücreleri
yüzdeliklere göre 0–3 düzeyine ayrılır (3 = en dik %8: Kafkaslar, Toroslar, Tanrı Dağları, Pamir).

Izgara: boylam 22–84° D, enlem 33–56° K; enlem adımı 0,33°, boylam adımı 0,33° / cos(44,5°) (hücreler ekranda kare).
Sınır katmanı (isteğe bağlı üçüncü girdi): Natural Earth 1:50m ülkeleri (kamu malı; github.com/nvkelso/natural-earth-vector,
geojson/ne_50m_admin_0_countries.geojson, 10 Ekim 2026'da indirildi). Her KARA hücresinin merkezi hangi ülke çokgenindeyse o ülke
(ADM0_A3). İki komşu kara hücresi farklı ülkedeyse aradaki kenar sınırdır; ülkesi bulunamayan hücre (kıyı uyuşmazlığı) sınır üretmez.
sinir: 2 bit/hücre (üst bit sağ kenar, alt bit alt kenar). hedef: 1 bit/hücre, Türkiye ve beş Türk cumhuriyeti.
"""
import base64
import json
import math
import sys

from PIL import Image

LON0, LON1, LAT0, LAT1 = 22.0, 84.0, 33.0, 56.0
DLAT = 0.33
FI0 = 44.5
DLON = DLAT / math.cos(math.radians(FI0))


HEDEF = {'TUR', 'AZE', 'TKM', 'UZB', 'KGZ', 'KAZ'}


def halkada(x, y, halka):
    ic = False
    j = len(halka) - 1
    for i in range(len(halka)):
        xi, yi = halka[i][0], halka[i][1]
        xj, yj = halka[j][0], halka[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ic = not ic
        j = i
    return ic


def ulkeler(yol):
    """bölgeyle kesişen ülkeler: (kod, [(kutu, dış halka, delikler)])"""
    veri = json.load(open(yol, encoding='utf-8'))
    sonuc = []
    for f in veri['features']:
        kod = f['properties'].get('ADM0_A3')
        g = f['geometry']
        coklu = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        parcalar = []
        for poli in coklu:
            dis = poli[0]
            xs = [p[0] for p in dis]; ys = [p[1] for p in dis]
            kutu = (min(xs), min(ys), max(xs), max(ys))
            if kutu[2] < LON0 or kutu[0] > LON1 or kutu[3] < LAT0 or kutu[1] > LAT1:
                continue
            parcalar.append((kutu, dis, poli[1:]))
        if parcalar:
            sonuc.append((kod, parcalar))
    return sonuc


def ulke_bul(lon, lat, liste):
    for kod, parcalar in liste:
        for kutu, dis, delikler in parcalar:
            if kutu[0] <= lon <= kutu[2] and kutu[1] <= lat <= kutu[3] and halkada(lon, lat, dis) and not any(halkada(lon, lat, d) for d in delikler):
                return kod
    return None


def main(yol, normal_yol, sinir_yol=None):
    im = Image.open(yol).convert('L')
    nm = Image.open(normal_yol).convert('RGB').resize(im.size)
    npx = nm.load()
    W, H = im.size
    px = im.load()
    sutun = int(round((LON1 - LON0) / DLON))
    satir = int(round((LAT1 - LAT0) / DLAT))
    bitler = []
    egimler = []
    kara = 0
    for r in range(satir):
        lat_ust = LAT1 - r * DLAT
        for c in range(sutun):
            lon_sol = LON0 + c * DLON
            x0 = (lon_sol + 180) / 360 * W
            x1 = (lon_sol + DLON + 180) / 360 * W
            y0 = (90 - lat_ust) / 180 * H
            y1 = (90 - (lat_ust - DLAT)) / 180 * H
            su = top = 0
            egim = 0.0
            for yy in range(int(y0), max(int(y0) + 1, int(math.ceil(y1)))):
                for xx in range(int(x0), max(int(x0) + 1, int(math.ceil(x1)))):
                    top += 1
                    su += px[xx % W, min(H - 1, yy)] > 128
                    r_, g_, _ = npx[xx % W, min(H - 1, yy)]
                    egim += math.hypot(r_ / 127.5 - 1, g_ / 127.5 - 1)
            k = 1 if su * 2 < top else 0
            egimler.append(egim / top if k else -1)
            kara += k
            bitler.append(k)
    bayt = bytearray((len(bitler) + 7) // 8)
    for i, b in enumerate(bitler):
        if b:
            bayt[i >> 3] |= 1 << (7 - (i & 7))
    veri = base64.b64encode(bytes(bayt)).decode()
    karalar = sorted(e for e in egimler if e >= 0)
    esik = [karalar[int(len(karalar) * q)] for q in (0.55, 0.80, 0.92)]
    duzey = bytearray((len(egimler) + 3) // 4)
    for i, e in enumerate(egimler):
        d = 0 if e < 0 else sum(e >= t for t in esik)
        duzey[i >> 2] |= d << (6 - 2 * (i & 3))
    egim_veri = base64.b64encode(bytes(duzey)).decode()
    ek = ''
    if sinir_yol:
        liste = ulkeler(sinir_yol)
        kod = []
        for r in range(satir):
            for c in range(sutun):
                i = r * sutun + c
                kod.append(ulke_bul(LON0 + (c + 0.5) * DLON, LAT1 - (r + 0.5) * DLAT, liste) if bitler[i] else None)
        sinir = bytearray((len(kod) + 3) // 4)
        hedef = bytearray((len(kod) + 7) // 8)
        kenar = 0
        for r in range(satir):
            for c in range(sutun):
                i = r * sutun + c
                a = kod[i]
                sag = c + 1 < sutun and a and kod[i + 1] and kod[i + 1] != a
                alt = r + 1 < satir and a and kod[i + sutun] and kod[i + sutun] != a
                sinir[i >> 2] |= ((2 if sag else 0) | (1 if alt else 0)) << (6 - 2 * (i & 3))
                kenar += bool(sag) + bool(alt)
                if a in HEDEF:
                    hedef[i >> 3] |= 1 << (7 - (i & 7))
        sayim = {k: kod.count(k) for k in sorted(HEDEF)}
        print('hedef hücre sayısı', sayim, 'sınır kenarı', kenar, 'ülkesiz kara', sum(1 for i, k in enumerate(kod) if bitler[i] and not k))
        ek = f", sinir: '{base64.b64encode(bytes(sinir)).decode()}', hedef: '{base64.b64encode(bytes(hedef)).decode()}'"
    cikti = (
        '/* harita-veri.mjs — ÜRETİLMİŞ DOSYA, elle düzenlemeyin: python -I araclar/harita-maske.py <earth_specular_2048.webp> <earth_normal_2048.webp> <ne_50m_admin_0_countries.geojson>\n'
        ' * veri: kara/su ızgarası, NASA Visible Earth türevi okyanus maskesi (three.js örnek dokusu). 1 bit/hücre, 1 = kara. Satırlar kuzeyden güneye.\n'
        ' * egim: 2 bit/hücre eğim düzeyi (0 düz … 3 dağlık), aynı kaynağın arazi normal haritasından.\n'
        ' * sinir: 2 bit/hücre ülke sınırı kenarı (sağ, alt) · hedef: 1 bit/hücre Türkiye + beş Türk cumhuriyeti — Natural Earth 1:50m (kamu malı). */\n'
        f'export const MASKE = {{ lon0: {LON0}, lat1: {LAT1}, dlon: {DLON:.6f}, dlat: {DLAT}, fi0: {FI0}, sutun: {sutun}, satir: {satir}, veri: \'{veri}\', egim: \'{egim_veri}\'{ek} }};\n'
    )
    with open('sahne/harita-veri.mjs', 'w', encoding='utf-8', newline='\n') as f:
        f.write(cikti)
    print(f'{sutun} × {satir} hücre, kara {kara} ({kara / len(bitler):.0%}), {len(veri)} karakter')


if __name__ == '__main__':
    main(*sys.argv[1:4])
