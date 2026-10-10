# Antra Tech — teknik tekstil web sitesi

Tek sayfa, bağımlılıksız site: derleme yok, CDN yok, çalışma anında dış ağ isteği yok (yalnız kullanıcı
tıklarsa WhatsApp / Google Haritalar / e-posta bağlantıları). Bütün animasyonlar bu depoda yazılı
yordamsal çizimdir: görsel dosyası yalnız firmanın kendi fotoğrafları ve logosudur.

## Bir bakışta

- **Aç:** `siteyi-ac.cmd` (çift tık) → tarayıcıda açılır. **Sına:** `node araclar/dogrula.mjs` (+ tarayıcıda `node araclar/uctan-uca.mjs` ve `node araclar/erisilebilirlik.mjs`). **Yayınla:** klasörü Vercel'e (çerçeve "Other").
- **İmza parçalar:** kahramanda canlı WebGL dokuma tezgâhı (jakar "A" damask, mekik, tarak, imleç ışığı, tıklayınca dalga) ·
  elyaftan sevkiyata 8 istasyonlu kaydırmalı 2,5B üretim hattı · lup'lu kumaş numuneleri · 5 test canlandırması + kendiliğinden
  puanlanan kumaş muayenesi · istenen örgünün tezgâha uygunluğunu gösteren atölye · kanaviçe faaliyet haritası · mozaik galeri ·
  karton etiket biçimli form.
- **Müşteri onayı gereken yerler:** "Müşteriyle teyit edilecekler" ve "İçerik kaynağı" başlıkları (saatler, İngilizce sürüm, yeni yazılan metinler, harita yorumu, İngilizce çeviri).

## Çalıştırma

**`siteyi-ac.cmd` dosyasını çift tıklayın.** Python gerekmez: `sunucu.ps1` yerel sunucuyu açar ve
`http://127.0.0.1:8790/` adresini tarayıcıda gösterir. Kapatmak için pencerede Ctrl+C. Yayındaki gibi bilinmeyen adreste `404.html` döner.

`index.html`'i doğrudan açmak (`file://`) animasyonları çalıştırmaz: tarayıcılar ES modüllerini (Chrome yazı tiplerini de)
`file://` üzerinden yüklemez. Sayfa bunu algılar ve JS kapalı düzenine düşer: bütün metin ve fotoğraflar okunur,
canlı yüzeyler gizlenir, yazılar sistem yedeğiyle çizilir (sınandı).

Geliştirirken önbelleksiz sunucu: `python .claude/sunucu.py 4180` → `http://127.0.0.1:4180/`.

**Yayın:** herhangi bir statik barındırma. Vercel'de çerçeve "Other", derleme komutu ve çıktı dizini boş;
`vercel.json` `.mjs` türünü ve önbellek başlıklarını ayarlar, `.vercelignore` yayına yalnız siteyi gönderir: `kaynak/`, `araclar/` (yerel disk yolları içerir), bu README (iç notlar) ve yerel sunucu dosyaları dışarıda kalır.

URL parametreleri: `?dil=tr|en` · `?az=1` (azaltılmış hareket: her sahne son karede durur) · `?webgl=0` (kahramanda durağan zemin) · `?olc=1` (geliştirme: süreç hattının kare içi çizim süreleri `__surecOlcum` nesnesine yazılır; muayene sekmesi `__muayene` sınama kancasını açar).

## Sayfa düzeni

| Bölüm | İçerik | Etkileşim |
|---|---|---|
| Kahraman | "Teknik tekstilde gücün adı: Antra Tech" | **Canlı dokuma tezgâhı** (WebGL): mekik atkıyı geçirir, tarak vurur, kumaş sıra sıra sarılır. **Lampas jakar**: zemin indigo çözgülü 2/1 dimi (koyu atkı), desen gümüş-ekru atkılı 5'li saten "A" monogramı ve baklava — desen koyu zeminde açık okunur (önce koyu üstüne koyuydu); gücü çerçeveleri, tarak ve gücü gözleri açık çelik. Üst ve alt bant menü/etiket okunsun diye kararır; metin okunurluğu için yalnız metin bloğunun (üst başlık, başlık, metin, düğmeler) arkası koyulaşır ve dışa doğru 140 px'te söner (`uMetin`, site.mjs ölçer; yazı tipi gelince ResizeObserver günceller). Önce sol yarının tamamı %58 koyulaşıyor, oradaki motifler lacivert üstünde koyu gri kalıyordu. İmleç ışık kaynağıdır (Kajiya–Kay anizotrop parlaklık); tıklayınca halka dalga. Sağ üstte **kumaş künyesi**: kumaşa kırmızı iplikle bağlı karton askı etiketi (pirinç halka, kesik köşeler); zemin örgüsünün 6 × 6 **kareli kâğıt raporu** (örgü değişince yeniden çizilir), rapor (koddan) ve iplik satırı (shader renkleri: lacivert çözgü, gümüş desen atkısı, kırmızı kenar; canlandırma hızı "52 atkı/dk" tezgâh verisi gibi okunduğu için kaldırıldı); etiket ipten düz asılır, beş haneli **tezgâh sayacı** (dokunan atkı, canlı). Tezgâh kahraman görünür olunca kurulur (derin bağlantıyla ortadan açılan sayfa WebGL derlemesini beklemez). |
| 01 Kurumsal | Hakkımızda metni, hizmet verilen kurumlar, faaliyet coğrafyası | Izgara: başlık ↔ büyük giriş metni (anahtar ifadeler yumuşak-oynak kesim + altına soldan sağa dikilen kırmızı iplik); solda ekip fotoğrafı (danışmanlık görselinin yazısız kırpımı; yüksekliği yan sütunla eşitlenir, alt kenarı kurum listesiyle hizalı) ↔ gövde metni ve **kurumlar**: işlemeli arma (temsilî simge, kurum amblemi değil) + ad (yalnız Tarım ve Orman'da orijinal görev satırı); üzerine gelince lacivert bant soldan dolar. **Kanaviçe harita** (aşağıda). 3. turda tekrar ettikleri için kaldırılanlar: rakam şeridi, iki güvence panosu (Süreç ve Laboratuvar bölümlerinin 2,5B sahneleri aynı şeyi daha ayrıntılı gösteriyordu), bakım etiketi, kurumlar paragrafı |
| 02 Hizmetler | 6 hizmet, iki grupta: "Savunma ve kalite güvencesi" (savunma, laboratuvar, kontrol) · "Mühendislik ve uygulama" (entegre üretim, danışmanlık, fonksiyonel); başlık "Üretim kontrolünden teknik danışmanlığa", açıklama orijinal ana sayfa cümlesi | Kumaş fuarındaki gibi **askılı numuneler**: çelik raya kancayla asılı karton başlık (kumaş adı, zımbalı; uydurma ürün kodu yok) ve altında dökümlü, zikzak kesimli kumaş (kamuflaj dimi, ham poplin "5 × 5 cm", ripstop, gabardin, aramid panama, petek); imleç gezdikçe ışık iplikler üstünde kayar, numune kancasından bir kez salınır; **iplik sayma lupu** ×3. Karta tıklayınca pencere: **sahadan fotoğraf** (müşterinin hizmet görsellerinin yazısız kırpımı) + köşeye iliştirilmiş numune + orijinal sitenin tam metni |
| 03 Süreç | Elyaftan sevkiyata 8 istasyon; başlık ve metin orijinal ilke 1 ("Üretim süreçlerinde tam kontrol ve kalite güvencesi") | **2,5B üretim hattı maketi** (three.js, ortografik kamera, gölgeli PBR; Desilla'daki dil). 3. turda istasyon istasyon yeniden kuruldu: pahlı makine gövdeleri, zemine oturan ayaklar (zemin y = 0,11), lacivert üst kapaklar ve önde ince kırmızı şerit (tam kırmızı kapaklar yukarıdan "kırmızı tabla" gibi görünüyordu), kumanda panoları ve ışıklı kuleler. 01 palet üstünde dört yandan çemberli lif balyaları + balya açıcı (kayan çivili besleme bandı, hazne, emme davlumbazı, tarak makinesine kanal) · 02 tarak makinesi (ana tambur kapağı, 14 şapka, kalender) + döner kafalı şerit kovası + ring iplik makinesi (fitil cağlığı, çekim silindirleri, 10 dönen iğ, biri kırmızı) · 03 bobin cağlığı (pimlerde 24 bobin) + delikli kılavuz plakası + tarak + çözgü makinesi (yan ayaklar, yataklı levent) · 04 hava jetli tezgâh (ön yan gövde maket kesiti gibi alçak: ağızlık açılır, dört gücü çerçevesi iki grup hâlinde iner-kalkar, atkı geçer, tarak vurur) · 05 boya teknesi (dalgalanan boya, dalma silindiri) + fular + ramöz (ısı pencereleri, gövdeye bağlı egzoz kanalları, kumanda dolabı) · 06 kesim masası + laboratuvar tezgâhı (çekme cihazı: numune uzar ve kopar; Martindale; monitör) · 07 eğimli ışıklı muayene makinesi (hata işareti kumaşla yükselir) · 08 iki ayaklı top sarma + palete oturan toplar + tır (lastik, jant, kabin camı, ızgara). Kırmızı iplik ring makinesindeki kırmızı masuradan çıkar, makinelere bağlı iplik gözlerinden geçer (serbest direk yok), dokumadan sonra kumaşın kenar ipliğidir. Kamera kaydırmayla hat boyunca kayar (yapışkan sahne, kaydırma kaçırılmaz); dar ekranda hat çapraz iner. Her istasyonun üstünde HTML **kontrol mührü**. WebGL yoksa ya da çizici yazılımsalsa (SwiftShader, llvmpipe, Basic Render) 2B çizim (`surec.mjs`) aynı adım listesine bağlanır. |
| 04 Laboratuvar | Orijinal sitedeki 5 test grubu + kumaş muayenesi; başlık ve metin orijinal ilke 2 ("Laboratuvar testleri ile bilimsel doğrulama") | Ekran iki bölme: solda **2,5B cihaz maketi** (three.js), sağda **canlı veri**. Çekme cihazı (kırmızı travers yükselir, numune boyun verir ve kopar · kuvvet–uzama eğrisi, imleç artısı), Martindale (dört başlık Lissajous yörüngesinde, disklerde tüy topakları birikir · devir sayacı, iz, tüylenme derecesi), ksenon kabini (lamba çevresinde dönen kartların örtülü yarısı korunur, açık yarısı solar · mavi yün 1–8, gri skala), hava geçirgenliği cihazı (kumaş iki halka arasında, hava tanecikleri sıklığa göre geçer, manometre ibresi · kesit + geçirgenlik), dikey yanma kabini (alev, yükselen kömürleşme, duman · hasar boyu cetveli). **T6 · Kumaş muayenesi** (2B, muayene makinesi önden): lacivert 2/1 dimi dokulu kumaş (kırmızı kenar ipliği) ışıklı masada akar, üst silindirden döner; hata (atkı kaçığı, leke, düğüm, delik) muayene çizgisine gelince 4 puan sistemine göre kendiliğinden işaretlenir: halka + kenara yapıştırılan puan etiketi + sağda muayene kaydı, 100 m² başına puan ve puan anahtarı (telefonda sade panel). Sahne boş başlamaz (makine 41 m'dir çalışıyor gibi açılır). 3. turda oyun kaldırıldı; sonra boş başlayan düz dikdörtgen bu sahneyle değiştirildi. Not: "Değerler örnektir; kabul sınırları ürüne ve standarda göre belirlenir." WebGL yoksa 2B çizimler. Laboratuvar fotoğraf bandı kaldırıldı (galeride var); başlık yan düzende (başlık solda, açıklama sağda), fotoğraf kalkınca sağda boş bant kalmasın diye |
| 05 Örgü atölyesi | "İstediğiniz örgüde ve desende kumaşı üretebiliriz": hazır örgü seçilir ya da desen kâğıdına rapor çizilir, tezgâha uygunluğu görülür, rapor teklif talebine eklenir | Desen kâğıdına tıkla/sürükle → kumaş anında dokunur; hazır örgü seçince kumaş tezgâhtaki gibi alttan yukarı **sıra sıra dokunarak** belirir. Analiz: çözgü yüzü, en uzun atlama, rapor, bağlantısız iplik / uzun atlama uyarısı. Tek **teknik pano** "Tezgâh uygunluğu": çizilen örgüden hesaplanan **tahar + armür planı** (aynı kalkan çözgüler aynı çerçeveye) ve gereken gücü çerçevesi sayısı cümlesi (2/1 dimi 3, 2/2 dimi 4; bağlantısız iplik varsa uyarı). Klavyeyle de kullanılır; "Deseninizi anlatın" iletişim formuna götürür (konu "Bilgi edinme", mesaj alanı yol gösteren ipucuyla odakta); rapor mesaja kopyalanmaz — atölye özel desen yapılabildiğini göstermek için, ayrıntı konuşmada netleşir. 3. turda renk seçimi ve atkı kesiti panosu kaldırıldı (bir iddiayı kanıtlamıyordu) |
| 06 Vizyon | "Her iplikte mühendislik, her kumaşta güven, her süreçte sürdürülebilirlik." + vizyon metni + misyon | Masaüstünde solda üç ilke (h2 boyunda) ve altında vizyon metni, sağda iki misyon kartı sütun boyunca (önce 80 px'lik tam genişlik satırların sağı boş kalıyordu); telefonda tek sütun. Üç ilke cetvelli satırlarda; anahtar kelimelerin harfleri **dokunmuş kumaşla dolu** (`background-clip: text`; doku `numune.mjs` ile çizilir: kırmızı-krem dimi, krem-pirinç bezayağı, açık mavi dimi); satırlar görününce atkı gibi soldan sağa geçer. Vizyon metni büyük alıntı; misyon iki maddelik liste olarak yanında. 3. turda "Türkiye → bölge → küresel" ölçek halkaları kaldırıldı (yörünge gibi duruyordu, metni tekrarlıyordu) |
| 07 Galeri | 6 fotoğraf | Editoryal **mozaik** (büyük açılış karesi, dikey, kare ve geniş kareler); DOM sırası = okuma sırası = ışık kutusu sırası; numaralı dokuma etiketler; üzerine gelince hafif yakınlaşma ve büyüt simgesi; ışık kutusu (ok tuşları, dokunmatikte yatay çekiş). Açıklama cümlesi 3. turda kaldırıldı |
| 08 İletişim | Telefon, e-posta, WhatsApp, adres, saatler, İK | "Şu an açığız/kapalıyız" Europe/Istanbul saatine göre hesaplanır; form **karton numune etiketi** biçiminde (uydurma etiket numarası yok), e-posta uygulamasında hazır açılır; gönderilince etikete "Hazır ✓" mührü basılır; e-posta uygulaması yoksa **"Mesajı kopyala"** alıcıyla birlikte metni panoya alır (web postaya yapıştırmak için) |
| Alt bilgi | Logo, menü, iletişim, saatler | Kumaş kenar yazısı (selvedge) gibi akan şerit (üzerine gelince durur); **jakar bandı**: "ANTRA TECH" örgünün kendisiyle dokunur (zemin 2/1 dimi, harfler 5'li saten), lup ile yakından bakılır; "Başa dön" makarası |
| Mobil | — | Kahramandan sonra beliren, iletişim ve alt bilgide çekilen **hızlı erişim çubuğu** (Hemen arayın · WhatsApp), orijinal sitedeki sabit düğmelerin karşılığı. Menü açıkken sayfa kilitlenir, arkası düz bir örtüyle soluklaşır; örtüye dokununca ya da klavye odağı şeridin dışına çıkınca menü kapanır (dil düğmesi kapatmaz) |
| 404 | `404.html` | "İplik koptu": akan, ortasından kopuk kırmızı iplik; ana sayfayla aynı dil kuralı (`?dil` → kayıtlı tercih → tarayıcı dili), dönüş bağlantısı dili taşır |

**Faaliyet haritası (kanaviçe):** kıyılar ve göller gerçek veriden: NASA Visible Earth türevi okyanus maskesi ve arazi normal haritası (three.js örnek dokuları; yerel kopya `sunumatik/presets/earth_advanced/textures`, köken `asset-provenance.json`), `araclar/harita-maske.py` ile 134 × 70 hücrelik ızgaraya (0,33° enlem) örneklenip `sahne/harita-veri.mjs`'e yazıldı (1,9 kB). Her kara hücresi bir çarpı ilmeği: düzlükte keten, eğim arttıkça koyu kahve (Kafkaslar, Toroslar, Tanrı Dağları), kıyıda lacivert; denizlerde teyel. **Ülke sınırları** Natural Earth 1:50m ülkelerinden (kamu malı; `nvkelso/natural-earth-vector` deposundaki `geojson/ne_50m_admin_0_countries.geojson`, 3,0 MB, 10 Ekim'de kullanıcı onayıyla indirildi, yayına girmez): her kara hücresinin merkezi hangi ülke çokgenindeyse o ülke; komşu iki hücre farklı ülkedeyse kenarları kırmızı-kahve gizli dikiş. Türkiye ve beş Türk cumhuriyeti tam tonda, öteki ülkeler soluk iplikle (faaliyet alanı öne çıkar). Kıyı uyuşmazlığından ülkesi bulunamayan 29 kara hücresi sınır üretmez. Üretim: `python -I araclar/harita-maske.py <specular> <normal> <geojson>`; veri dosyası 10,1 kB. Rotalar Çorlu'dan başkentlere dikilerek açılır; her başkent düğümünün yanında kuş uçuşu mesafe (ayrı ülke listesi 3. turda kaldırıldı, düğüm adlarını tekrarlıyordu); sağ altta küçük veri kaynağı satırı (haversine; koordinatlar İngilizce Vikipedi şehir maddelerinden, iki ondalık, 10 Ekim'de okundu). Doğrulayıcı düğümlerdeki her mesafeyi ve haritadaki her düğümü koordinattan yeniden hesaplar, başkentlerin karada ve deniz ortalarının suda olduğunu maskeden sınar (olumsuz denemeyle: 1852 → 1855 km yakalandı). Telefonda harita iki kat genişlikte yatay kaydırılır (odaklanabilir).

## Dil

**TR · EN · RU · DE · AR** (üst şeritte açılır menü: küre + etkin dil kodu; seçenekler dilin kendi adıyla, ≥ 44 px; Esc ve dışarı tıklama
kapatır, oklarla gezilir). Açılış sırası: `?dil=` → kayıtlı seçim (`localStorage`) → tarayıcının dil sırası (`navigator.languages`, ilk
desteklenen) → İngilizce. Türkçe metnin tek kaynağı `index.html`; `ceviri.mjs` yalnız Türkçe JS metinlerini taşır, **EN/RU/DE/AR
`dil/*.mjs`'te** (`SAYFA`: HTML'deki her anahtar, `JS`: JS metinleri) ve **yalnız seçilince indirilir** (açılış JS'i 54 kB; bir dil dosyası
22–38 kB, Kiril/Arapça UTF-8'de iki bayt). Seçeneğin üzerine gelince ya da odaklanınca o dilin dosyası önden iner.
Sayı, yüzde ve büyük harf dilin kuralıyla (`sayi`, `yuzde`, `buyuk`: TR %20 · EN/AR 20% · DE/RU 20 %; Arapçada rakamlar Latin, ölçü
değerleri teknik belgelerdeki gibi). **Arapça sağdan sola** (`dir="rtl"`, baş betiği yönü sayfa görünmeden kurar): künye sola geçer,
harf aralığı ve büyük harf dönüşümü kapanır, büyük başharf kullanılmaz (bitişik yazıyı böler), kod ailesi sans'a döner.
Yerel yazı tipleri yalnız Latin alt kümesi (Kiril 0, Arapça 0 glif; tam sürümleri de öyle): Rusça Georgia/Segoe UI'ye, Arapça
Segoe UI/Tahoma/Geeza Pro/Noto'ya düşer — Kiril ya da Arapça yazı tipi eklemek ayrı bir indirme kararıdır.
**Çeviriler bu site için yapıldı; yayından önce anadili RU, DE ve AR olan birer okur gözden geçirmeli** (teknik terimler: RU уток/основа/
ремиз, DE Schuss/Kette/Schaft, AR اللحمة/السدى/الدرأ). Alt bilgideki kayan kenar yazısı bilinçli olarak Türkçe kalır (marka şeridi).

Hedef dil Türkçe değilse `<head>`'deki küçük betik gövdeyi çeviri uygulanana dek gizler (Türkçe parlaması olmasın); sözlük inmezse
1,5 s'de kendiliğinden açar. Bu betik ile `ceviri.mjs` aynı kaynakları okur ve beş dili tanır (doğrulayıcı sınar); betik değişirse CSP
hash'i de güncellenmeli. Doğrulayıcı her dilde: HTML ve JS anahtar kümesinin tam ve fazlasız olmasını, yer tutucuların ({n}, {s}…)
ve vurgu işaretlerinin ([[…]]) eşleşmesini, boş ya da denetim karakterli değer olmamasını, açıklama ≤ 160 ve başlık ≤ 70'i sınar.

Arama motorları için: botlar (`bot|crawl|spider|slurp` kullanıcı ajanı) tarayıcı diline göre çevrilmez; kanonik `/` her zaman Türkçe
dizine girer. Diğer dillerin adresi `/?dil=en|ru|de|ar`; kanonik bağlantı adrese göre yazılır (`kanonikYaz`), hreflang ve
`sitemap.xml` beş adresi de listeler. 404 sayfası da beş dili tanır. Uçtan uca sınamada Googlebot kimliğiyle adresler denenir;
ayrı senaryo RU/DE/AR'yi menüden seçer (lang, dir, başlık, kanonik, örnek metin, klavye) ve `?dil=ar` açılışında taşma olmadığını ölçer.

## Tasarım sistemi

- **Palet "İndigo ve ham bez":** lacivert `#151b38` (firmanın kendi lacivert numuneleri), ham bez `#f4efe6`, keten `#ebe3d4`,
  tek vurgu iplik kırmızısı `#b8292b` (çekme testindeki kırmızı şerit, kumaş kenar ipliği), süs çizgilerinde pirinç `#b4967b`
  (eski sitenin `--genel` rengi).
- **Yazı:** Fraunces (görüntü; italik dosyası olmadığından vurgu `SOFT`/`WONK` eksenleriyle), Archivo (gövde), JetBrains Mono (kod, ölçü).
  Üçü de SIL OFL 1.1; Latin + Türkçe alt kümesi, kullanılmayan eksenler daraltıldı (Archivo `wdth` = 100 sabit, Fraunces `wght` 280–600):
  `yazitipleri/` toplam 185 kB (önce 350 kB; tam dosyalar `kaynak/yazitipleri-tam/`).
- **Süs deseni tektir:** `--dikis` (kesikli dikiş) jetonu; menü altı, ilerleme çubuğu, bölüm kenarı, vizyon dikişi aynı desendir.
- Punto merdiveni 9 jeton (`--t-1` … `--t-7`, büyük giriş metni `--t-55`, manifesto satırı `--t-65`); jeton dışı punto 6 (denetleyici sayar), düğme stili 2, gölge 2, yarıçap jetonu 4 (`--r-0` 2 px etiketler, `--r-1`, `--r-2`, hap) (`site.css` başı).
- **Üst şerit:** kaydırma ilerlemesi kırmızı bir dikiş çizgisi; ucunda dikişi atan küçük bir iğne yürür. Aşağı kaydırırken şerit çekilir, yukarıda geri gelir.

## Optimizasyon

- Ağır sahneler görüş alanına yaklaşınca **tembel yüklenir**, ekran dışında ve sekme gizliyken **durur**.
- **3B (three.js r184, `vendor/three-r184/`, MIT):** 750 kB ham / 187 kB gzip; yalnız süreç bölümüne 1600 px kala (ya da laboratuvara yaklaşınca) iner, açılışta hiç yüklenmez (doğrulayıcı sınar); yolu sürüm adlı, `Cache-Control: immutable`.
  Yazılımsal çizicide (GPU yok) hiç indirilmez: kahramandaki tezgâhın WebGL bağlamı çizici türünü bir kez not eder (`gpu.mjs`; GPU adı DOM'a yazılmaz), 2B yedek çizilir. `?webgl=1` zorlar, `?webgl=0` kapatır.
  Soğuk açılış ölçümü (gerçek GPU, ANGLE/D3D11): ilk sürümde sahne kurulumu ana iş parçacığını **3,7 s** kilitliyordu; yordamsal ortam haritası (PMREM) tek başına 2,1 s'ydi → kaldırıldı (metaller düşük metallik + üç ışıkla okunuyor), gölgelendiriciler `compileAsync` ile paralel derleniyor (eklenti yoksa eşzamanlı, konsol uyarısı vermeden): şimdi kilit **0,26 s**, ilk kare 0,9 s.
  Durağan parçaların matrisleri dondurulur, tekrarlı parçalar örneklemeli; kamera dururken 30 kare/sn. Laboratuvar beş cihazın gölgelendiricisini birlikte ısıtır (sekme değişince takılmasın).
- **Kumaş çizici:** periyodik kumaş (dimi 3×3, bezayağı 2×2, panama 4×4, petek 10×10, ripstop 18×18) bir rapor çizilip desen olarak döşenir; altı kartlık kartela 498 → 77 ms (kamuflaj gibi periyodik olmayan eski yoldan).
- Dokuma tezgâhı tek tam ekran üçgen + tek parça gölgelendirici; kare süresi uzarsa **piksel yoğunluğu kademeli düşer** (1,5 → 0,75).
- Süreç tuvali: piksel yoğunluğu ≤ 1,5; kamera dururken her ikinci karede (60 Hz ekranda 30 kare/sn), kaydırırken her kare. Ölçüm (`?olc=1`, GPU'suz başsız Chrome, 1440 × 900): JS tarafı kare başına < 1,5 ms; maliyetin geri kalanı rasterleştirme.
- Gerçek GPU ölçümü (başsız Chrome + ANGLE/D3D11, GTX 1660 Ti, 1440 × 900): kahraman ve süreç hattı 144 kare/sn (ölçüm sınırı), en uzun kare 7,6 ms.
  Zayıf cihaz taklidi (CPU 6× yavaş, 390 × 844): kahraman 38, süreç 50, laboratuvar 33, atölye 62 kare/sn. Süreç adımlarına CSS değişkeni yalnız
  değer değişince yazılır (önce her karede yazılıyordu: 21 kare/sn). Araç: `CEKIM_GPU=1 CEKIM_CPU=6 node araclar/cekim.mjs …`.
- Açılış (yerel, gzip'li sunucu, başsız Chrome + GPU, 1440 × 900): 14 istek, aktarılan 323 kB (182 kB'ı yazı tipi); LCP öğesi kahraman
  başlığı, 0,96–1,16 s (aynı ortamda neredeyse boş 404 sayfasının FCP'si 0,45–0,6 s). Başlık satırları açılışta yalnız `transform`
  ile gelir; opaklık animasyonu LCP'yi 1,5 s'ye erteliyordu.
  Yeniden ölçüm (10 Ekim 07:15, önbellek kapalı, 3 tur, `largest-contentful-paint` gözlemcisi): masaüstü LCP 640 / 212 / 288 ms,
  telefon (390 × 844) 620 / 336 / 212 ms; LCP öğesi kahraman başlık satırı; aktarılan 326 kB masaüstü, 276 kB telefon (13–14 istek).
  Son ölçüm (09:05, aynı yöntem, iki seri): soğuk ilk açılış 0,72–1,05 s, ısınmış 0,15–0,57 s; aktarılan 327–328 kB masaüstü, 277–278 kB telefon.
  Seriler arası fark büyük (aynı kodda 212 ile 1052 ms): tek bir rakam değil aralık okunmalı.
- Yavaş 3G (400 ms gecikme, ~400 kbit/s, gzip'li sunucu, 390 × 844): ilk boyama 2,7 s; kahraman modülü 3,6 s'de iner (önce 7,2 s:
  tezgâh desen maskesi için Fraunces'i bekliyordu; artık en çok 600 ms bekler, yazı tipi sonra gelirse maske yeniden basılır).
  Kritik CSS ayırmaya gerek görülmedi: `site.css` sıkıştırılmış ≈ 15 kB, 1,9 s'de iniyor. Önyükleme yalnız Archivo'ya; CSS `fetchpriority="high"`.
  Araç: `CEKIM_AG=3g node araclar/cekim.mjs …`. Geliştirme sunucusu metin dosyalarını gzip'ler (yayında Vercel brotli kullanır).
- Yerleşim kayması (yükleme + sayfanın sonuna kadar kaydırma, tarayıcının `layout-shift` ölçümü): CLS masaüstü 0,0036, tablet 0,0010, telefon 0,0002 (09:05 yeniden: masaüstü 0,0010, telefon 0,0001)
  ("iyi" eşiği 0,1). Bütün görsellerde boyut, tuvallerde en-boy oranı tanımlı; tembel sahneler yer tutucusunun içine çizilir.
- Bellek: her canlı sahnede (kahraman, süreç, laboratuvar T4, muayene) 40 s bekleme sonrası, zorlanmış çöp toplamayla JS yığını en çok
  0,1 MB değişiyor (0,9–1,7 MB); dizi büyüklükleri sınırlı (iz 900, tanecik 500, ekran dışına çıkan hatalar silinir).
- Numune lupu büyük doku tutmaz: imlecin altındaki 42 × 42 px bölge ×3 ölçekte yeniden çizilir.
- Görseller duyarlı WebP (`srcset`/`sizes`, tembel yükleme): orijinal JPEG'ler toplam 3,2 MB; sayfadaki görseller 960 px sürümleriyle toplam ≈ 0,37 MB (dar ekranda 480 px sürümleri yüklenir).
- `prefers-reduced-motion` (ya da `?az=1`): bütün sahneler durağan son kareyi çizer; imleç ışığı yalnız kullanıcı hareketiyle.
- JavaScript kapalıyken canlı yüzeyler gizlenir, metin akışı (süreç adımları dahil) eksiksiz okunur; üst şerit koyu zemine geçer; form `mailto:` eylemiyle e-posta uygulamasını açar (önce eylemsiz form alanları adres çubuğuna yazıyordu; CSP `form-action 'self' mailto:`).
- Yazdırma: canlı yüzeyler (jakar bandı dahil), düğmeler ve atölye gizlenir; metin siyah, zeminler beyaz, krem logo koyulaşır, harita bağlantısının uzun adresi basılmaz (`CEKIM_YAZDIR=1` ile sınandı).
- Windows yüksek karşıtlık (`forced-colors`): düğme ve çip çerçeveleri sistem renkleriyle görünür kalır.
- Önyükleme yalnız Archivo yazı tipine; `modulepreload` bilinçli olarak yok (yavaş 3G ölçümünde CSS ile bant genişliği için yarışıyordu).
- Kontrast: metin/zemin çiftlerinin hepsi WCAG AA (≥ 4,5:1) — en düşük `#e2585a` / lacivert 4,64.
- Odak halkası açık zeminde kırmızı (5,41:1), koyu zeminde krem (14,58:1); kırmızı lacivert üstünde 2,72:1 kaldığı için orada kullanılmaz (kırmızı "İçeriğe geç" düğmesi ve muayene tuvali de krem halka alır; tuvalde halka içe çizilir, çünkü kap `overflow: hidden`).
- Klavye: "İçeriğe geç" sabit konumlu (sayfanın neresinde olursa olsun odakta görünür); aşağı kaydırırken çekilen üst şerit, odak içine girince geri gelir; telefondaki hızlı erişim çubuğu yalnız dokunmatik kısayol olduğundan odak sırasında değildir (aynı bağlantılar İletişim ve alt bilgide). Sıra: atlama bağlantısı → logo → menü → dil → kahraman düğmeleri; süreç adımlarının her biri düğme (Enter o istasyona götürür); laboratuvar sekmeleri ok/Home/End, hizmet penceresi ←/→ ve Esc, ışık kutusu ←/→, desen kâğıdı ok + Boşluk/Enter.

## Eski adresler ve derin bağlantı

Hizmet pencereleri adreste görünür (`/#hizmet-savunma`, `#hizmet-entegre`, `#hizmet-laboratuvar`, `#hizmet-kontrol`,
`#hizmet-danismanlik`, `#hizmet-fonksiyonel`) ve bu adresle doğrudan açılır; kapanınca adres `#hizmetler` olur (geçmişe kayıt eklenmez).
Mevcut sitenin adresleri (`/hizmetdetay/…`, `/hizmetler`, `/sayfa/hakkimizda|vizyonumuz|misyonumuz`, `/galeri`, `/iletisim`,
`/insankaynaklari`, `/index.php`) `vercel.json` → `redirects` ile yeni bölümlere **kalıcı (308)** yönlenir; doğrulayıcı her hedefin sayfada
var olduğunu sınar.

## Güvenlik başlıkları

`vercel.json` bütün yollara CSP (`script-src 'self'` + satır içi betiklerin sha256 hash'leri; `object-src 'none'`, `frame-ancestors 'none'`),
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` ve `Permissions-Policy` ekler. Geliştirme sunucusu
(`.claude/sunucu.py`) aynı başlıkları gönderir ve bilinmeyen yolda `404.html` sunar; CSP yerelde de sınanır.
**Satır içi bir betiği değiştirirseniz hash'i de güncelleyin** — `node araclar/dogrula.mjs` uyuşmazlığı yakalar. 404 betiği CRLF'ye
dönüşebileceği için iki satır sonu biçiminin hash'i de listededir.

## Terim birliği

Örgü adları her yerde rakam önde ve aynı: **2/1 dimi, 2/2 dimi, 5'li saten, 2/2 panama, bezayağı** (künye, atölye, numune kartı).
"Atlama" yalnız iplik atlaması (float) anlamında; künyedeki desen kaydırması "yarım kaydırma" (half-drop). Rapor ölçüsü "tel × atkı".
İngilizce metinler İngiliz yazımıyla (colour, fibre, defence, analyse). Orijinal sitedeki kıvrık kesme (Türkiye’den) korunur.

## Müşteriyle teyit edilecekler

- Cumartesi saatleri (09:30–22:00) hafta içinden uzun; orijinal siteden alındı. Canlı "açık/kapalı" ve JSON-LD buna dayanıyor. Saat değişirse dört yer güncellenmeli (`sahne/saatler.mjs`, JSON-LD, iletişim ve alt bilgi tabloları); doğrulayıcı dördünün eşitliğini sınar, Türkçe ek (’de/’te) kendiliğinden uyar.
- Galeri, sayfada başka yerde de kullanılan iki fotoğrafı içeriyor (kartela: Kurumsal; çekme testi: Laboratuvar). Orijinal sitede yalnız 6 kare var;
  yeni fotoğraf gelirse değiştirilmeli.
  Ayrıca "Numune etiketi" ve "Numuneler" kareleri aynı sahnenin (aynı numune ve plastik bağ) iki farklı çekimi; ikisi de firmanın görsellerinden,
  ama orijinal galeride ikisinin ayrı ayrı yer aldığı doğrulanmadı. Farklı bir kare gelirse biri değiştirilmeli.
- "Müşteri Destek" etiketi orijinal sitedeki biçimiyle bırakıldı.
- İngilizce sürüm aynı dosyada `?dil=en` ile çalışıyor; durağan HTML'deki kanonik `/` olduğu için `?dil=en`'in kanoniği JS ile düzeltiliyor.
  İngilizce aramada iddialı olunacaksa ayrı bir `/en/` sayfası (sunucuda üretilmiş İngilizce HTML) daha sağlam olur.

## İçerik kaynağı

Metinler, logo ve fotoğraflar 10 Ekim 2026'da https://www.antratech.net/ sitesinin **Türkçe** sürümünden (ana sayfa, Hakkımızda,
Vizyon, Misyon, altı hizmet sayfası, İletişim, İnsan Kaynakları) alındı; değiştirilmedi. Orijinal görseller `kaynak/orijinal-gorseller/`.

**Sınanan sadakat:** kaydedilmiş orijinal sayfalar `kaynak/orijinal-sayfalar/` altında (yayına girmez). `araclar/orijinal.mjs` içerik
bölgelerini cümlelere böler; doğrulayıcı her cümlenin sayfada birebir geçtiğini sınar (52 cümle). Karşılaştırmada yalnız tırnaklar,
kaynaktaki "yaklaşımı ," yazım hatası ve vizyon alıntısının sonundaki "…" normalleştirilir. Bilinçli olarak alınmayan iki ana sayfa
cümlesi gerekçesiyle `ISTISNA` listesindedir. Keşif: `node araclar/orijinal.mjs`.
Hizmet sayfalarındaki görsellerin sol yarısına yazı basılı; kartlarda yordamsal kumaş numuneleri kullanıldı, hizmet penceresinde ise beş görselin **yazısız sağ kırpımı** "sahadan" fotoğrafı olarak kullanılıyor (`gorseller/boyut/hizmet-*.webp`, 480/800 px; kırpım sınırları gözle kontrol edildi, fonksiyonel tekstil görseli baştan sona yazılı olduğu için kullanılmadı).

**Bu sitede yeni yazılan (müşteri onayı gerekir) metinler:**

- Süreç istasyonlarının 8 kısa açıklaması (`adim1Metin` … `adim8Metin`) — sektörün genel süreci; Antra Tech'in tek tek her aşamada
  ne yaptığı iddia edilmez, orijinal sitedeki "hammadde girişinden sevkiyata kontrol" ifadesine dayanır.
- Laboratuvar "Ölçülen" listeleri (test başına 4 büyüklük): yöntem tanımlarından türetilmiş genel büyüklüklerdir, değer içermez.
- Kumaş muayenesi: puan eşikleri 3″/6″/9″ eşiklerinin metrik karşılığıdır; eşikler ve metrik formül ikincil kaynaklardan doğrulandı (V-Trust, Eurofins, onlineclothingstudy), standardın kendi metni okunmadı. Sayfada standart numarası verilmez; kabul sınırının alıcıyla belirlendiği yazılıdır.
- Laboratuvar testlerinin yöntem açıklamaları ve canlandırmalardaki örnek değerler (sayfada "temsilîdir" notuyla). Standart numarası yazılmadı.
- **Faaliyet coğrafyası haritası**: orijinal metindeki "Türkiye ve Türki Cumhuriyetler" ifadesinin yorumu; beş Türk cumhuriyeti (Azerbaycan, Kazakistan, Kırgızistan, Özbekistan, Türkmenistan) başkentlerine Çorlu'dan rotalar ve kuş uçuşu mesafeler. Başkent koordinatları İngilizce Vikipedi'den alındı (önceki yaygın değerlerden en çok ~5 km farklıydı). Firmanın bu ülkelerin her birinde iş yaptığı ayrıca doğrulanmadı; müşteri onaylamalı ya da listeyi daraltmalı.
- Kurum armaları (dağ, dalga, kanat, kalkan, başak) temsilî işlemedir; kurumların resmî amblemleri değildir ve onları taklit etmez.
- Bölüm başlıkları "Üretim kontrolünden teknik danışmanlığa" (Hizmetler) ve "İstediğiniz örgüde ve desende kumaşı üretebiliriz" (Atölye). Süreç ve Laboratuvar başlıkları 3. turda orijinal ilke 1 ve ilke 2 metinlerine döndü; uydurma sloganlar kaldırıldı.
- Hizmet grup adları ve açıklamaları, numune adları (kamuflaj dimi, gabardin…), örgü atölyesi metinleri, form ve durum metinleri.
- Bütün İngilizce metinler: orijinal sitenin İngilizce sürümü şablon dolgu metni içeriyor ("Book Taxi…"), kullanılamadı.

Alan adı **https://www.antratech.net/** varsayılır (mevcut sitenin adresi): `index.html` (`canonical`, `hreflang`, `og:url`, `og:image`, JSON-LD), `ceviri.mjs` (`kanonikYaz`), `robots.txt`, `sitemap.xml`. Farklı bir adrese yayımlanacaksa hepsi güncellenmeli (`grep -r www.antratech.net` bulur).

`og:image` (1200 × 630, menüsüz ve düğmesiz kahraman kompozisyonu), `og:url` ve JSON-LD görseli mutlak adreslidir; paylaşım önizlemeleri göreli yolu çözmez (doğrulayıcı sınar).

Orijinal sitedeki sosyal medya bağlantıları yalnız platform ana sayfalarına (`https://instagram.com` vb.) gittiği için eklenmedi.
Orijinal iletişim sayfasındaki harita, İstanbul'un genel konumunu gösterdiği için kullanılmadı; yerine adresle Google Haritalar araması açan "yol tarifi" bağlantısı kondu.

## Dosyalar

```
index.html            sayfa (Türkçe metnin tek kaynağı)
site.css              tasarım sistemi + bütün bölümler
site.mjs              sayfa denetleyicisi (tembel yükleme, menü, pencereler, form)
ceviri.mjs            EN sözlüğü + yalnız JS'in kullandığı TR/EN metinler; TR, HTML'den okunur
sahne/dokuma.mjs      kahraman: WebGL dokuma tezgâhı (örgü raporu + tezgâh çevrimi saf fonksiyonlar)
sahne/surec3b.mjs     süreç: 2,5B üretim hattı maketi (three.js)
sahne/surec.mjs       süreç: 2B yedek (WebGL yoksa / yazılımsal çizici)
sahne/surec-ortak.mjs süreç: saf fonksiyonlar + adım listesi/sayaç bağlama (iki sahne ortak)
sahne/lab3b.mjs       laboratuvar: 5 cihaz maketi (three.js) + canlı veri paneli
sahne/uc-ortak.mjs    3B ortak: three.js kapısı, dokular, ışık, malzeme, kaide, derleme
sahne/gpu.mjs         donanım WebGL var mı (three.js indirilmeden önce)
sahne/harita.mjs      kanaviçe harita çizimi + vurgu etkileşimi (izdüşüm, haversine saf)
sahne/harita-veri.mjs kara/su + eğim ızgarası (ÜRETİLMİŞ: araclar/harita-maske.py)
sahne/hizmet.mjs      hizmet penceresi (ilk ihtiyaçta iner; derin bağlantı)
sahne/vizyon.mjs      vizyon: harfleri dolduran dokunmuş kumaş dokusu
vendor/three-r184/    three.js r184 (MIT; dosya başında lisans)
sahne/numune.mjs      kumaş numuneleri, iplik gölge kalıpları, lup, zikzak kenar
sahne/laboratuvar.mjs laboratuvar denetimi (sekmeler, ölçüm satırı) + 2B test çizimleri (yedek) + muayene sekmesi
sahne/muayene.mjs     kumaş muayenesi (4 puan sistemi, saf puan/oranlama fonksiyonları)
sahne/atolye.mjs      örgü atölyesi + örgü analizi
sahne/jakar.mjs       alt bilgideki dokunmuş "ANTRA TECH" bandı
sahne/saatler.mjs     çalışma saatleri, İstanbul saatiyle açık/kapalı, Türkçe saat eki (20:00’ye, 15:00’te)
araclar/dogrula.mjs   sayısal sınamalar + çeviri/sayfa bütünlüğü
araclar/orijinal.mjs   orijinal sayfalardan cümle çıkarma (sadakat sınaması için)
araclar/uctan-uca.mjs başsız Chrome'da 20 etkileşim senaryosu
araclar/harita-maske.py harita ızgarası üreteci (NASA maskesi → sahne/harita-veri.mjs)
araclar/erisilebilirlik.mjs axe-core denetimi (ihlal varsa çıkış kodu 1)
araclar/cekim.mjs     başsız Chrome ile ekran görüntüsü (geliştirme aracı; CEKIM_JS=0 → JS kapalı)
404.html              bulunamadı sayfası
```

## Doğrulama

```bash
node araclar/dogrula.mjs
```

Sınananlar (güncel sayıyı komut basar): örgü raporları (dimi 2/1 oranı, 5'li satenin satır/sütun başına tek bağlantısı ve bitişiksizliği, numune örgüleri),
tezgâh çevrimi (kumaş geri gitmez, çevrim sınırında zıplamaz), kahraman künyesindeki rapor ve tezgâh hızının koddaki değerlerle eşleşmesi,
kamera/ilerleme eşlemesi, çekme eğrisi, geçirgenlik (boşluk³) ve solma modelleri, örgü atölyesi analizi (çözgü yüzü, döngüsel atlama,
bağlantısız iplik, rapor), çalışma saatleri (İstanbul saat dilimi, gün dönümleri), çeviri bütünlüğü (HTML'deki her anahtarın İngilizcesi,
yer tutucular, JS'in kullandığı anahtarlar), yerel dosya başvuruları, `img` boyut/alt öznitelikleri, tekil id'ler, çapa hedefleri,
statik erişilebilirlik (her düğmenin erişilebilir adı — aria-hidden metin sayılmaz, img alt sayılır —, her alanın etiketi, tek h1, başlık düzeyi atlamaması, tuvallerin metin karşılığı), orijinal metne birebir sadakat, eski site yönlendirmelerinin hedefleri, CSP'deki satır içi betik hash'leri, açılış (≤ 72 kB) ve tembel (≤ 240 kB; 3B, harita, sınır verisi ve 3. turdaki istasyon detayları eklenince 110'dan kademeli yükseltildi, her adımın gerekçesi dosyada) JS bütçesi, three.js'in yerinde olduğu ve yalnız `uc-ortak.mjs` üzerinden yüklendiği (açılış modülleri içe aktarmaz), her sahne modülünün gerçekten içe aktarıldığı, CSS bütçesi (gzip ≤ 20 kB), hizmet fotoğraflarının iki boyda var olduğu ve TR/EN alt metinleri, `:has()` kurallarının seçici listesi taşımaması, ARIA/`for` başvurularının hedefi, mutlak `og:image`/`og:url`/JSON-LD görseli, çalışma saatlerinin dört kaynakta (saatler.mjs, JSON-LD, iki tablo) ve telefonun her biçimde aynı olması, Türkçe saat eki ve botlar için dil kuralının baş betiğiyle eşzamanı.

Ayrıca her HTML yazımında `ux-yasalari` denetleyicisi koşar (son durum: 0 HATA, 9 gerekçeli UYARI — teslim tablosunda).

Tarayıcıda gerçek etkileşim (sunucu açıkken):

```bash
node araclar/uctan-uca.mjs
```

20 senaryo, her biri temiz sekmede (senaryo bitince sekme kapanır; önceden yalnız soket kapanıyor, sayfalar arka planda çalışmayı sürdürüyordu); konsol hatası da düşüş sayılır: yatay taşma (320–1440 px arası 9 genişlik × TR/EN), galeri mozaiği (360–1440 px × TR/EN: kareler binmez, etiket karenin içinde ve kesilmez, kare ≥ 128 px, Tab sırası okuma sırası), 3B (yazılımsal GPU'da `?webgl=1` ile zorlanır: süreç ve laboratuvar 3B tuvalleri çizilir, 8 mühür yazılı, T1–T5 ölçüm satırı güncellenir, muayene tek bölmeye döner), kontrast (üç kaydırma konumunda görünür her metin WCAG AA, hesaplanan renklerle; 3B sahnelerin HTML mühürleri dahil), form (boş/hatalı/geçerli gönderim, mühür, "Mesajı kopyala" panoya alıcı + metin yazar), dil geçişi (metin,
başlık, adres, künye; JS'in yazdığı muayene tuvali etiketi, form mesajı ve Türkçe saat eki de yenilenir), Türkçe parlaması yok (İngilizce tarayıcıda her karede görünen başlık kaydedilir), derin bağlantı (`#hizmet-kontrol` → ok tuşu → Esc → `#hizmetler`), pencere erişimi (390×844, 360×640, 1440×700: uzun metin kayar, eylem düğmesi ekrana gelir), sabit yüzeyler (yatay telefonda menünün ve ışık kutusunun son öğesi ulaşılabilir), klavye gezintisi (masaüstü ve telefonda tam Tab turunda her odak ekranda ve görünür), tuvaller (6 2B sahnenin pikselleri okunur: normal ve azaltılmış harekette, iki boyutta boş değil ve görünür olduktan sonra en geç 2,5 s içinde çizilmiş; çizim anı 2B bağlamın çizim çağrılarına takılan kancayla ölçülür — önceki her 200 ms piksel okuması yazılımsal GPU'da tek başına 1–4,8 s sürüp ölçümü şişiriyordu, olumsuz denemeyle 3 s geciktirilmiş çizim yakalanıyor), laboratuvar sekmeleri (ok/End, ölçülen
listesi), muayene (hata muayene çizgisine gelince kendiliğinden puanlanır: en az 2 işaret, çizginin üstünde işaretsiz hata yok, ölçüm satırı "n hata · p puan", tuval odak almaz), atölye (saten analizi, İngilizcede yüzde işaretinin sayıdan sonra gelmesi, danış düğmesinin raporu bir kez eklemesi, telefonda yatay sürüklemeyle boyama; kâğıtta başlayan dikey kaydırma sayfayı kaydırır ve kare değiştirmez; tek dokunuş tek kare),
mobil (menü + Esc, örtüye dokununca kapanma ve sayfa kilidi, hızlı erişim çubuğu), süreç adım düğmeleri (klavye + Enter → istasyon), kahraman (künyeden örgü değişimi, tıklama dalgası; künye 1110–1920 px TR/EN başlıkla çakışmaz; dizüstü iç yüksekliklerinde — 1280×580, 1366×657, 1536×730, 1024×640 — düğmeler ilk ekranda). `CEKIM_GPU=1` gerçek GPU ile koşar; `SENARYO=tuval` yalnız adında "tuval" geçen senaryoları koşar.

Erişilebilirlik (axe-core 4.12.1): `node araclar/erisilebilirlik.mjs 1440x900 [adres]` — 10 Ekim'de 1440 × 900 TR, 390 × 844, 1280 × 800 EN,
404 ve açık hizmet penceresinde **0 ihlal**. "Belirsiz" kalan kontrast notları zemini tuval/görsel olan metinlerdir; onları uçtan uca
kontrast senaryosu hesaplanmış renklerle ölçer.

Ekran görüntüsü: `node araclar/cekim.mjs http://127.0.0.1:4180/ <klasör> 1440 900 "#hizmetler" p=surec:0.5` (`by=900` göreli kaydırır). Araç varsayılan olarak yazılımsal GPU kullanır; 3B sahneleri görmek için `CEKIM_GPU=1` ya da adrese `?webgl=1`. 2560 × 1440 gibi çok büyük pencerede başsız Chrome WebGL'li kahramanla ekran görüntüsü alırken takılıyor (sayfa o boyutta GPU'da 140 kare/sn çiziyor; sorun aracın): orada `?webgl=0` ekleyin.

### Ölü alan

`node araclar/olu-alan.mjs` — her bölümde metnin gerçek satır kutuları (Range) ve görseller sol/sağ yarıya ayrılır; bir yarı doluyken öbürünün boş kaldığı dikey bant 220 px'i aşarsa düşer (1440 ve 1024 px; kahraman hariç: zemini dokuma tuvali). Olumsuz denemeyle doğrulandı: eski yığılmış laboratuvar başlığı 336 px yakalanıyor. Son koşu: en uzun 128 px (vizyon).

## Bilinen sınırlar

- Sunucu tarafı yok: iletişim formu mesajı e-posta uygulamasında açar (`mailto:info@antratech.net`); İK başvurusu da e-postayladır
  (orijinal sitedeki T.C. kimlik numarası ve CV yükleme alanı sunucusuz güvenle karşılanamayacağı için kaldırıldı).
- Dil seçenekleri TR ve EN; orijinal sitedeki Rusça, Arapça ve Almanca için kaynak metin yok.
- Zamanlama sınaması (tuvaller ≤ 2,5 s) yazılımsal GPU'da makinenin yüküne duyarlı: 10 Ekim öğleden sonra başka uygulamalar işlemciyi %57–72 meşgul ederken numune tuvali 2,6–5,2 s arasında oynadı; aynı senaryo gerçek GPU'da (`CEKIM_GPU=1`) üst üste geçti. Belirleyici ölçüm GPU koşusudur.
- Bütün otomatik sınamalar ve ekran görüntüleri Chromium (Chrome) üzerinde; bu makinede Firefox ve Safari/WebKit yok, o motorlarda **sınanmadı**.
  Kullanılan yeni CSS özellikleri: `:has()` (Firefox 121+, Safari 15.4+; yalnız iki süs kuralında, desteklemeyen tarayıcıda o süs düşer), `svh` (kısa ekran kuralı `@supports` içinde),
  `text-wrap`. Yayından önce bir iPhone Safari ve bir Firefox'ta elle bakılmalı.
- 2B tuvaller piksel yoğunluğunu her yeniden boyutlandırmada okur (tarayıcı yakınlaştırması kapsanır; gerçek yakınlaştırmayla sınanmadı).
  Pencere boyutu değişmeden farklı yoğunluklu bir monitöre taşınırsa tuvaller bir sonraki boyut değişimine kadar eski yoğunlukta kalır.
